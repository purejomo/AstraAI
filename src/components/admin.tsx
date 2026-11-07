"use client";
import { useState } from "react";
import { ArrowRight, FileJson, Upload, Check, Copy, Plus } from "lucide-react";
import type { AdminPack, StudyPack } from "@/lib/types";
import { api } from "./api-client";
export default function Admin({
  packs,
  refresh,
}: {
  packs: AdminPack[];
  refresh: () => Promise<void>;
}) {
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<StudyPack | null>(null);
  const [packId, setPackId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("");
  const [count, setCount] = useState(30);
  const [prompt, setPrompt] = useState("");
  const [access, setAccess] = useState(["learner-1", "learner-2", "learner-3"]);
  const [approved, setApproved] = useState(false);
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
  function changeRaw(value: string) {
    setRaw(value);
    setPreview(null);
    setApproved(false);
    setNotice("");
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">콘텐츠 관리</p>
          <h1>학습팩 만들기</h1>
          <p>자료를 문제로, 문제를 함께하는 학습으로.</p>
        </div>
        <span className="tag">관리자 전용</span>
      </div>
      <div className="steps">
        <span>
          <b>01</b> 프롬프트 준비
        </span>
        <ArrowRight size={16} />
        <span>
          <b>02</b> JSON 검수
        </span>
        <ArrowRight size={16} />
        <span>
          <b>03</b> 학습자에게 게시
        </span>
      </div>
      {error && (
        <div role="alert" className="notice error">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="notice success">
          {notice}
        </div>
      )}
      <details className="panel prompt-panel">
        <summary>01 · ChatGPT에 사용할 프롬프트 만들기</summary>
        <p>
          원본 PDF·이미지는 관리자 본인의 ChatGPT 대화에 직접 첨부하세요. 앱에서
          자료를 자동 전송하지 않습니다.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void perform(async () =>
              setPrompt(
                (
                  await api<{ prompt: string }>("admin/prompt", {
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
              학습팩 제목
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
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">02 · 문제은행 등록</p>
            <h2>JSON 가져오기</h2>
          </div>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() =>
              void perform(async () =>
                changeRaw(JSON.stringify(await api("admin/sample"), null, 2)),
              )
            }
          >
            <FileJson size={16} />
            샘플 불러오기
          </button>
        </div>
        <label className="upload">
          <Upload size={28} />
          <strong>study-pack.json 파일 선택</strong>
          <span>UTF-8 JSON · 최대 5MB · 최대 500문항</span>
          <input
            aria-label="학습팩 JSON 파일"
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file)
                void perform(async () => {
                  if (file.size > 5 * 1024 * 1024)
                    throw new Error("파일은 5MB 이하여야 합니다.");
                  try {
                    changeRaw(
                      new TextDecoder("utf-8", { fatal: true }).decode(
                        await file.arrayBuffer(),
                      ),
                    );
                  } catch {
                    throw new Error(
                      "UTF-8로 저장된 JSON 파일을 선택해 주세요.",
                    );
                  }
                });
            }}
          />
        </label>
        <label>
          또는 JSON 붙여 넣기
          <textarea
            className="code-input"
            rows={7}
            value={raw}
            onChange={(e) => changeRaw(e.target.value)}
            spellCheck={false}
            placeholder={'{ "schema_version": "1.0", ... }'}
          />
        </label>
        <div className="form-grid">
          <label>
            등록 대상
            <select value={packId} onChange={(e) => setPackId(e.target.value)}>
              <option value="">새 학습팩</option>
              {packs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} · 새 개정본
                </option>
              ))}
            </select>
          </label>
          <div className="form-action">
            <button
              className="button primary"
              disabled={busy || !raw}
              onClick={() =>
                void perform(async () => {
                  setPreview(
                    (await api<{ data: StudyPack }>("admin/preview", { raw }))
                      .data,
                  );
                  setApproved(false);
                })
              }
            >
              검증하고 미리보기
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>
      {preview && (
        <section className="panel preview">
          <div className="section-heading">
            <div>
              <span className="tag">
                <Check size={14} />
                구조 검증 통과
              </span>
              <h2>{preview.title}</h2>
              <p>{preview.description}</p>
            </div>
            <span>
              {preview.questions.length}문항 · {preview.concepts.length}개념 ·{" "}
              {preview.flashcards.length}카드
            </span>
          </div>
          <p className="muted">
            AI 생성 연습문제입니다. 정답의 정확성, 보기의 의미 중복, 실제 출처는
            직접 검수해 주세요.
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
            내용과 정답을 검수했습니다.
          </label>
          <button
            className="button primary"
            disabled={busy || !approved}
            onClick={() =>
              void perform(async () => {
                await api("admin/import", { raw, packId: packId || undefined });
                setPreview(null);
                setRaw("");
                setApproved(false);
                await refresh();
                setNotice(
                  "초안을 저장했습니다. 아래 목록에서 공유 대상을 확인하고 게시하세요.",
                );
              })
            }
          >
            <Plus size={16} />
            검수한 초안 저장
          </button>
        </section>
      )}
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">03 · 게시 관리</p>
            <h2>등록한 학습팩</h2>
          </div>
          <span className="muted">{packs.length}개</span>
        </div>
        <fieldset className="share-options">
          <legend>게시할 학습자 선택</legend>
          {["learner-1", "learner-2", "learner-3"].map((id, i) => (
            <label className="check-label" key={id}>
              <input
                type="checkbox"
                checked={access.includes(id)}
                onChange={(e) =>
                  setAccess(
                    e.target.checked
                      ? [...access, id]
                      : access.filter((a) => a !== id),
                  )
                }
              />
              학습자 {i + 1}
            </label>
          ))}
        </fieldset>
        {!packs.length && (
          <div className="empty">
            <FileJson size={32} />
            <h3>첫 학습팩을 등록해 보세요</h3>
            <p>검수한 초안은 게시하기 전까지 학습자에게 보이지 않습니다.</p>
          </div>
        )}
        {packs.map((p) => (
          <article className="managed-pack" key={p.id}>
            <div>
              <span className={`tag ${p.publishedId ? "" : "neutral"}`}>
                {p.publishedId ? "게시 중" : "비공개"}
              </span>
              <h3>{p.title}</h3>
              <p className="muted">
                {p.revisions.length}개 개정본 · 현재 공유{" "}
                {p.publishedId ? p.access.length : 0}명
              </p>
            </div>
            <div className="actions">
              {p.publishedId && (
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    void perform(async () => {
                      await api("admin/publish", {
                        packId: p.id,
                        revisionId: null,
                      });
                      await refresh();
                      setNotice("학습팩을 비공개로 전환했습니다.");
                    })
                  }
                >
                  비공개 전환
                </button>
              )}
              <button
                className="button primary"
                disabled={busy || !access.length}
                onClick={() =>
                  void perform(async () => {
                    await api("admin/publish", {
                      packId: p.id,
                      revisionId: p.revisions.at(-1)!.id,
                      access,
                    });
                    await refresh();
                    setNotice(
                      `${access.length}명에게 최신 개정본을 게시했습니다.`,
                    );
                  })
                }
              >
                v{p.revisions.at(-1)!.version} · {access.length}명에게 게시
                <ArrowRight size={16} />
              </button>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
