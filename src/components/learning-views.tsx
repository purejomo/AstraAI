"use client";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  RotateCcw,
  CalendarDays,
  Layers,
  Target,
} from "lucide-react";
import type { Bootstrap, PublicPack, RunView } from "@/lib/types";
import { api } from "./api-client";
export type RunAction = (path: string, body: unknown) => Promise<boolean>;
export function PackDetail({
  pack,
  start,
  act,
  back,
}: {
  pack: PublicPack;
  start: (input: unknown) => Promise<void>;
  act: RunAction;
  back: () => void;
}) {
  const [tab, setTab] = useState<"concepts" | "quiz" | "cards" | "exam">(
    "concepts",
  );
  const [conceptId, setConceptId] = useState("");
  const [count, setCount] = useState(Math.min(pack.questionCount, 10));
  const [minutes, setMinutes] = useState(10);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const card = pack.flashcards[cardIndex];
  return (
    <>
      <button className="text-button" onClick={back}>
        <ArrowLeft size={16} />
        학습팩 목록
      </button>
      <div className="page-heading">
        <div>
          <p className="eyebrow">학습팩 · v{pack.version}</p>
          <h1>{pack.title}</h1>
          <p>{pack.description}</p>
        </div>
        <span className="tag">{pack.questionCount}문항</span>
      </div>
      <div className="tabs" role="tablist" aria-label="학습 방법">
        {(
          [
            ["concepts", "개념 학습"],
            ["quiz", "문제 풀기"],
            ["cards", "플래시카드"],
            ["exam", "모의고사"],
          ] as const
        ).map(([id, label]) => (
          <button
            role="tab"
            id={`study-tab-${id}`}
            aria-controls="study-panel"
            tabIndex={tab === id ? 0 : -1}
            onKeyDown={(event) => {
              const ids = ["concepts", "quiz", "cards", "exam"] as const;
              const current = ids.indexOf(tab);
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? 3
                    : event.key === "ArrowRight"
                      ? (current + 1) % 4
                      : event.key === "ArrowLeft"
                        ? (current + 3) % 4
                        : -1;
              if (next >= 0) {
                event.preventDefault();
                setTab(ids[next]);
                document.getElementById(`study-tab-${ids[next]}`)?.focus();
              }
            }}
            aria-selected={tab === id}
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        id="study-panel"
        role="tabpanel"
        aria-labelledby={`study-tab-${tab}`}
        tabIndex={0}
      >
        {tab === "concepts" && (
          <div className="concept-list">
            {pack.concepts.map((c, i) => (
              <article className="panel concept" key={c.id}>
                <div className="section-heading">
                  <span className="eyebrow">
                    Concept {String(i + 1).padStart(2, "0")}
                  </span>
                  {pack.studied.includes(c.id) && (
                    <span className="tag">
                      <Check size={14} />
                      학습 완료
                    </span>
                  )}
                </div>
                <h2>{c.title}</h2>
                <p className="lead">{c.summary}</p>
                <ul className="key-points">
                  {c.key_points.map((p, j) => (
                    <li key={j}>{p}</li>
                  ))}
                </ul>
                {c.faqs.map((f, j) => (
                  <details key={j}>
                    <summary>{f.question}</summary>
                    <p>{f.answer}</p>
                  </details>
                ))}
                <button
                  className="button secondary"
                  disabled={pack.studied.includes(c.id)}
                  onClick={() =>
                    void act("study", { packId: pack.id, conceptId: c.id })
                  }
                >
                  <Check size={16} />
                  {pack.studied.includes(c.id)
                    ? "학습 완료"
                    : "읽고 이해했어요"}
                </button>
              </article>
            ))}
          </div>
        )}
        {(tab === "quiz" || tab === "exam") && (
          <section className="panel setup-panel">
            <div className="icon-tile">
              {tab === "exam" ? <Target /> : <BookOpen />}
            </div>
            <h2>
              {tab === "exam"
                ? "시간을 정하고 실력 확인"
                : "배운 개념을 문제로 확인"}
            </h2>
            <p>
              {tab === "exam"
                ? "제한 시간이 끝나면 자동 제출됩니다. 미응답 문항은 오답으로 기록됩니다."
                : "모든 문항에 답한 뒤 한 번에 채점합니다. 힌트를 활용해도 좋아요."}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setBusy(true);
                void start({
                  packId: pack.id,
                  mode: tab === "exam" ? "exam" : "quiz",
                  conceptId: tab === "exam" ? "" : conceptId,
                  count,
                  minutes,
                }).finally(() => setBusy(false));
              }}
            >
              <div className="form-grid">
                {tab === "quiz" && (
                  <label>
                    학습 범위
                    <select
                      value={conceptId}
                      onChange={(e) => setConceptId(e.target.value)}
                    >
                      <option value="">전체 개념</option>
                      {pack.concepts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  문항 수
                  <input
                    type="number"
                    min={1}
                    max={pack.questionCount}
                    required
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                  />
                </label>
                {tab === "exam" && (
                  <label>
                    제한 시간 (분)
                    <input
                      type="number"
                      min={1}
                      max={180}
                      required
                      value={minutes}
                      onChange={(e) => setMinutes(Number(e.target.value))}
                    />
                  </label>
                )}
              </div>
              <p className="muted">
                선택한 범위의 문항 수가 적으면 가능한 문항만 출제됩니다.
              </p>
              <button className="button primary" disabled={busy}>
                {tab === "exam" ? "모의고사 시작" : "퀴즈 시작"}
                <ArrowRight size={16} />
              </button>
            </form>
          </section>
        )}
        {tab === "cards" &&
          (card ? (
            <section className="panel flash-panel">
              <p className="eyebrow">
                Flashcard {cardIndex + 1} / {pack.flashcards.length}
              </p>
              <button
                className={`flashcard ${flipped ? "flipped" : ""}`}
                onClick={() => setFlipped(!flipped)}
                aria-label={flipped ? "카드 앞면 보기" : "카드 뒤집기"}
              >
                <Layers size={24} />
                <span>{flipped ? card.back : card.front}</span>
                <small>
                  {flipped
                    ? "다시 누르면 질문으로"
                    : "카드를 눌러 답을 확인하세요"}
                </small>
              </button>
              {flipped && (
                <div className="actions">
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => {
                      setBusy(true);
                      void act("flashcards", {
                        packId: pack.id,
                        cardId: card.id,
                        remembered: false,
                      })
                        .then((ok) => {
                          if (!ok) return;
                          setCardIndex(
                            (cardIndex + 1) % pack.flashcards.length,
                          );
                          setFlipped(false);
                        })
                        .finally(() => setBusy(false));
                    }}
                  >
                    <RotateCcw size={16} />
                    다시 볼게요
                  </button>
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() => {
                      setBusy(true);
                      void act("flashcards", {
                        packId: pack.id,
                        cardId: card.id,
                        remembered: true,
                      })
                        .then((ok) => {
                          if (!ok) return;
                          setCardIndex(
                            (cardIndex + 1) % pack.flashcards.length,
                          );
                          setFlipped(false);
                        })
                        .finally(() => setBusy(false));
                    }}
                  >
                    <Check size={16} />
                    기억했어요
                  </button>
                </div>
              )}
              <p className="muted">
                기억한 카드는 3·7·14일, 다시 볼 카드는 1일 뒤 복습합니다.
              </p>
            </section>
          ) : (
            <div className="empty panel">
              <Layers />
              <h2>등록된 플래시카드가 없습니다</h2>
              <p>나의 문제은행에서 이 학습팩을 수정해 카드를 추가하세요.</p>
            </div>
          ))}
      </div>
    </>
  );
}
export function Reviews({
  data,
  start,
  act,
}: {
  data: Bootstrap;
  start: (input: unknown) => Promise<void>;
  act: RunAction;
}) {
  const [filter, setFilter] = useState("all");
  const rows = data.reviews
    .filter((r) =>
      filter === "due"
        ? r.due <= data.today
        : filter === "wrong"
          ? !r.lastCorrect
          : true,
    )
    .sort((a, b) => a.due.localeCompare(b.due));
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">반복해서 더 단단하게</p>
          <h1>오답과 복습</h1>
          <p>지난 답안을 돌아보고, 필요한 순간에 다시 만나요.</p>
        </div>
        <span className="tag">오늘 복습 {data.summary.due}개</span>
      </div>
      <div className="tabs" aria-label="복습 필터">
        {[
          ["all", "전체 일정"],
          ["due", "오늘까지 복습"],
          ["wrong", "최근 오답"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={filter === id ? "active" : ""}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {!rows.length ? (
        <div className="empty panel">
          <Check size={32} />
          <h2>지금은 복습할 항목이 없어요</h2>
          <p>퀴즈나 플래시카드를 학습하면 나만의 복습 일정이 생깁니다.</p>
        </div>
      ) : (
        rows.map((r) => (
          <article
            className="panel review"
            key={`${r.revisionId}-${r.kind}-${r.itemId}`}
          >
            <div className="section-heading">
              <span
                className={`tag ${r.due <= data.today ? "wrong" : "neutral"}`}
              >
                {r.due <= data.today ? "오늘 복습" : `${r.due} 복습`}
              </span>
              <span className="muted">
                {r.kind === "question" ? "문제" : "플래시카드"} · 연속 정답{" "}
                {r.streak}회
              </span>
            </div>
            <p className="eyebrow">{r.title}</p>
            <h2>{r.text}</h2>
            {r.question && (
              <details>
                <summary>정답과 해설 다시 보기</summary>
                <p>
                  <strong>{r.question.choices[r.question.answer_index]}</strong>
                </p>
                <p>{r.question.explanation}</p>
                <p>{r.question.wrong_feedback}</p>
              </details>
            )}
            {r.kind === "question" ? (
              <button
                className="button secondary"
                onClick={() =>
                  void start({
                    packId: r.packId,
                    mode: "review",
                    reviewId: r.itemId,
                    revisionId: r.revisionId,
                    count: 1,
                  })
                }
              >
                이 문제 다시 풀기
                <ArrowRight size={16} />
              </button>
            ) : (
              <details>
                <summary>카드 답 확인하기</summary>
                <p>{r.back}</p>
                <div className="actions">
                  <button
                    className="button secondary"
                    onClick={() =>
                      void act("flashcards", {
                        packId: r.packId,
                        revisionId: r.revisionId,
                        cardId: r.itemId,
                        remembered: false,
                      })
                    }
                  >
                    다시 볼게요
                  </button>
                  <button
                    className="button primary"
                    onClick={() =>
                      void act("flashcards", {
                        packId: r.packId,
                        revisionId: r.revisionId,
                        cardId: r.itemId,
                        remembered: true,
                      })
                    }
                  >
                    기억했어요
                  </button>
                </div>
              </details>
            )}
          </article>
        ))
      )}
    </>
  );
}
function GoalForm({
  pack,
  act,
  today,
}: {
  pack: PublicPack;
  act: RunAction;
  today: string;
}) {
  const [examDate, setDate] = useState(pack.goal?.examDate || "");
  const [dailyMinutes, setMinutes] = useState(pack.goal?.dailyMinutes || 20);
  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault();
        void act("goals", { packId: pack.id, examDate, dailyMinutes });
      }}
    >
      <h2>{pack.title}</h2>
      <div className="form-grid">
        <label>
          시험 날짜 (선택)
          <input
            type="date"
            min={today}
            value={examDate}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          하루 공부 시간 (분)
          <input
            required
            type="number"
            min={5}
            max={480}
            value={dailyMinutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
          />
        </label>
      </div>
      <button className="button primary">
        학습 목표 저장
        <Check size={16} />
      </button>
    </form>
  );
}
export function Plans({
  data,
  act,
  open,
}: {
  data: Bootstrap;
  act: RunAction;
  open: (id: string) => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">내 속도에 맞춘 공부</p>
          <h1>학습 계획</h1>
          <p>시험일과 하루 공부 시간을 정하면 오늘의 분량을 제안합니다.</p>
        </div>
        <CalendarDays size={28} />
      </div>
      {!data.packs.length && (
        <div className="empty panel">
          <h2>학습팩을 저장하면 목표를 세울 수 있어요</h2>
        </div>
      )}
      {data.packs.map((pack) => {
        const days = pack.goal?.examDate
          ? Math.max(
              1,
              Math.ceil(
                (Date.parse(pack.goal.examDate) - Date.parse(data.today)) /
                  86400000,
              ) + 1,
            )
          : null;
        const capacity = Math.max(
          1,
          Math.floor((pack.goal?.dailyMinutes || 20) / 10),
        );
        const ranked = [...pack.concepts].sort((a, b) => {
          const rank = (id: string) =>
            data.summary.concepts.find(
              (c) => c.packId === pack.id && c.conceptId === id,
            )?.status === "집중 복습"
              ? 0
              : !pack.studied.includes(id)
                ? 1
                : 2;
          return rank(a.id) - rank(b.id);
        });
        const remaining = pack.concepts.filter(
          (c) => !pack.studied.includes(c.id),
        ).length;
        const needed = days ? Math.ceil(remaining / days) : 1;
        return (
          <div key={pack.id}>
            <GoalForm
              key={`${pack.id}-${pack.goal?.examDate}-${pack.goal?.dailyMinutes}`}
              pack={pack}
              act={act}
              today={data.today}
            />
            <section className="panel plan-suggestion">
              <span className="tag">
                {days ? `시험일까지 ${days - 1}일` : "시험일 미정"}
              </span>
              <h2>
                오늘은{" "}
                {Math.min(capacity, Math.max(1, needed), pack.concepts.length)}
                개 개념부터
              </h2>
              <p>
                개념당 약 10분을 기준으로, 취약 개념과 아직 읽지 않은 개념을
                먼저 배정합니다.
              </p>
              <ul>
                {ranked
                  .slice(0, Math.min(capacity, Math.max(1, needed)))
                  .map((c) => (
                    <li key={c.id}>{c.title}</li>
                  ))}
              </ul>
              {needed > capacity && (
                <p className="notice">
                  현재 시간으로는 남은 개념을 시험일까지 모두 읽기 어려워요.
                  공부 시간이나 시험 목표를 조정해 보세요.
                </p>
              )}
              <button
                className="button secondary"
                onClick={() => open(pack.id)}
              >
                계획대로 학습하기
                <ArrowRight size={16} />
              </button>
            </section>
          </div>
        );
      })}
    </>
  );
}
export function Stats({
  data,
  resume,
}: {
  data: Bootstrap;
  resume: (run: RunView) => void;
}) {
  const [error, setError] = useState("");
  const s = data.summary;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">기록이 보여 주는 나의 공부</p>
          <h1>학습 현황</h1>
          <p>풀이 기록과 최근 10번의 개념별 답안을 기준으로 계산합니다.</p>
        </div>
      </div>
      <div className="stats-grid">
        <div className="stat">
          <span>누적 풀이</span>
          <strong>
            {s.answered}
            <small>문항</small>
          </strong>
        </div>
        <div className="stat">
          <span>정답률</span>
          <strong>
            {s.answered ? Math.round((s.correct / s.answered) * 100) : "—"}
            <small>%</small>
          </strong>
        </div>
        <div className="stat">
          <span>완료한 학습</span>
          <strong>
            {s.sessions}
            <small>회</small>
          </strong>
        </div>
      </div>
      <section className="panel">
        <h2>개념별 이해도</h2>
        {!s.concepts.length && (
          <p className="muted">저장한 학습팩의 개념이 여기에 표시됩니다.</p>
        )}
        {s.concepts.map((c) => (
          <div className="concept-stat" key={`${c.packId}-${c.conceptId}`}>
            <div className="section-heading">
              <strong>{c.title}</strong>
              <span className="tag neutral">{c.status}</span>
            </div>
            <progress
              aria-label={`${c.title} 정답률`}
              max={100}
              value={c.accuracy || 0}
            />
            <p className="muted">
              최근 {c.count}회 · 정답률{" "}
              {c.accuracy === null ? "기록 없음" : `${c.accuracy}%`}
            </p>
          </div>
        ))}
      </section>
      <section className="panel">
        <h2>최근 학습 기록</h2>
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        {!s.history.length && (
          <p className="muted">첫 퀴즈를 완료하면 학습 기록이 쌓입니다.</p>
        )}
        {s.history.map((h) => (
          <div className="history-row" key={h.id}>
            <div>
              <strong>{h.title}</strong>
              <p className="muted">
                {new Date(h.date).toLocaleString("ko-KR", {
                  timeZone: "Asia/Seoul",
                })}{" "}
                · v{h.version} ·{" "}
                {h.mode === "exam"
                  ? "모의고사"
                  : h.mode === "review"
                    ? "복습"
                    : "퀴즈"}
              </p>
            </div>
            <span>
              {h.correct}/{h.total} 정답
            </span>
            <button
              className="button secondary"
              onClick={() =>
                void api<RunView>(`runs/${h.id}`)
                  .then(resume)
                  .catch((e) => setError(e.message))
              }
            >
              결과 보기
            </button>
          </div>
        ))}
      </section>
      <p className="muted">
        학습 보조 지표이며 실제 능력이나 합격 가능성을 진단하지 않습니다.
      </p>
    </>
  );
}
