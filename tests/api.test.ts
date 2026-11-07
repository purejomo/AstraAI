import { beforeEach, describe, expect, it } from "vitest";
import { handle } from "../src/lib/api";
import { emptyState, type Storage } from "../src/lib/storage";
import type { Bootstrap, RunView, State } from "../src/lib/types";
import sample from "../examples/sample-study-pack.json";
class MemoryStorage implements Storage {
  state = emptyState();
  async transaction<T>(fn: (s: State) => T | Promise<T>): Promise<T> {
    const copy = structuredClone(this.state);
    const result = await fn(copy);
    this.state = copy;
    return result;
  }
}
let db: MemoryStorage;
const now = new Date("2026-11-07T01:00:00Z");
function client() {
  let cookie = "";
  return async (route: string, input?: unknown, clock = now) => {
    const result = await handle(
      new Request(`http://localhost:3000/api/${route}`, {
        method: input === undefined ? "GET" : "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
          cookie,
        },
        ...(input === undefined ? {} : { body: JSON.stringify(input) }),
      }),
      db,
      clock,
    );
    if (result.headers.get("set-cookie"))
      cookie = result.headers.get("set-cookie")!.split(";")[0];
    return { status: result.status, data: await result.json() };
  };
}
async function setup() {
  const admin = client();
  const one = client();
  const two = client();
  await admin("session", { profileId: "admin" });
  await one("session", { profileId: "learner-1" });
  await two("session", { profileId: "learner-2" });
  const imported = await admin("admin/import", { raw: JSON.stringify(sample) });
  return {
    admin,
    one,
    two,
    ...(imported.data as { packId: string; revisionId: string }),
  };
}
async function published() {
  const setupResult = await setup();
  await setupResult.admin("admin/publish", {
    packId: setupResult.packId,
    revisionId: setupResult.revisionId,
    access: ["learner-1", "learner-2"],
  });
  return setupResult;
}
beforeEach(() => {
  db = new MemoryStorage();
});
describe("API authorization, publication and grading", () => {
  it("requires a session for protected routes and rejects unknown identities", async () => {
    const guest = client();
    expect((await guest("admin/sample")).status).toBe(401);
    expect((await guest("runs", {})).status).toBe(401);
    expect((await guest("session", { profileId: "imposter" })).status).toBe(
      400,
    );
    expect((await guest("bootstrap")).data.packs).toEqual([]);
  });
  it("rejects non-local hosts and cross-origin mutations", async () => {
    for (const [url, origin] of [
      ["http://public.example/api/session", "http://public.example"],
      ["http://localhost:3000/api/session", "https://evil.example"],
    ]) {
      const result = await handle(
        new Request(url, {
          method: "POST",
          headers: { origin, "content-type": "application/json" },
          body: "{}",
        }),
        db,
      );
      expect(result.status).toBe(403);
    }
  });
  it("denies learner admin endpoints even with forged role/user ID", async () => {
    const { one } = await setup();
    expect(
      (
        await one("admin/import", {
          raw: JSON.stringify(sample),
          role: "admin",
          userId: "admin",
        })
      ).status,
    ).toBe(403);
    expect((await one("admin/sample")).status).toBe(403);
  });
  it("keeps drafts private and only shares with selected learners", async () => {
    const { admin, one, two, packId, revisionId } = await setup();
    expect((await one("bootstrap")).data.packs).toHaveLength(0);
    await admin("admin/publish", { packId, revisionId, access: ["learner-1"] });
    expect((await one("bootstrap")).data.packs).toHaveLength(1);
    expect((await two("runs", { packId, mode: "quiz" })).status).toBe(404);
    await admin("admin/publish", { packId, revisionId: null });
    expect((await one("bootstrap")).data.packs).toHaveLength(0);
  });
  it("does not expose answers before submission and grades on server with an idempotent submit", async () => {
    const { one, two, packId } = await published();
    const response = await one("runs", {
      packId,
      mode: "quiz",
      count: 1,
      userId: "learner-2",
    });
    const run = response.data as RunView;
    expect(response.status).toBe(201);
    expect(JSON.stringify(run)).not.toContain("answer_index");
    expect(JSON.stringify(run)).not.toContain("wrong_feedback");
    expect(JSON.stringify(run)).not.toContain("explanation");
    expect(run.grades).toBeNull();
    expect((await two(`runs/${run.id}`)).status).toBe(404);
    const graded = await one(`runs/${run.id}`, {
      answers: { q_os_1: 1 },
      answer_index: 1,
      userId: "learner-2",
    });
    expect(graded.data.grades[0]).toMatchObject({
      correct: false,
      answer: 0,
      selected: 1,
    });
    const again = await one(`runs/${run.id}`, { answers: { q_os_1: 0 } });
    expect(again.data.grades[0].correct).toBe(false);
    const data = (await one("bootstrap")).data as Bootstrap;
    expect(data.summary).toMatchObject({
      answered: 1,
      correct: 0,
      sessions: 1,
    });
    expect(data.reviews[0].due).toBe("2026-11-08");
    expect((await two("bootstrap")).data.summary.answered).toBe(0);
  });
  it("rejects empty answers, foreign questions, and invalid choices without writing grades", async () => {
    const { one, packId } = await published();
    const run = (await one("runs", { packId, mode: "quiz" })).data;
    for (const answers of [
      {},
      { other: 0 },
      { q_os_1: 4 },
      { q_os_1: -1 },
      { q_os_1: "0" },
    ])
      expect((await one(`runs/${run.id}`, { answers })).status).toBe(400);
    expect((await one(`runs/${run.id}`)).data.grades).toBeNull();
  });
  it("preserves old revision answers and review records across publication", async () => {
    const { admin, one, packId, revisionId } = await published();
    const run = (await one("runs", { packId, mode: "quiz" })).data;
    const v2 = structuredClone(sample);
    v2.questions[0].answer_index = 2;
    v2.questions[0].explanation = "새 해설";
    const imported = (
      await admin("admin/import", { packId, raw: JSON.stringify(v2) })
    ).data;
    await admin("admin/publish", {
      packId,
      revisionId: imported.revisionId,
      access: ["learner-1"],
    });
    const graded = await one(`runs/${run.id}`, { answers: { q_os_1: 0 } });
    expect(graded.data.grades[0].correct).toBe(true);
    expect(graded.data.grades[0].explanation).toBe(
      sample.questions[0].explanation,
    );
    const review = (
      await one("runs", {
        packId,
        mode: "review",
        reviewId: "q_os_1",
        revisionId,
      })
    ).data;
    expect(review.version).toBe(1);
    expect(
      (await one(`runs/${review.id}`, { answers: { q_os_1: 0 } })).data
        .grades[0].correct,
    ).toBe(true);
    expect(db.state.packs[0].revisions).toHaveLength(2);
  });
  it("grades unanswered exams as wrong and enforces deadline", async () => {
    const { one, packId } = await published();
    const run = (await one("runs", { packId, mode: "exam", minutes: 1 })).data;
    const result = await one(
      `runs/${run.id}`,
      { answers: { q_os_1: 0 } },
      new Date(now.getTime() + 66000),
    );
    expect(result.data.grades[0]).toMatchObject({
      selected: null,
      correct: false,
    });
    const second = (await one("runs", { packId, mode: "exam", minutes: 1 }))
      .data;
    expect(
      (await one(`runs/${second.id}`, { answers: {} })).data.grades[0].selected,
    ).toBeNull();
  });
  it("stores per-user goals, study progress and flashcard review", async () => {
    const { one, two, packId } = await published();
    expect(
      (await one("goals", { packId, examDate: "2026-11-15", dailyMinutes: 20 }))
        .status,
    ).toBe(200);
    expect(
      (await one("goals", { packId, examDate: "2026-02-30", dailyMinutes: 20 }))
        .status,
    ).toBe(400);
    expect((await one("study", { packId, conceptId: "c_os" })).status).toBe(
      200,
    );
    await one("flashcards", { packId, cardId: "f_os_1", remembered: true });
    const data = (await one("bootstrap")).data;
    expect(data.packs[0].studied).toEqual(["c_os"]);
    expect(data.packs[0].goal.dailyMinutes).toBe(20);
    expect(data.reviews[0]).toMatchObject({
      kind: "flashcard",
      due: "2026-11-10",
    });
    expect((await two("bootstrap")).data.reviews).toEqual([]);
    expect((await two("bootstrap")).data.packs[0].studied).toEqual([]);
  });
  it("requires confirmation for reset and retains other user data and packs", async () => {
    const { one, two, packId } = await published();
    await one("goals", { packId, examDate: "", dailyMinutes: 20 });
    await two("goals", { packId, examDate: "", dailyMinutes: 30 });
    expect((await one("reset", {})).status).toBe(400);
    expect(
      (await one("reset", { confirmation: "DELETE_MY_DEMO_RECORDS" })).status,
    ).toBe(200);
    expect((await one("bootstrap")).data.packs[0].goal).toBeUndefined();
    expect((await two("bootstrap")).data.packs[0].goal.dailyMinutes).toBe(30);
  });
  it("generates the documented manual prompt and logs out", async () => {
    const { admin } = await setup();
    const prompt = (
      await admin("admin/prompt", {
        title: "자료구조",
        level: "대학 기초",
        count: 8,
      })
    ).data.prompt;
    expect(prompt).toContain("자료구조");
    expect(prompt).toContain("8문항");
    expect(prompt).toContain("2020-12");
    await admin("logout", {});
    expect((await admin("admin/sample")).status).toBe(401);
  });
  it("does not store invalid imported files", async () => {
    const { admin } = await setup();
    const before = db.state.packs.length;
    expect((await admin("admin/import", { raw: "{}" })).status).toBe(400);
    expect(db.state.packs).toHaveLength(before);
  });
  it("computes insufficient-data and familiar mastery from actual latest outcomes", async () => {
    const { one, packId } = await published();
    for (let i = 0; i < 3; i++) {
      const run = (await one("runs", { packId, mode: "quiz" })).data;
      await one(`runs/${run.id}`, { answers: { q_os_1: 0 } });
      expect((await one("bootstrap")).data.summary.concepts[0].status).toBe(
        i < 2 ? "판단 데이터 부족" : "익숙함",
      );
    }
  });
});

it("checks the browser Host authority when Next normalizes the request URL", async () => {
  const response = await handle(
    new Request("http://localhost:3100/api/session", {
      method: "POST",
      headers: {
        host: "127.0.0.1:3100",
        origin: "http://127.0.0.1:3100",
        "content-type": "application/json",
      },
      body: JSON.stringify({ profileId: "learner-1" }),
    }),
    db,
    now,
  );
  expect(response.status).toBe(200);
  const crossOrigin = await handle(
    new Request("http://localhost:3100/api/session", {
      method: "POST",
      headers: {
        host: "127.0.0.1:3100",
        origin: "http://127.0.0.1:9999",
        "content-type": "application/json",
      },
      body: JSON.stringify({ profileId: "learner-1" }),
    }),
    db,
    now,
  );
  expect(crossOrigin.status).toBe(403);
});
