import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sample from "../../examples/sample-study-pack.json";
import schema from "../../schemas/study-pack.schema.json";
import { AppError, integer, MAX_BYTES, parsePack, text } from "./validation";
import { day, nextReview, publicRun, summary } from "./learning";
import {
  type Pack,
  type Profile,
  type State,
  type Review,
  type Run,
} from "./types";
import { storage, emptyState, type Storage } from "./storage";
const json = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
function requireUser(user: Profile | undefined): Profile {
  if (!user) throw new AppError("학습실을 다시 열어 주세요.", 401);
  return user;
}
function accessible(state: State, id: unknown): Pack {
  const p = state.packs.find((p) => p.id === id);
  if (!p || !p.revisions.length)
    throw new AppError("학습팩을 찾지 못했습니다.", 404);
  return p;
}
function activeId(pack: Pack) {
  return pack.publishedId || pack.revisions.at(-1)!.id;
}
function legacyHistories(state: State) {
  const records = [
    ...state.runs,
    ...state.reviews,
    ...state.goals,
    ...state.studied,
  ];
  if (
    !state.historyId &&
    !records.some((r) => ["learner-2", "learner-3"].includes(r.userId))
  )
    return [];
  return ["learner-1", "learner-2", "learner-3"].map((id, i) => ({
    id,
    name: `이전 학습자 ${i + 1}`,
    records: records.filter((r) => r.userId === id).length,
  }));
}
function recordReview(
  state: State,
  identity: Pick<
    Review,
    "userId" | "packId" | "revisionId" | "itemId" | "kind"
  >,
  correct: boolean,
  now: Date,
) {
  const prior = state.reviews.find((r) =>
    Object.entries(identity).every(
      ([key, value]) => r[key as keyof Review] === value,
    ),
  );
  if (prior) Object.assign(prior, nextReview(prior, correct, now));
  else
    state.reviews.push({ ...identity, ...nextReview(undefined, correct, now) });
}
async function body(req: Request): Promise<Record<string, unknown>> {
  if (!req.headers.get("content-type")?.startsWith("application/json"))
    throw new AppError("JSON 요청이 필요합니다.", 415);
  const reader = req.body?.getReader();
  if (!reader) throw new AppError("요청 내용이 없습니다.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES + 1024 * 1024) {
      await reader.cancel();
      throw new AppError("요청이 너무 큽니다.", 413);
    }
    chunks.push(value);
  }
  try {
    const value = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
    );
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    return value;
  } catch {
    throw new AppError("올바른 UTF-8 JSON 요청이 필요합니다.");
  }
}
export async function handle(
  req: Request,
  db: Storage = storage,
  now = new Date(),
): Promise<Response> {
  try {
    const url = new URL(req.url);
    // Next can normalize req.url to its bind hostname. Host is the browser-facing
    // authority; never use forwarded headers for this local-only workspace.
    const authority = new URL(
      `${url.protocol}//${req.headers.get("host") || url.host}`,
    );
    if (!["localhost", "127.0.0.1", "[::1]"].includes(authority.hostname))
      throw new AppError("이 학습실은 본인 PC에서만 사용할 수 있습니다.", 403);
    if (req.method !== "GET" && req.headers.get("origin") !== authority.origin)
      throw new AppError("요청 출처를 확인할 수 없습니다.", 403);
    const route = url.pathname.replace(/^\/api\//, "");
    const desktopToken = process.env.ASTRA_DESKTOP_TOKEN;
    if (
      desktopToken &&
      req.headers.get("x-astra-desktop-token") !== desktopToken
    )
      throw new AppError("앱에서 학습실을 열어 주세요.", 403);
    if (desktopToken && req.method === "GET" && route === "desktop/health")
      return json({ desktop: true });
    const input = req.method === "POST" ? await body(req) : {};
    const token = req.headers
      .get("cookie")
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("astra_session="))
      ?.slice(14);
    return await db.transaction(async (state) => {
      state.sessions = state.sessions.filter(
        (s) => s.expiresAt > now.getTime(),
      );
      // This cookie is a local browser session, not an Internet authentication boundary.
      const user = state.sessions.some(
        (s) => s.token === token && s.userId === "local-owner",
      )
        ? { id: state.historyId || "learner-1", name: "나의 학습실" }
        : undefined;
      if (req.method === "POST" && route === "session") {
        if (Object.keys(input).length)
          throw new AppError("계정 선택은 더 이상 사용하지 않습니다.");
        const sessionToken = randomBytes(32).toString("hex");
        state.sessions = state.sessions.filter((s) => s.token !== token);
        state.sessions.push({
          token: sessionToken,
          userId: "local-owner",
          expiresAt: now.getTime() + 86400000,
        });
        return json({ ok: true }, 200, {
          "Set-Cookie": `astra_session=${sessionToken}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`,
        });
      }
      if (req.method === "POST" && route === "logout") {
        state.sessions = state.sessions.filter((s) => s.token !== token);
        return json({ ok: true }, 200, {
          "Set-Cookie":
            "astra_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
        });
      }
      if (req.method === "GET" && route === "bootstrap") {
        const packs = user
          ? state.packs
              .filter((p) => p.revisions.length > 0)
              .map((p) => {
                const r = p.revisions.find((r) => r.id === activeId(p))!;
                return {
                  id: p.id,
                  revisionId: r.id,
                  version: r.version,
                  title: r.data.title,
                  description: r.data.description,
                  concepts: r.data.concepts,
                  questionCount: r.data.questions.length,
                  flashcards: r.data.flashcards,
                  studied: state.studied
                    .filter(
                      (s) => s.userId === user.id && s.revisionId === r.id,
                    )
                    .map((s) => s.conceptId),
                  goal: state.goals.find(
                    (g) => g.userId === user.id && g.packId === p.id,
                  ),
                };
              })
          : [];
        const reviews = user
          ? state.reviews
              .filter(
                (r) =>
                  r.userId === user.id &&
                  state.packs.some(
                    (p) => p.id === r.packId && p.revisions.length > 0,
                  ),
              )
              .map((r) => {
                const revision = state.packs
                  .find((p) => p.id === r.packId)!
                  .revisions.find((v) => v.id === r.revisionId)!;
                const q = revision.data.questions.find(
                  (q) => q.id === r.itemId,
                );
                const f = revision.data.flashcards.find(
                  (f) => f.id === r.itemId,
                );
                return {
                  ...r,
                  title: revision.data.title,
                  text: r.kind === "question" ? q!.question : f!.front,
                  ...(r.kind === "question"
                    ? { question: q }
                    : { front: f!.front, back: f!.back }),
                };
              })
          : [];
        return json({
          storageMode: desktopToken ? "desktop" : "folder",
          user: user || null,
          packs,
          legacyHistories: user ? legacyHistories(state) : [],
          reviews,
          today: day(now),
          summary: summary(user ? state : emptyState(), user?.id || "", now),
          libraryPacks: user
            ? state.packs.map((p) => ({
                id: p.id,
                title: p.revisions.at(-1)!.data.title,
                revisions: p.revisions.map((r) => ({
                  id: r.id,
                  version: r.version,
                  title: r.data.title,
                  questionCount: r.data.questions.length,
                })),
              }))
            : [],
        });
      }
      const actor = requireUser(user);
      if (req.method === "POST" && route === "history") {
        if (!legacyHistories(state).some((h) => h.id === input.historyId))
          throw new AppError("이어 쓸 이전 기록을 찾지 못했습니다.");
        state.historyId = input.historyId as string;
        return json({ ok: true });
      }
      if (req.method === "GET" && route.startsWith("library/packs/")) {
        const pack = accessible(state, route.split("/")[2]);
        const revision = pack.revisions.at(-1)!;
        return json({
          packId: pack.id,
          baseRevisionId: revision.id,
          data: revision.data,
        });
      }
      if (route.startsWith("library/")) {
        if (req.method === "GET" && route === "library/sample")
          return json(sample);
        if (req.method === "POST" && route === "library/prompt") {
          const title = text(input.title, "제목", 150);
          const level = text(input.level, "학습 목표", 500);
          const count = integer(input.count, 1, 500);
          const template = await readFile(
            path.join(process.cwd(), "prompts/GENERATE_STUDY_PACK.md"),
            "utf8",
          );
          const prompt = template
            .split("```text")[1]
            .split("```")[0]
            .trim()
            .replace("[제목 입력]", title)
            .replace("[목표/수준 입력]", level)
            .replace("30문항 (필요하면 변경)", `${count}문항`);
          return json({
            prompt: `${prompt}\n\n반드시 다음 JSON Schema도 준수하세요:\n${JSON.stringify(schema, null, 2)}`,
          });
        }
        if (
          req.method === "POST" &&
          (route === "library/preview" || route === "library/save")
        ) {
          if (typeof input.raw !== "string")
            throw new AppError("JSON 파일을 선택하거나 내용을 붙여 넣으세요.");
          const data = parsePack(input.raw);
          if (route === "library/preview") return json({ data });
          let pack = state.packs.find((p) => p.id === input.packId);
          if (input.packId && !pack)
            throw new AppError("개정할 학습팩을 찾지 못했습니다.", 404);
          if (pack && input.baseRevisionId !== pack.revisions.at(-1)?.id)
            throw new AppError(
              "다른 화면에서 수정한 내용이 있습니다. 작성 중인 JSON을 내려받은 뒤 최신 학습팩을 다시 열어 주세요.",
              409,
            );
          if (!pack) {
            pack = {
              id: randomUUID(),
              publishedId: null,
              access: [], // Retained in storage for compatibility with older installations.
              revisions: [],
            };
            state.packs.push(pack);
          }
          const revision = {
            id: randomUUID(),
            version: pack.revisions.length + 1,
            createdAt: now.toISOString(),
            data,
          };
          pack.revisions.push(revision);
          pack.publishedId = revision.id;
          return json({ packId: pack.id, revisionId: revision.id }, 201);
        }
      }
      if (req.method === "POST" && route === "runs") {
        const pack = accessible(state, input.packId);
        const mode = input.mode;
        if (!["quiz", "review", "exam"].includes(String(mode)))
          throw new AppError("학습 모드가 잘못되었습니다.");
        const review =
          mode === "review"
            ? state.reviews.find(
                (r) =>
                  r.userId === actor.id &&
                  r.packId === pack.id &&
                  r.kind === "question" &&
                  r.itemId === input.reviewId &&
                  r.revisionId === input.revisionId,
              )
            : undefined;
        if (mode === "review" && !review)
          throw new AppError("복습할 문항을 찾지 못했습니다.", 404);
        const revision = pack.revisions.find(
          (r) => r.id === (review?.revisionId || activeId(pack)),
        )!;
        let questions = revision.data.questions.filter((q) =>
          review
            ? q.id === review.itemId
            : !input.conceptId || q.concept_id === input.conceptId,
        );
        const count = integer(input.count ?? 10, 1, 500);
        for (let i = questions.length - 1; i > 0; i--) {
          const j = randomInt(i + 1);
          [questions[i], questions[j]] = [questions[j], questions[i]];
        }
        questions = questions.slice(0, count);
        if (!questions.length)
          throw new AppError("선택한 범위에 문항이 없습니다.");
        const run: Run = {
          id: randomUUID(),
          userId: actor.id,
          packId: pack.id,
          revisionId: revision.id,
          mode: mode as Run["mode"],
          questionIds: questions.map((q) => q.id),
          startedAt: now.toISOString(),
          deadline:
            mode === "exam"
              ? new Date(
                  now.getTime() + integer(input.minutes ?? 10, 1, 180) * 60000,
                ).toISOString()
              : null,
          submittedAt: null,
          grades: null,
        };
        state.runs.push(run);
        return json(publicRun(state, run), 201);
      }
      if (route.startsWith("runs/")) {
        const run = state.runs.find(
          (r) => r.id === route.split("/")[1] && r.userId === actor.id,
        );
        if (!run) throw new AppError("학습 기록을 찾지 못했습니다.", 404);
        accessible(state, run.packId);
        if (req.method === "GET") return json(publicRun(state, run));
        if (req.method === "POST") {
          if (run.grades) return json(publicRun(state, run));
          if (
            !input.answers ||
            typeof input.answers !== "object" ||
            Array.isArray(input.answers)
          )
            throw new AppError("선택한 답안을 확인하세요.");
          const answers = input.answers as Record<string, unknown>;
          if (Object.keys(answers).some((id) => !run.questionIds.includes(id)))
            throw new AppError("응시 문항에 없는 답안입니다.");
          for (const value of Object.values(answers)) integer(value, 0, 3);
          if (
            run.mode !== "exam" &&
            run.questionIds.some((id) => answers[id] === undefined)
          )
            throw new AppError("모든 문항의 답을 선택해 주세요.");
          // Late exam requests cannot add answers after the server deadline. A small grace covers transit only.
          const expired =
            run.deadline && now.getTime() > Date.parse(run.deadline) + 5000;
          const revision = state.packs
            .find((p) => p.id === run.packId)!
            .revisions.find((r) => r.id === run.revisionId)!;
          run.grades = run.questionIds.map((id) => {
            const q = revision.data.questions.find((q) => q.id === id)!;
            const selected = expired
              ? null
              : typeof answers[id] === "number"
                ? (answers[id] as number)
                : null;
            const correct = selected === q.answer_index;
            recordReview(
              state,
              {
                userId: actor.id,
                packId: run.packId,
                revisionId: run.revisionId,
                itemId: id,
                kind: "question",
              },
              correct,
              now,
            );
            return {
              questionId: id,
              selected,
              correct,
              answer: q.answer_index,
              explanation: q.explanation,
              feedback: q.wrong_feedback,
              sources: q.source_refs,
            };
          });
          run.submittedAt = now.toISOString();
          return json(publicRun(state, run));
        }
      }
      if (req.method === "POST" && route === "study") {
        const pack = accessible(state, input.packId);
        const revision = pack.revisions.find((r) => r.id === activeId(pack))!;
        if (!revision.data.concepts.some((c) => c.id === input.conceptId))
          throw new AppError("개념을 찾지 못했습니다.");
        if (
          !state.studied.some(
            (s) =>
              s.userId === actor.id &&
              s.revisionId === revision.id &&
              s.conceptId === input.conceptId,
          )
        )
          state.studied.push({
            userId: actor.id,
            revisionId: revision.id,
            conceptId: input.conceptId as string,
          });
        return json({ ok: true });
      }
      if (req.method === "POST" && route === "flashcards") {
        const pack = accessible(state, input.packId);
        const revision = pack.revisions.find(
          (r) => r.id === (input.revisionId || activeId(pack)),
        );
        if (
          !revision ||
          !revision.data.flashcards.some((f) => f.id === input.cardId) ||
          typeof input.remembered !== "boolean"
        )
          throw new AppError("카드와 응답을 확인해 주세요.");
        if (
          revision.id !== activeId(pack) &&
          !state.reviews.some(
            (r) =>
              r.userId === actor.id &&
              r.revisionId === revision.id &&
              r.itemId === input.cardId &&
              r.kind === "flashcard",
          )
        )
          throw new AppError("복습할 카드를 찾지 못했습니다.", 404);
        recordReview(
          state,
          {
            userId: actor.id,
            packId: pack.id,
            revisionId: revision.id,
            itemId: input.cardId as string,
            kind: "flashcard",
          },
          input.remembered,
          now,
        );
        return json({ ok: true });
      }
      if (req.method === "POST" && route === "goals") {
        const pack = accessible(state, input.packId);
        const dailyMinutes = integer(input.dailyMinutes, 5, 480);
        const examDate = input.examDate;
        if (
          typeof examDate !== "string" ||
          (examDate &&
            (!/^\d{4}-\d{2}-\d{2}$/.test(examDate) ||
              !Number.isFinite(Date.parse(examDate)) ||
              new Date(examDate).toISOString().slice(0, 10) !== examDate ||
              examDate < day(now)))
        )
          throw new AppError("시험일은 오늘 이후의 날짜로 입력해 주세요.");
        state.goals = state.goals.filter(
          (g) => g.userId !== actor.id || g.packId !== pack.id,
        );
        state.goals.push({
          userId: actor.id,
          packId: pack.id,
          examDate,
          dailyMinutes,
        });
        return json({ ok: true });
      }
      if (req.method === "POST" && route === "reset") {
        if (input.confirmation !== "DELETE_MY_RECORDS")
          throw new AppError("삭제 확인이 필요합니다.");
        state.runs = state.runs.filter((r) => r.userId !== actor.id);
        state.reviews = state.reviews.filter((r) => r.userId !== actor.id);
        state.goals = state.goals.filter((r) => r.userId !== actor.id);
        state.studied = state.studied.filter((r) => r.userId !== actor.id);
        return json({ ok: true });
      }
      throw new AppError("요청한 기능을 찾지 못했습니다.", 404);
    });
  } catch (error) {
    if (error instanceof AppError)
      return json(
        { error: error.message, details: error.details },
        error.status,
      );
    console.error(
      "AstraAI request failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return json(
      { error: "저장 또는 처리에 실패했습니다. 잠시 후 다시 시도해 주세요." },
      500,
    );
  }
}
