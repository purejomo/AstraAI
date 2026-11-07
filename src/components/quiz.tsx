"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock, Lightbulb } from "lucide-react";
import type { RunView } from "@/lib/types";
import { api } from "./api-client";
export default function Quiz({
  initial,
  finish,
  close,
}: {
  initial: RunView;
  finish: () => Promise<void>;
  close: () => void;
}) {
  const [run, setRun] = useState(initial);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const latestAnswers = useRef(answers);
  useEffect(() => {
    latestAnswers.current = answers;
  }, [answers]);
  const submitting = useRef(false);
  async function submit(values = answers) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      setRun(await api<RunView>(`runs/${run.id}`, { answers: values }));
      sessionStorage.removeItem(`answers-${run.id}`);
      await finish();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  });
  useEffect(() => {
    const saved = sessionStorage.getItem(`answers-${initial.id}`);
    if (saved) {
      try {
        const parsed: unknown = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const restored = Object.fromEntries(
            Object.entries(parsed).filter(
              ([id, value]) =>
                initial.questions.some((q) => q.id === id) &&
                typeof value === "number" &&
                Number.isInteger(value) &&
                value >= 0 &&
                value <= 3,
            ),
          );
          latestAnswers.current = restored;
          queueMicrotask(() => setAnswers(restored));
        }
      } catch {
        /* An invalid local draft is safe to discard. */
      }
    }
  }, [initial.id, initial.questions]);
  useEffect(() => {
    if (!run.deadline || run.grades) return;
    const tick = () => {
      const seconds = Math.max(
        0,
        Math.ceil((Date.parse(run.deadline!) - Date.now()) / 1000),
      );
      setRemaining(seconds);
      if (!seconds) void submitRef.current(latestAnswers.current);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [run.deadline, run.grades]);
  function answer(id: string, value: number) {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    sessionStorage.setItem(`answers-${run.id}`, JSON.stringify(next));
  }
  const question = run.questions[index];
  const answered = Object.keys(answers).length;
  if (run.grades) {
    const correct = run.grades.filter((g) => g.correct).length;
    return (
      <>
        <button className="text-button" onClick={close}>
          <ArrowLeft size={16} />
          학습실로 돌아가기
        </button>
        <div className="page-heading">
          <div>
            <p className="eyebrow">학습 결과 · v{run.version}</p>
            <h1>한 번 더, 내 것으로.</h1>
            <p>
              {run.title} ·{" "}
              {run.mode === "exam"
                ? "모의고사"
                : run.mode === "review"
                  ? "오답 복습"
                  : "퀴즈"}
            </p>
          </div>
        </div>
        <section className="result-summary panel">
          <div className="score">
            {Math.round((correct / run.grades.length) * 100)}
            <small>점</small>
          </div>
          <div>
            <h2>
              {run.grades.length}문항 중 {correct}개 정답
            </h2>
            <p>오답은 1일 뒤, 연속 정답은 3·7·14일 뒤 복습합니다.</p>
            <span className="tag">
              <Check size={14} />
              학습 기록 저장 완료
            </span>
          </div>
        </section>
        {run.grades.map((g, i) => (
          <article className="panel feedback" key={g.questionId}>
            <span className={`tag ${g.correct ? "" : "wrong"}`}>
              {g.correct ? "정답" : "다시 살펴보기"}
            </span>
            <h2>
              {i + 1}. {run.questions[i].question}
            </h2>
            <p>
              내 답:{" "}
              {g.selected === null
                ? "미응답 / 시간 만료"
                : run.questions[i].choices[g.selected]}
            </p>
            <p>
              <strong>정답: {run.questions[i].choices[g.answer]}</strong>
            </p>
            <p>{g.explanation}</p>
            {!g.correct && <p className="notice">{g.feedback}</p>}
            <p className="muted">
              {g.sources.length
                ? g.sources
                    .map((s) => `${s.file} · ${s.page ?? "미확인"}쪽`)
                    .join(", ")
                : "출처 미확인 · 관리자 검토가 필요한 AI 생성 연습문제"}
            </p>
          </article>
        ))}
        <button className="button primary" onClick={close}>
          학습실로 돌아가기
          <ArrowRight size={16} />
        </button>
      </>
    );
  }
  return (
    <>
      <button className="text-button" onClick={close}>
        <ArrowLeft size={16} />
        잠시 나가기 · 답안 유지
      </button>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {run.mode === "exam"
              ? "모의고사"
              : run.mode === "review"
                ? "오답 복습"
                : "집중 퀴즈"}{" "}
            · v{run.version}
          </p>
          <h1>{run.title}</h1>
          <p>AI 생성 연습문제 · 제출 후 정답과 해설을 확인할 수 있습니다.</p>
        </div>
        {remaining !== null && (
          <span className="timer" role="timer">
            <Clock size={18} />
            {Math.floor(remaining / 60)}:
            {String(remaining % 60).padStart(2, "0")}
          </span>
        )}
      </div>
      <div className="quiz-progress">
        <span>
          {index + 1} / {run.questions.length} 문항
        </span>
        <span>{answered}개 답변 완료</span>
      </div>
      <progress
        max={run.questions.length}
        value={answered}
        aria-label="답변 진행률"
      />
      {error && (
        <div role="alert" className="notice error">
          {error}
        </div>
      )}
      <section className="panel question-panel">
        <p className="eyebrow">
          Question {String(index + 1).padStart(2, "0")} ·{" "}
          {{ easy: "기초", medium: "보통", hard: "심화" }[question.difficulty]}
        </p>
        <h2>{question.question}</h2>
        <fieldset className="choices">
          <legend className="sr-only">정답 선택</legend>
          {question.choices.map((choice, i) => (
            <label
              className={`choice ${answers[question.id] === i ? "selected" : ""}`}
              key={i}
            >
              <input
                type="radio"
                name={question.id}
                checked={answers[question.id] === i}
                onChange={() => answer(question.id, i)}
                disabled={busy}
              />
              <span className="choice-letter">
                {String.fromCharCode(65 + i)}
              </span>
              <span>{choice}</span>
              {answers[question.id] === i && <Check size={18} />}
            </label>
          ))}
        </fieldset>
        {run.mode !== "exam" && (
          <details className="hint" key={question.id}>
            <summary>
              <Lightbulb size={16} />
              힌트 보기
            </summary>
            <p>{question.hint}</p>
          </details>
        )}
      </section>
      <div className="question-nav">
        {run.questions.map((q, i) => (
          <button
            key={q.id}
            className={`question-number ${index === i ? "active" : ""} ${answers[q.id] !== undefined ? "answered" : ""}`}
            aria-label={`${i + 1}번 문항`}
            aria-current={index === i ? "step" : undefined}
            onClick={() => setIndex(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <div className="actions spread">
        <button
          className="button secondary"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          <ArrowLeft size={16} />
          이전 문항
        </button>
        {index < run.questions.length - 1 ? (
          <button
            className="button primary"
            onClick={() => setIndex(index + 1)}
          >
            다음 문항
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            className="button primary"
            disabled={
              busy || (run.mode !== "exam" && answered !== run.questions.length)
            }
            onClick={() => void submit()}
          >
            {busy ? "채점 중…" : "답안 제출하고 채점"}
            <Check size={16} />
          </button>
        )}
      </div>
    </>
  );
}
