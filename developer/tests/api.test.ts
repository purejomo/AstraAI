import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { handle } from "../src/lib/api";
import { emptyState, FileStorage, type Storage } from "../src/lib/storage";
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
function client(store: Storage = db) {
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
      store,
      clock,
    );
    if (result.headers.get("set-cookie"))
      cookie = result.headers.get("set-cookie")!.split(";")[0];
    return { status: result.status, data: await result.json() };
  };
}
async function setup() {
  const owner = client();
  await owner("session", {});
  const imported = await owner("library/save", { raw: JSON.stringify(sample) });
  expect(imported.status).toBe(201);
  return {
    owner,
    ...(imported.data as { packId: string; revisionId: string }),
  };
}
beforeEach(() => {
  db = new MemoryStorage();
});
describe("personal workspace, authoring and grading", () => {
  it("creates one local workspace session without account or role selection", async () => {
    const guest = client();
    expect((await guest("library/sample")).status).toBe(401);
    expect((await guest("runs", {})).status).toBe(401);
    expect((await guest("session", { profileId: "admin" })).status).toBe(400);
    expect((await guest("session", {})).status).toBe(200);
    expect((await guest("bootstrap")).data.user).toEqual({
      id: "learner-1",
      name: "나의 학습실",
    });
    expect((await guest("library/sample")).data).toEqual(sample);
    expect((await guest("admin/publish", {})).status).toBe(404);
  });
  it("reveals no saved content to an uninitialized browser or old demo session", async () => {
    await setup();
    const guest = client();
    const data = (await guest("bootstrap")).data as Bootstrap;
    expect(data.user).toBeNull();
    expect(data.packs).toEqual([]);
    expect(data.libraryPacks).toEqual([]);
    expect(data.summary.concepts).toEqual([]);
    db.state.sessions.push({
      token: "old",
      userId: "admin",
      expiresAt: now.getTime() + 10000,
    });
    const response = await handle(
      new Request("http://localhost:3000/api/library/sample", {
        headers: { cookie: "astra_session=old" },
      }),
      db,
      now,
    );
    expect(response.status).toBe(401);
  });
  it("rejects non-local hosts, foreign origins, different ports and missing origin", async () => {
    for (const [host, origin] of [
      ["public.example", "http://public.example"],
      ["localhost:3000", "https://evil.example"],
      ["localhost:3000", "http://localhost:9999"],
      ["localhost:3000", ""],
    ]) {
      const result = await handle(
        new Request(`http://${host}/api/session`, {
          method: "POST",
          headers: { origin, "content-type": "application/json" },
          body: "{}",
        }),
        db,
      );
      expect(result.status).toBe(403);
    }
  });
  it("uses the browser Host authority when Next normalizes the request URL", async () => {
    for (const origin of ["http://127.0.0.1:3100", "http://127.0.0.1:9999"]) {
      const response = await handle(
        new Request("http://localhost:3100/api/session", {
          method: "POST",
          headers: {
            host: "127.0.0.1:3100",
            origin,
            "content-type": "application/json",
          },
          body: "{}",
        }),
        db,
        now,
      );
      expect(response.status).toBe(origin.endsWith("3100") ? 200 : 403);
    }
  });
  it("can author, study, export and reimport immediately without publication", async () => {
    const { owner, packId } = await setup();
    const data = (await owner("bootstrap")).data as Bootstrap;
    expect(data.packs).toHaveLength(1);
    expect(data.libraryPacks).toHaveLength(1);
    expect(data.legacyHistories).toEqual([]);
    expect((await owner("runs", { packId, mode: "quiz" })).status).toBe(201);
    const exported = (await owner(`library/packs/${packId}`)).data;
    expect(exported.data).toEqual(sample);
    expect(
      (await owner("library/save", { raw: JSON.stringify(exported.data) }))
        .status,
    ).toBe(201);
    expect(db.state.packs).toHaveLength(2);
    const anotherBrowser = client();
    await anotherBrowser("session", {});
    expect((await anotherBrowser("bootstrap")).data.packs).toHaveLength(2);
  });
  it("preserves old revision answers and reviews when editing and checks concurrent edits", async () => {
    const { owner, packId, revisionId } = await setup();
    const run = (await owner("runs", { packId, mode: "quiz" })).data;
    const changed = structuredClone(sample);
    changed.questions[0].answer_index = 2;
    changed.questions[0].explanation = "새 해설";
    const input = {
      packId,
      baseRevisionId: revisionId,
      raw: JSON.stringify(changed),
    };
    expect((await owner("library/save", input)).status).toBe(201);
    expect((await owner("library/save", input)).status).toBe(409);
    expect(
      (await owner("library/save", { packId, raw: input.raw })).status,
    ).toBe(409);
    const graded = await owner(`runs/${run.id}`, { answers: { q_os_1: 0 } });
    expect(graded.data.grades[0]).toMatchObject({
      correct: true,
      explanation: sample.questions[0].explanation,
    });
    const review = (
      await owner("runs", {
        packId,
        mode: "review",
        reviewId: "q_os_1",
        revisionId,
      })
    ).data;
    expect(review.version).toBe(1);
    expect(
      (await owner(`runs/${review.id}`, { answers: { q_os_1: 0 } })).data
        .grades[0].correct,
    ).toBe(true);
    const latest = (await owner("runs", { packId, mode: "quiz" })).data;
    expect(latest.version).toBe(2);
    expect(
      (await owner(`runs/${latest.id}`, { answers: { q_os_1: 2 } })).data
        .grades[0].correct,
    ).toBe(true);
    expect(db.state.packs[0].revisions).toHaveLength(2);
  });
  it("omits answers from quizzes, ignores supplied user IDs and grades idempotently", async () => {
    const { owner, packId } = await setup();
    const run = (
      await owner("runs", {
        packId,
        mode: "quiz",
        count: 1,
        userId: "learner-2",
      })
    ).data as RunView;
    for (const field of ["answer_index", "wrong_feedback", "explanation"])
      expect(JSON.stringify(run)).not.toContain(field);
    expect(run.grades).toBeNull();
    expect(db.state.runs[0].userId).toBe("learner-1");
    const result = await owner(`runs/${run.id}`, {
      answers: { q_os_1: 1 },
      answer_index: 1,
    });
    expect(result.data.grades[0]).toMatchObject({
      correct: false,
      answer: 0,
      selected: 1,
    });
    expect(
      (await owner(`runs/${run.id}`, { answers: { q_os_1: 0 } })).data.grades[0]
        .correct,
    ).toBe(false);
    const data = (await owner("bootstrap")).data as Bootstrap;
    expect(data.summary).toMatchObject({
      answered: 1,
      correct: 0,
      sessions: 1,
    });
    expect(data.reviews[0].due).toBe("2026-11-08");
  });
  it("rejects empty answers, foreign questions and invalid choices without writing grades", async () => {
    const { owner, packId } = await setup();
    const run = (await owner("runs", { packId, mode: "quiz" })).data;
    for (const answers of [
      {},
      { other: 0 },
      { q_os_1: 4 },
      { q_os_1: -1 },
      { q_os_1: "0" },
    ])
      expect((await owner(`runs/${run.id}`, { answers })).status).toBe(400);
    expect((await owner(`runs/${run.id}`)).data.grades).toBeNull();
  });
  it("grades unanswered exams as wrong and enforces the server deadline", async () => {
    const { owner, packId } = await setup();
    const run = (await owner("runs", { packId, mode: "exam", minutes: 1 }))
      .data;
    const result = await owner(
      `runs/${run.id}`,
      { answers: { q_os_1: 0 } },
      new Date(now.getTime() + 66000),
    );
    expect(result.data.grades[0]).toMatchObject({
      selected: null,
      correct: false,
    });
    const second = (await owner("runs", { packId, mode: "exam", minutes: 1 }))
      .data;
    expect(
      (await owner(`runs/${second.id}`, { answers: {} })).data.grades[0]
        .selected,
    ).toBeNull();
  });
  it("stores goals, concept progress, flashcards and mastery from actual attempts", async () => {
    const { owner, packId } = await setup();
    expect(
      (
        await owner("goals", {
          packId,
          examDate: "2026-02-30",
          dailyMinutes: 20,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await owner("goals", {
          packId,
          examDate: "2026-11-15",
          dailyMinutes: 20,
        })
      ).status,
    ).toBe(200);
    await owner("study", { packId, conceptId: "c_os" });
    await owner("flashcards", { packId, cardId: "f_os_1", remembered: true });
    const data = (await owner("bootstrap")).data;
    expect(data.packs[0].studied).toEqual(["c_os"]);
    expect(data.packs[0].goal.dailyMinutes).toBe(20);
    expect(data.reviews[0]).toMatchObject({
      kind: "flashcard",
      due: "2026-11-10",
    });
    for (let i = 0; i < 3; i++) {
      const run = (await owner("runs", { packId, mode: "quiz" })).data;
      await owner(`runs/${run.id}`, { answers: { q_os_1: 0 } });
      expect((await owner("bootstrap")).data.summary.concepts[0].status).toBe(
        i < 2 ? "판단 데이터 부족" : "익숙함",
      );
    }
  });
  it("keeps legacy drafts and separate histories usable without erasing or mixing data", async () => {
    const { owner, packId } = await setup();
    db.state.packs[0].publishedId = null;
    db.state.packs[0].access = ["learner-3"];
    db.state.goals.push({
      userId: "learner-2",
      packId,
      examDate: "",
      dailyMinutes: 30,
    });
    const legacy = structuredClone(db.state.goals[0]);
    await owner("goals", { packId, examDate: "", dailyMinutes: 20 });
    expect((await owner("bootstrap")).data.legacyHistories).toHaveLength(3);
    expect((await owner("history", { historyId: "admin" })).status).toBe(400);
    expect((await owner("history", { historyId: "learner-2" })).status).toBe(
      200,
    );
    expect((await owner("bootstrap")).data.packs[0].goal.dailyMinutes).toBe(30);
    expect(db.state.goals[0]).toEqual(legacy);
    expect((await owner("reset", {})).status).toBe(400);
    await owner("reset", { confirmation: "DELETE_MY_RECORDS" });
    expect(db.state.packs).toHaveLength(1);
    expect((await owner("history", { historyId: "learner-1" })).status).toBe(
      200,
    );
    expect(db.state.goals).toEqual([
      { userId: "learner-1", packId, examDate: "", dailyMinutes: 20 },
    ]);
  });
  it("isolates legacy runs when choosing which history to continue", async () => {
    const { owner, packId } = await setup();
    const run = (await owner("runs", { packId, mode: "quiz" })).data;
    db.state.goals.push({
      userId: "learner-2",
      packId,
      examDate: "",
      dailyMinutes: 20,
    });
    await owner("history", { historyId: "learner-2" });
    expect((await owner(`runs/${run.id}`)).status).toBe(404);
    expect((await owner("bootstrap")).data.summary.answered).toBe(0);
    await owner("history", { historyId: "learner-1" });
    expect((await owner(`runs/${run.id}`)).status).toBe(200);
  });
  it("generates a downloadable JSON prompt and expires sessions without deleting content", async () => {
    const { owner } = await setup();
    const prompt = (
      await owner("library/prompt", {
        title: "자료구조 $&",
        level: "대학 기초 $&",
        count: 8,
      })
    ).data.prompt;
    for (const value of [
      "자료구조 $&",
      "대학 기초 $&",
      "8문항",
      "2020-12",
      "UTF-8 JSON 파일 study-pack.json",
      "실제 다운로드 링크",
      "자료를 아직 첨부하지 않았다면 먼저 자료를 요청",
    ])
      expect(prompt).toContain(value);
    expect(
      (
        await owner(
          "library/sample",
          undefined,
          new Date(now.getTime() + 86400001),
        )
      ).status,
    ).toBe(401);
    await owner("session", {});
    expect((await owner("bootstrap")).data.packs).toHaveLength(1);
  });
  it("validates every save, including whitespace-only editor fields, without changing stored content", async () => {
    const { owner, packId, revisionId } = await setup();
    const blank = structuredClone(sample);
    blank.questions[0].question = "   ";
    for (const raw of ["{}", "{broken", JSON.stringify(blank)])
      expect(
        (
          await owner("library/save", {
            packId,
            baseRevisionId: revisionId,
            raw,
          })
        ).status,
      ).toBe(400);
    expect(db.state.packs[0].revisions).toHaveLength(1);
    expect((await owner(`library/packs/${packId}`)).data.data).toEqual(sample);
  });
});

it("retains authored content and grades after restart and transfers only content to another installation", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "astra-personal-"));
  try {
    const firstPath = path.join(directory, "first");
    const first = client(new FileStorage(firstPath));
    await first("session", {});
    const { packId } = (
      await first("library/save", { raw: JSON.stringify(sample) })
    ).data;
    const run = (await first("runs", { packId, mode: "quiz" })).data;
    await first(`runs/${run.id}`, { answers: { q_os_1: 1 } });
    const restarted = client(new FileStorage(firstPath));
    await restarted("session", {});
    const persisted = (await restarted("bootstrap")).data;
    expect(persisted.packs[0].title).toBe(sample.title);
    expect(persisted.summary.answered).toBe(1);
    expect(persisted.reviews).toHaveLength(1);
    const exported = (await restarted(`library/packs/${packId}`)).data.data;
    const independent = client(new FileStorage(path.join(directory, "second")));
    await independent("session", {});
    expect((await independent("bootstrap")).data.packs).toEqual([]);
    await independent("library/save", { raw: JSON.stringify(exported) });
    const imported = (await independent("bootstrap")).data;
    expect(imported.packs[0].title).toBe(sample.title);
    expect(imported.summary.answered).toBe(0);
    expect(imported.reviews).toEqual([]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
