"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  FileJson,
  Upload,
} from "lucide-react";
import type { StudyPack } from "@/lib/types";
import { api } from "./api-client";

type Flow = {
  step: number;
  title: string;
  level: string;
  count: string;
  prompt: string;
};
const storageKey = "astra-pack-flow-v1";
const initial: Flow = {
  step: 0,
  title: "",
  level: "",
  count: "30",
  prompt: "",
};
const stages = [
  "조건 입력",
  "프롬프트 복사",
  "GPT에서 생성",
  "JSON 가져오기",
  "확인·저장",
];
function restore(): Flow {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (
      value &&
      ["title", "level", "count", "prompt"].every(
        (key) => typeof value[key] === "string",
      ) &&
      Number.isInteger(value.step) &&
      value.step >= 0 &&
      value.step <= 3
    ) {
      return {
        ...initial,
        title: value.title.slice(0, 150),
        level: value.level.slice(0, 500),
        count: value.count.slice(0, 10),
        prompt: value.prompt,
        step:
          value.step > 0 && value.step < 3 && !value.prompt ? 0 : value.step,
      };
    }
  } catch {
    /* A missing or damaged draft must not prevent opening the app. */
  }
  return initial;
}
export default function Library({
  refresh,
  open,
}: {
  refresh: () => Promise<void>;
  open: (id: string) => void;
}) {
  const [flow, setFlow] = useState<Flow>(restore);
  const [preview, setPreview] = useState<StudyPack | null>(null);
  const [question, setQuestion] = useState(0);
  const [approved, setApproved] = useState(false);
  const [savedId, setSavedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [manualCopy, setManualCopy] = useState(false);
  const working = useRef(false);
  const alive = useRef(true);
  const heading = useRef<HTMLHeadingElement>(null);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    (flow.step === 4 ? questionHeading.current : heading.current)?.focus({
      preventScroll: true,
    });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [flow.step, question]);
  function change(next: Flow) {
    setFlow(next);
    setError("");
    try {
      if (next.step === 5) localStorage.removeItem(storageKey);
      // The user's downloaded file remains the source for an unfinished import.
      else
        localStorage.setItem(
          storageKey,
          JSON.stringify({ ...next, step: Math.min(next.step, 3) }),
        );
      setStorageError("");
    } catch {
      setStorageError(
        "진행 상태를 임시 보관하지 못했습니다. 앱을 닫으면 이 단계를 다시 진행해야 합니다.",
      );
    }
  }
  function go(step: number) {
    setApproved(false);
    change({ ...flow, step });
  }
  async function perform<T>(work: () => Promise<T>, done: (result: T) => void) {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await work();
      if (alive.current) done(result);
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "다시 시도해 주세요.");
    } finally {
      working.current = false;
      if (alive.current) setBusy(false);
    }
  }
  function copyPrompt() {
    void perform(
      async () => {
        try {
          await navigator.clipboard.writeText(flow.prompt);
          return true;
        } catch {
          return false;
        }
      },
      (copied) => {
        setManualCopy(!copied);
        if (copied) go(2);
      },
    );
  }
  const current = preview?.questions[question];
  const titles = [
    "어떤 문제를 만들까요?",
    "프롬프트를 복사하세요",
    "ChatGPT에 자료와 함께 보내세요",
    "받은 JSON 파일을 가져오세요",
    "문제와 정답을 확인하세요",
    "학습팩을 저장했어요",
  ];
  return (
    <div className="pack-wizard" aria-busy={busy}>
      <div className="wizard-progress" aria-label="학습팩 만들기 진행">
        <span>{flow.step === 5 ? "완료" : `${flow.step + 1} / 5`}</span>
        <span>{flow.step === 5 ? "학습 준비 완료" : stages[flow.step]}</span>
        <progress
          value={Math.min(flow.step + 1, 5)}
          max={5}
          aria-label="진행 단계"
        />
      </div>
      <section className="wizard-sheet">
        <header className="wizard-heading">
          <p className="eyebrow">학습팩 만들기</p>
          <h1 ref={heading} tabIndex={-1}>
            {titles[flow.step]}
          </h1>
        </header>
        {storageError && (
          <p className="notice error" role="alert">
            {storageError}
          </p>
        )}
        {error && (
          <div className="notice error" role="alert">
            {flow.step === 3 && (
              <p>
                ChatGPT에 아래 오류를 알려 주고 JSON 파일을 다시 만들어 달라고
                요청하세요.
              </p>
            )}
            <p className="wizard-error-detail">{error}</p>
          </div>
        )}
        {flow.step === 0 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void perform(
                () =>
                  api<{ prompt: string }>("library/prompt", {
                    title: flow.title,
                    level: flow.level,
                    count: Number(flow.count),
                  }),
                (result) => change({ ...flow, prompt: result.prompt, step: 1 }),
              );
            }}
          >
            <p className="wizard-description">
              아래 조건으로 GPT에 보낼 프롬프트를 준비합니다.
            </p>
            <fieldset disabled={busy} className="wizard-fields">
              <label>
                학습팩 제목
                <input
                  required
                  maxLength={150}
                  value={flow.title}
                  onChange={(e) =>
                    change({ ...flow, title: e.target.value, prompt: "" })
                  }
                  placeholder="예: 운영체제 중간고사"
                />
              </label>
              <label>
                학습 목표와 수준
                <input
                  required
                  maxLength={500}
                  value={flow.level}
                  onChange={(e) =>
                    change({ ...flow, level: e.target.value, prompt: "" })
                  }
                  placeholder="예: 대학 기초 개념을 문제로 복습"
                />
              </label>
              <label className="wizard-count">
                문항 수
                <input
                  type="number"
                  required
                  min={1}
                  max={500}
                  step={1}
                  value={flow.count}
                  onChange={(e) =>
                    change({ ...flow, count: e.target.value, prompt: "" })
                  }
                />
              </label>
            </fieldset>
            <div className="wizard-actions">
              <button className="button primary" disabled={busy}>
                {busy ? "준비 중…" : "프롬프트 만들기"}
                <ArrowRight size={17} />
              </button>
            </div>
            <button
              type="button"
              className="text-button wizard-shortcut"
              disabled={busy}
              onClick={() => go(3)}
            >
              이미 JSON 파일이 있어요
            </button>
          </form>
        )}
        {flow.step === 1 && (
          <>
            <p className="wizard-description">
              이 프롬프트는 GPT가 문제를 만들고 <strong>study-pack.json</strong>{" "}
              파일로 저장하도록 요청합니다.
            </p>
            <div className="prompt-summary">
              <FileJson size={26} aria-hidden="true" />
              <div>
                <strong>{flow.title}</strong>
                <p>
                  {Number(flow.count)}문항 · {flow.level}
                </p>
              </div>
            </div>
            <details className="wizard-prompt" open={manualCopy || undefined}>
              <summary>프롬프트 내용 보기</summary>
              <label>
                GPT에 보낼 프롬프트
                <textarea
                  readOnly
                  rows={7}
                  value={flow.prompt}
                  onFocus={(e) => e.target.select()}
                />
              </label>
            </details>
            {manualCopy && (
              <p role="status" className="notice">
                자동 복사가 안 됩니다. 위 내용을 선택해 복사한 뒤 아래 버튼을
                누르세요.
              </p>
            )}
            <div className="wizard-actions">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => go(0)}
              >
                <ArrowLeft size={16} />
                이전
              </button>
              <button
                className="button primary"
                disabled={busy}
                onClick={() => (manualCopy ? go(2) : void copyPrompt())}
              >
                <Copy size={17} />
                {manualCopy
                  ? "직접 복사했어요 · 다음"
                  : "프롬프트 복사하고 다음"}
              </button>
            </div>
          </>
        )}
        {flow.step === 2 && (
          <>
            <p className="wizard-description">
              ChatGPT에서 아래 순서대로 진행하세요. 파일을 받으면 이 앱으로
              돌아오면 됩니다.
            </p>
            <ol className="handoff-steps">
              <li>
                <strong>공부할 자료를 첨부하세요.</strong>
                <p>ChatGPT 대화에 PDF나 이미지를 넣으세요.</p>
              </li>
              <li>
                <strong>복사한 프롬프트를 붙여 넣고 보내세요.</strong>
                <p>첨부한 자료로 문제를 만들어 달라는 요청입니다.</p>
              </li>
              <li>
                <strong>study-pack.json을 내려받으세요.</strong>
                <p>GPT가 만든 문제 파일을 PC에 저장하세요.</p>
              </li>
            </ol>
            <a
              className="button primary gpt-link"
              href="https://chatgpt.com/"
              target="_blank"
              rel="noreferrer"
            >
              ChatGPT 열기
              <ExternalLink size={16} />
            </a>
            <p className="wizard-tip">
              파일이 보이지 않으면 GPT에 “study-pack.json 파일로 저장해서
              다운로드하게 해 줘”라고 요청하세요.
            </p>
            <div className="wizard-actions">
              <button className="text-button" onClick={() => go(1)}>
                <ArrowLeft size={16} />
                이전
              </button>
              <button className="button secondary" onClick={() => go(3)}>
                JSON 파일을 받았어요
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}
        {flow.step === 3 && (
          <>
            <p className="wizard-description">
              ChatGPT에서 내려받은 <strong>study-pack.json</strong>을
              선택하세요. 원본 PDF나 이미지가 아닌, 문제 JSON 파일을 가져오는
              단계입니다.
            </p>
            <label className="upload wizard-upload">
              <Upload size={30} aria-hidden="true" />
              <strong>JSON 파일 선택</strong>
              <span>최대 5MB · 500문항</span>
              <input
                aria-label="학습팩 JSON 파일"
                type="file"
                accept=".json,application/json"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setPreview(null);
                  setApproved(false);
                  void perform(
                    async () => {
                      if (file.size > 5 * 1024 * 1024)
                        throw new Error("파일은 5MB 이하여야 합니다.");
                      let raw: string;
                      try {
                        raw = new TextDecoder("utf-8", { fatal: true }).decode(
                          await file.arrayBuffer(),
                        );
                      } catch {
                        throw new Error(
                          "UTF-8로 저장된 JSON 파일을 선택해 주세요.",
                        );
                      }
                      return api<{ data: StudyPack }>("library/preview", {
                        raw,
                      });
                    },
                    ({ data }) => {
                      setPreview(data);
                      setQuestion(0);
                      go(4);
                    },
                  );
                }}
              />
            </label>
            {busy && <p role="status">파일의 문제 형식을 확인하고 있어요…</p>}
            <div className="wizard-actions">
              <button
                className="text-button"
                disabled={busy}
                onClick={() => go(flow.prompt ? 2 : 0)}
              >
                <ArrowLeft size={16} />
                이전
              </button>
            </div>
          </>
        )}
        {flow.step === 4 && preview && current && (
          <>
            <p className="wizard-description">
              {preview.title} · {preview.questions.length}문항
            </p>
            <article className="question-preview">
              <p className="eyebrow">
                문제 {question + 1} / {preview.questions.length}
              </p>
              <h2 ref={questionHeading} tabIndex={-1}>
                {current.question}
              </h2>
              <ol className="preview-choices">
                {current.choices.map((choice, index) => (
                  <li
                    key={index}
                    className={index === current.answer_index ? "correct" : ""}
                  >
                    <span>{index + 1}</span>
                    <div>
                      {choice}
                      {index === current.answer_index && <strong>정답</strong>}
                    </div>
                  </li>
                ))}
              </ol>
              <div className="preview-explanation">
                <h3>해설</h3>
                <p>{current.explanation}</p>
              </div>
              <p className="muted">
                {current.source_refs.length
                  ? current.source_refs
                      .map((s) => `${s.file}${s.page ? ` · ${s.page}쪽` : ""}`)
                      .join(", ")
                  : "출처를 확인하고 정답이 맞는지 살펴보세요."}
              </p>
            </article>
            {preview.questions.length > 1 && (
              <div className="question-pager" aria-label="문제 미리보기 이동">
                <button
                  className="button secondary"
                  disabled={busy || question === 0}
                  onClick={() => setQuestion(question - 1)}
                >
                  이전 문제
                </button>
                <span>
                  {question + 1} / {preview.questions.length}
                </span>
                <button
                  className="button secondary"
                  disabled={busy || question === preview.questions.length - 1}
                  onClick={() => setQuestion(question + 1)}
                >
                  다음 문제
                </button>
              </div>
            )}
            <label className="check-label">
              <input
                type="checkbox"
                checked={approved}
                disabled={busy}
                onChange={(e) => setApproved(e.target.checked)}
              />
              내용과 정답을 확인했습니다.
            </label>
            <div className="wizard-actions">
              <button
                className="text-button"
                disabled={busy}
                onClick={() => go(3)}
              >
                다른 JSON 파일 선택
              </button>
              <button
                className="button primary"
                disabled={busy || !approved}
                onClick={() =>
                  void perform(
                    () =>
                      api<{ packId: string }>("library/save", {
                        raw: JSON.stringify(preview),
                      }),
                    (result) => {
                      setSavedId(result.packId);
                      change({ ...flow, step: 5 });
                      void refresh().catch(() => {
                        if (alive.current)
                          setError(
                            "학습팩은 저장됐습니다. ‘바로 학습하기’를 눌러 목록을 다시 불러오세요.",
                          );
                      });
                    },
                  )
                }
              >
                {busy ? "저장 중…" : "학습팩 저장"}
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}
        {flow.step === 5 && (
          <>
            <span className="wizard-done-mark">
              <Check size={32} aria-hidden="true" />
            </span>
            <p className="wizard-description">
              <strong>{preview?.title}</strong>
              <br />
              이제 문제를 풀고, 틀린 문제를 복습할 수 있어요.
            </p>
            <div className="wizard-actions">
              <button
                className="button primary"
                disabled={busy}
                onClick={() => void perform(refresh, () => open(savedId))}
              >
                바로 학습하기
                <ArrowRight size={16} />
              </button>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => {
                  setPreview(null);
                  setSavedId("");
                  change(initial);
                }}
              >
                새 학습팩 만들기
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
