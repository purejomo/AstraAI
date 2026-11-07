import type { Review, Run, State, Summary } from "./types";
export function day(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function nextReview(
  previous: Review | undefined,
  correct: boolean,
  now = new Date(),
) {
  const streak = correct ? (previous?.streak || 0) + 1 : 0;
  const days = correct ? [3, 7, 14][Math.min(streak - 1, 2)] : 1;
  const due = new Date(`${day(now)}T00:00:00Z`);
  due.setUTCDate(due.getUTCDate() + days);
  return { streak, due: due.toISOString().slice(0, 10), lastCorrect: correct };
}
export function summary(
  state: State,
  userId: string,
  now = new Date(),
): Summary {
  const runs = state.runs.filter((r) => r.userId === userId && r.grades);
  const grades = runs.flatMap((r) => r.grades!);
  const history = [...runs].reverse().map((r) => {
    const revision = state.packs
      .find((p) => p.id === r.packId)!
      .revisions.find((v) => v.id === r.revisionId)!;
    return {
      id: r.id,
      title: revision.data.title,
      version: revision.version,
      mode: r.mode,
      correct: r.grades!.filter((g) => g.correct).length,
      total: r.grades!.length,
      date: r.submittedAt!,
    };
  });
  const concepts = state.packs
    .filter((p) => p.revisions.length > 0)
    .flatMap((p) => {
      const revision = p.revisions.find(
        (v) => v.id === (p.publishedId || p.revisions.at(-1)!.id),
      )!;
      return revision.data.concepts.map((c) => {
        const outcomes = runs
          .filter((r) => r.revisionId === revision.id)
          .flatMap((r) =>
            r.grades!.filter(
              (g) =>
                revision.data.questions.find((q) => q.id === g.questionId)
                  ?.concept_id === c.id,
            ),
          )
          .slice(-10);
        const accuracy = outcomes.length
          ? Math.round(
              (outcomes.filter((g) => g.correct).length / outcomes.length) *
                100,
            )
          : null;
        const status =
          outcomes.length < 3
            ? "판단 데이터 부족"
            : accuracy! < 60
              ? "집중 복습"
              : accuracy! >= 80 && outcomes.slice(-2).every((g) => g.correct)
                ? "익숙함"
                : "학습 중";
        return {
          packId: p.id,
          conceptId: c.id,
          title: c.title,
          count: outcomes.length,
          accuracy,
          status,
        };
      });
    });
  const due = state.reviews.filter(
    (r) =>
      r.userId === userId &&
      r.due <= day(now) &&
      state.packs.some((p) => p.id === r.packId && p.revisions.length > 0),
  ).length;
  return {
    answered: grades.length,
    correct: grades.filter((g) => g.correct).length,
    sessions: runs.length,
    due,
    history,
    concepts,
  };
}
export function publicRun(state: State, run: Run) {
  const revision = state.packs
    .find((p) => p.id === run.packId)!
    .revisions.find((r) => r.id === run.revisionId)!;
  return {
    id: run.id,
    mode: run.mode,
    title: revision.data.title,
    version: revision.version,
    deadline: run.deadline,
    submittedAt: run.submittedAt,
    grades: run.grades,
    questions: run.questionIds.map((id) => {
      const q = revision.data.questions.find((q) => q.id === id)!;
      return {
        id: q.id,
        concept_id: q.concept_id,
        question: q.question,
        choices: q.choices,
        hint: q.hint,
        difficulty: q.difficulty,
      };
    }),
  };
}
