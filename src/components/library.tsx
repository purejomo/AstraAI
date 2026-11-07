"use client";
import { useState } from "react";
import {
  ArrowRight,
  Copy,
  Download,
  FileJson,
  Pencil,
  Plus,
  Upload,
} from "lucide-react";
import type { LibraryPack, StudyPack } from "@/lib/types";
import { api } from "./api-client";
import PackEditor, { blankPack } from "./pack-editor";
type Draft = { data: StudyPack; packId?: string; baseRevisionId?: string };
const draftKey = "astra-personal-draft-v1";
function restoredDraft(): Draft | null {
  try {
    const draft = JSON.parse(
      localStorage.getItem(draftKey) || "null",
    ) as Draft | null;
    // Incomplete text is allowed, but never trust an unrelated browser-storage shape.
    if (
      !draft ||
      typeof draft.data.title !== "string" ||
      !draft.data.concepts.length ||
      !draft.data.questions.length ||
      !draft.data.concepts.every(
        (c) =>
          typeof c.title === "string" &&
          Array.isArray(c.key_points) &&
          Array.isArray(c.faqs),
      ) ||
      !draft.data.questions.every(
        (q) =>
          typeof q.question === "string" &&
          q.choices.length === 4 &&
          Array.isArray(q.source_refs),
      ) ||
      !Array.isArray(draft.data.flashcards)
    )
      return null;
    return draft;
  } catch {
    return null;
  }
}
function download(data: StudyPack) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json;charset=utf-8",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "study-pack.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function prepared(data: StudyPack): StudyPack {
  return {
    ...data,
    source_documents: (data.source_documents || [])
      .map((s) => s.trim())
      .filter(Boolean),
    concepts: data.concepts.map((c) => ({
      ...c,
      key_points: c.key_points.map((s) => s.trim()).filter(Boolean),
    })),
  };
}
export default function Library({
  packs,
  refresh,
  open,
}: {
  packs: LibraryPack[];
  refresh: () => Promise<void>;
  open: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(restoredDraft);
  const [preview, setPreview] = useState<StudyPack | null>(null);
  const [approved, setApproved] = useState(false);
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [storageError, setStorageError] = useState("");
  const [savedId, setSavedId] = useState("");
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("");
  const [count, setCount] = useState(30);
  const [prompt, setPrompt] = useState("");
  async function perform(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function update(next: Draft | null) {
    setDraft(next);
    setPreview(null);
    setApproved(false);
    setNotice("");
    setSavedId("");
    setError("");
    try {
      if (next) localStorage.setItem(draftKey, JSON.stringify(next));
      else localStorage.removeItem(draftKey);
      setStorageError("");
    } catch {
      setStorageError(
        "브라우저 임시 저장에 실패했습니다. 화면을 떠나기 전에 JSON을 내려받아 보관하세요.",
      );
    }
  }
  function revealEditor() {
    requestAnimationFrame(() =>
      document
        .querySelector(".editor-heading")
        ?.scrollIntoView({ behavior: "instant", block: "start" }),
    );
  }
  function canReplace() {
    return (
      !draft ||
      window.confirm(
        "작성 중인 내용을 바꿀까요? 보관하려면 취소 후 JSON을 내려받으세요.",
      )
    );
  }
  async function importRaw(value: string) {
    const result = await api<{ data: StudyPack }>("library/preview", {
      raw: value,
    });
    if (!canReplace()) return;
    update({ data: result.data });
    setPreview(result.data);
    setRaw("");
    setNotice(
      "JSON 검증을 통과했습니다. 내용을 확인하거나 수정한 뒤 저장하세요.",
    );
  }
  return (
    <div className="library-view">
      <div className="page-heading">
        <div>
          <p className="eyebrow">내 자료로, 내 속도로</p>
          <h1>나의 문제은행</h1>
          <p>개념과 문제를 직접 만들고, 바로 공부하세요.</p>
        </div>
        <span className="heading-icon">
          <Pencil size={26} />
        </span>
      </div>
      {error && (
        <div role="alert" className="notice error">
          {error}
        </div>
      )}
      {storageError && (
        <div role="alert" className="notice error">
          {storageError}
        </div>
      )}
      {notice && (
        <div role="status" className="notice success">
          {notice}
          {savedId && (
            <button className="button primary" onClick={() => open(savedId)}>
              바로 학습하기
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      )}
      <section className="author-start panel">
        <div>
          <p className="eyebrow">나만의 학습 자료</p>
          <h2>한 문제부터 시작해요.</h2>
          <p>
            JSON을 몰라도 만들 수 있습니다.
            <br />
            개념 한 개와 문제 한 개면 충분해요.
          </p>
        </div>
        <div className="actions">
          <button
            className="button primary"
            disabled={busy}
            onClick={() => {
              if (canReplace()) {
                update({ data: blankPack() });
                revealEditor();
              }
            }}
          >
            <Plus size={17} />새 학습팩 만들기
          </button>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() =>
              void perform(async () =>
                importRaw(JSON.stringify(await api("library/sample"))),
              )
            }
          >
            <FileJson size={17} />
            샘플로 시작하기
          </button>
        </div>
      </section>
      <details className="panel import-panel">
        <summary>JSON 파일로 가져오기</summary>
        <p>
          다른 설치본에서 내보낸 파일이나 직접 준비한 학습팩을 가져오세요. 최대
          5MB·500문항입니다.
        </p>
        <label className="upload">
          <Upload size={26} />
          <strong>study-pack.json 파일 선택</strong>
          <input
            aria-label="학습팩 JSON 파일"
            type="file"
            accept=".json,application/json"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file)
                void perform(async () => {
                  if (file.size > 5 * 1024 * 1024)
                    throw new Error("파일은 5MB 이하여야 합니다.");
                  let value: string;
                  try {
                    value = new TextDecoder("utf-8", { fatal: true }).decode(
                      await file.arrayBuffer(),
                    );
                  } catch {
                    throw new Error(
                      "UTF-8로 저장된 JSON 파일을 선택해 주세요.",
                    );
                  }
                  await importRaw(value);
                });
            }}
          />
        </label>
        <label>
          JSON 내용
          <textarea
            rows={6}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            spellCheck={false}
            placeholder="JSON 객체를 붙여 넣어도 됩니다."
          />
        </label>
        <button
          className="button secondary"
          disabled={busy || !raw.trim()}
          onClick={() => void perform(() => importRaw(raw))}
        >
          JSON 검증하고 가져오기
        </button>
      </details>
      <details className="panel prompt-panel">
        <summary>ChatGPT에 사용할 프롬프트 만들기</summary>
        <p>
          원본 PDF·이미지는 본인의 ChatGPT 대화에 직접 첨부하세요. 앱에서 자료를
          자동 전송하지 않습니다.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void perform(async () =>
              setPrompt(
                (
                  await api<{ prompt: string }>("library/prompt", {
                    title,
                    level,
                    count,
                  })
                ).prompt,
              ),
            );
          }}
        >
          <div className="form-grid">
            <label>
              프롬프트용 학습팩 제목
              <input
                required
                maxLength={150}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 운영체제 중간고사"
              />
            </label>
            <label>
              학습 목표와 수준
              <input
                required
                maxLength={500}
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder="예: 대학 2학년, 기본 개념 복습"
              />
            </label>
            <label>
              문항 수
              <input
                type="number"
                min={1}
                max={500}
                required
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </label>
          </div>
          <button className="button secondary" disabled={busy}>
            프롬프트 생성
          </button>
        </form>
        {prompt && (
          <>
            <label>
              생성된 프롬프트
              <textarea rows={9} value={prompt} readOnly />
            </label>
            <button
              className="button secondary"
              onClick={() =>
                void perform(async () => {
                  await navigator.clipboard.writeText(prompt);
                  setNotice("프롬프트를 복사했습니다.");
                })
              }
            >
              <Copy size={16} />
              프롬프트 복사
            </button>
          </>
        )}
      </details>
      {draft && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void perform(async () => {
              const result = await api<{ data: StudyPack }>("library/preview", {
                raw: JSON.stringify(prepared(draft.data)),
              });
              setPreview(result.data);
              setApproved(false);
              setNotice(
                "형식 검증을 통과했습니다. 아래 미리보기에서 정답과 해설을 확인하세요.",
              );
              requestAnimationFrame(() =>
                document
                  .getElementById("pack-preview")
                  ?.scrollIntoView({ behavior: "instant", block: "start" }),
              );
            });
          }}
        >
          <div className="editor-heading">
            <div>
              <h2>{draft.packId ? "학습팩 수정" : "새 학습팩 작성"}</h2>
              <p className="muted">
                {storageError
                  ? "작성 중"
                  : "이 브라우저에 작성 중인 내용 임시 보관"}{" "}
                · 정식 저장은 검수 후에 이루어집니다.
              </p>
            </div>
            <button
              type="button"
              className="button secondary"
              onClick={() => download(prepared(draft.data))}
            >
              <Download size={16} />
              작성 중 JSON 내려받기
            </button>
          </div>
          <fieldset className="editor-form" disabled={busy}>
            <PackEditor
              key={draft.packId || "new"}
              data={draft.data}
              change={(data) => update({ ...draft, data })}
            />
          </fieldset>
          <div className="editor-submit">
            <p>
              저장한 수정본은 이전 풀이·정답·복습 기록에 영향을 주지 않습니다.
            </p>
            <button className="button primary" disabled={busy}>
              검증하고 미리보기
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      )}
      {draft && preview && (
        <section className="panel preview-panel" id="pack-preview">
          <p className="eyebrow">마지막 확인</p>
          <h2>저장 전 미리보기</h2>
          <h3>{preview.title}</h3>
          <p>
            {preview.concepts.length}개념 · {preview.questions.length}문항 ·{" "}
            {preview.flashcards.length}카드
          </p>
          {preview.questions.map((q, i) => (
            <details key={q.id}>
              <summary>
                {i + 1}. {q.question}
              </summary>
              <ol>
                {q.choices.map((c, j) => (
                  <li key={j}>
                    {c}
                    {j === q.answer_index && <strong> · 정답</strong>}
                  </li>
                ))}
              </ol>
              <p>{q.explanation}</p>
              <p className="muted">
                {q.source_refs.length
                  ? q.source_refs
                      .map((s) => `${s.file} ${s.page ?? "?"}쪽`)
                      .join(", ")
                  : "출처 미확인"}
              </p>
            </details>
          ))}
          <label className="check-label">
            <input
              type="checkbox"
              checked={approved}
              onChange={(e) => setApproved(e.target.checked)}
            />
            내용과 정답을 확인했습니다.
          </label>
          <button
            className="button primary"
            disabled={busy || !approved}
            onClick={() =>
              void perform(async () => {
                const result = await api<{ packId: string }>("library/save", {
                  raw: JSON.stringify(preview),
                  packId: draft.packId,
                  baseRevisionId: draft.baseRevisionId,
                });
                update(null);
                setSavedId(result.packId);
                setNotice(
                  "내 학습팩에 저장했습니다. 바로 문제를 풀 수 있어요.",
                );
                await refresh();
                window.scrollTo({ top: 0 });
              })
            }
          >
            내 학습팩에 저장
            <ArrowRight size={16} />
          </button>
        </section>
      )}
      <section className="panel">
        <div className="section-heading">
          <h2>내가 만든 학습팩</h2>
          <span className="muted">{packs.length}개</span>
        </div>
        {!packs.length && (
          <div className="empty">
            <FileJson size={32} />
            <h3>아직 만든 학습팩이 없어요</h3>
            <p>위에서 직접 작성하거나 샘플·JSON으로 시작해 보세요.</p>
          </div>
        )}
        {packs.map((p) => (
          <article className="managed-pack" key={p.id}>
            <div>
              <span className="tag">v{p.revisions.at(-1)!.version}</span>
              <h3>{p.title}</h3>
              <p className="muted">
                {p.revisions.at(-1)!.questionCount}문항 · {p.revisions.length}개
                저장본
              </p>
            </div>
            <div className="actions">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  if (canReplace())
                    void perform(async () => {
                      update(await api<Draft>(`library/packs/${p.id}`));
                      revealEditor();
                    });
                }}
              >
                <Pencil size={16} />
                수정하기
              </button>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  void perform(async () =>
                    download((await api<Draft>(`library/packs/${p.id}`)).data),
                  )
                }
              >
                <Download size={16} />
                JSON 내보내기
              </button>
              <button className="button primary" onClick={() => open(p.id)}>
                학습하기
                <ArrowRight size={16} />
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
