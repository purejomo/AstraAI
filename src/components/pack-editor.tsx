"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Concept, Flashcard, Question, StudyPack } from "@/lib/types";
const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const concept = (): Concept => ({
  id: id("c"),
  title: "",
  summary: "",
  key_points: [""],
  faqs: [],
});
const question = (conceptId: string): Question => ({
  id: id("q"),
  concept_id: conceptId,
  difficulty: "medium",
  type: "multiple_choice",
  question: "",
  choices: ["", "", "", ""],
  answer_index: 0,
  hint: "",
  explanation: "",
  wrong_feedback: "",
  source_refs: [],
});
export function blankPack(): StudyPack {
  const c = concept();
  return {
    schema_version: "1.0",
    title: "",
    description: "",
    source_documents: [],
    concepts: [c],
    questions: [question(c.id)],
    flashcards: [],
  };
}
export default function PackEditor({
  data,
  change,
}: {
  data: StudyPack;
  change: (data: StudyPack) => void;
}) {
  const [index, setIndex] = useState(0);
  const currentIndex = Math.min(index, data.questions.length - 1);
  const q = data.questions[currentIndex];
  const updateConcept = (i: number, patch: Partial<Concept>) =>
    change({
      ...data,
      concepts: data.concepts.map((c, j) => (i === j ? { ...c, ...patch } : c)),
    });
  const updateQuestion = (patch: Partial<Question>) =>
    change({
      ...data,
      questions: data.questions.map((c, j) =>
        currentIndex === j ? { ...c, ...patch } : c,
      ),
    });
  const updateCard = (i: number, patch: Partial<Flashcard>) =>
    change({
      ...data,
      flashcards: data.flashcards.map((c, j) =>
        i === j ? { ...c, ...patch } : c,
      ),
    });
  const options = data.concepts.map((c, i) => (
    <option key={c.id} value={c.id}>
      {c.title || `개념 ${i + 1}`}
    </option>
  ));
  return (
    <>
      <section className="panel editor-section">
        <p className="eyebrow">01 · 학습팩 소개</p>
        <h2>무엇을 공부하나요?</h2>
        <label>
          학습팩 제목
          <input
            required
            maxLength={150}
            value={data.title}
            onChange={(e) => change({ ...data, title: e.target.value })}
            placeholder="예: 운영체제 중간고사"
          />
        </label>
        <label>
          학습팩 설명
          <textarea
            rows={2}
            maxLength={2000}
            value={data.description}
            onChange={(e) => change({ ...data, description: e.target.value })}
            placeholder="공부할 범위와 목표를 적어 주세요."
          />
        </label>
      </section>
      <section className="panel editor-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">02 · 개념 정리</p>
            <h2>문제의 바탕이 되는 개념</h2>
          </div>
          <span className="tag">{data.concepts.length}개</span>
        </div>
        {data.concepts.map((c, i) => {
          const referenced =
            data.questions.some((q) => q.concept_id === c.id) ||
            data.flashcards.some((f) => f.concept_id === c.id);
          return (
            <details
              className="editor-item"
              key={c.id}
              open={data.concepts.length === 1 || undefined}
            >
              <summary>
                개념 {i + 1} · {c.title || "새 개념"}
              </summary>
              <div className="editor-fields">
                <label>
                  개념 {i + 1} 제목
                  <input
                    required
                    value={c.title}
                    onChange={(e) =>
                      updateConcept(i, { title: e.target.value })
                    }
                  />
                </label>
                <label>
                  개념 {i + 1} 요약
                  <textarea
                    required
                    rows={3}
                    value={c.summary}
                    onChange={(e) =>
                      updateConcept(i, { summary: e.target.value })
                    }
                  />
                </label>
                <label>
                  개념 {i + 1} 핵심 내용 · 한 줄에 하나
                  <textarea
                    required
                    rows={3}
                    value={c.key_points.join("\n")}
                    onChange={(e) =>
                      updateConcept(i, {
                        key_points: e.target.value.split("\n"),
                      })
                    }
                  />
                </label>
                {c.faqs.map((f, j) => (
                  <div className="form-grid" key={j}>
                    <label>
                      자주 묻는 질문 {j + 1}
                      <input
                        required
                        value={f.question}
                        onChange={(e) =>
                          updateConcept(i, {
                            faqs: c.faqs.map((a, k) =>
                              j === k ? { ...a, question: e.target.value } : a,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      답변 {j + 1}
                      <input
                        required
                        value={f.answer}
                        onChange={(e) =>
                          updateConcept(i, {
                            faqs: c.faqs.map((a, k) =>
                              j === k ? { ...a, answer: e.target.value } : a,
                            ),
                          })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() =>
                        updateConcept(i, {
                          faqs: c.faqs.filter((_, k) => j !== k),
                        })
                      }
                    >
                      질문 {j + 1} 삭제
                    </button>
                  </div>
                ))}
                <div className="actions">
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() =>
                      updateConcept(i, {
                        faqs: [...c.faqs, { question: "", answer: "" }],
                      })
                    }
                  >
                    자주 묻는 질문 추가
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    disabled={data.concepts.length === 1 || referenced}
                    onClick={() =>
                      change({
                        ...data,
                        concepts: data.concepts.filter((_, j) => i !== j),
                      })
                    }
                  >
                    <Trash2 size={16} />
                    개념 {i + 1} 삭제
                  </button>
                </div>
                {referenced && (
                  <p className="muted">
                    이 개념을 사용하는 문제·카드를 다른 개념으로 옮기면 삭제할
                    수 있습니다.
                  </p>
                )}
              </div>
            </details>
          );
        })}
        <button
          type="button"
          className="button secondary"
          onClick={() =>
            change({ ...data, concepts: [...data.concepts, concept()] })
          }
        >
          <Plus size={16} />
          개념 추가
        </button>
      </section>
      <section className="panel editor-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">03 · 문제 작성</p>
            <h2>직접 만드는 4지선다</h2>
          </div>
          <span className="tag">{data.questions.length} / 500문항</span>
        </div>
        <div className="question-toolbar">
          <label>
            편집할 문제
            <select
              value={currentIndex}
              onChange={(e) => setIndex(Number(e.target.value))}
            >
              {data.questions.map((q, i) => (
                <option key={q.id} value={i}>
                  {i + 1}. {q.question.slice(0, 50) || "새 문제"}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="button secondary"
            disabled={data.questions.length >= 500}
            onClick={() => {
              setIndex(data.questions.length);
              change({
                ...data,
                questions: [...data.questions, question(data.concepts[0].id)],
              });
            }}
          >
            <Plus size={16} />
            문제 추가
          </button>
        </div>
        <div className="editor-fields" key={q.id}>
          <div className="form-grid">
            <label>
              문제의 개념
              <select
                value={q.concept_id}
                onChange={(e) => updateQuestion({ concept_id: e.target.value })}
              >
                {options}
              </select>
            </label>
            <label>
              난이도
              <select
                value={q.difficulty}
                onChange={(e) =>
                  updateQuestion({
                    difficulty: e.target.value as Question["difficulty"],
                  })
                }
              >
                <option value="easy">기초</option>
                <option value="medium">보통</option>
                <option value="hard">심화</option>
              </select>
            </label>
          </div>
          <label>
            문제 내용
            <textarea
              required
              rows={3}
              value={q.question}
              onChange={(e) => updateQuestion({ question: e.target.value })}
              placeholder="확인하고 싶은 내용을 질문으로 적어 주세요."
            />
          </label>
          <fieldset className="choice-editor">
            <legend>보기 4개 · 정답 하나를 선택하세요</legend>
            {q.choices.map((c, i) => (
              <div
                className={`choice-editor-row ${q.answer_index === i ? "selected" : ""}`}
                key={i}
              >
                <label className="answer-choice">
                  <input
                    type="radio"
                    name="correct-answer"
                    checked={q.answer_index === i}
                    onChange={() => updateQuestion({ answer_index: i })}
                  />
                  {i + 1}번 정답
                </label>
                <label className="choice-input">
                  <span className="sr-only">보기 {i + 1}</span>
                  <input
                    required
                    value={c}
                    onChange={(e) =>
                      updateQuestion({
                        choices: q.choices.map((a, j) =>
                          i === j ? e.target.value : a,
                        ),
                      })
                    }
                    placeholder={`보기 ${i + 1}`}
                  />
                </label>
              </div>
            ))}
          </fieldset>
          <label>
            정답 해설
            <textarea
              required
              rows={3}
              value={q.explanation}
              onChange={(e) => updateQuestion({ explanation: e.target.value })}
              placeholder="왜 이 보기가 정답인지 설명해 주세요."
            />
          </label>
          <label>
            힌트
            <textarea
              required
              rows={2}
              value={q.hint}
              onChange={(e) => updateQuestion({ hint: e.target.value })}
              placeholder="답을 바로 알려주지 않는 단서"
            />
          </label>
          <label>
            오답 복습 안내
            <textarea
              required
              rows={2}
              value={q.wrong_feedback}
              onChange={(e) =>
                updateQuestion({ wrong_feedback: e.target.value })
              }
              placeholder="틀렸을 때 다시 확인할 내용"
            />
          </label>
          <details className="editor-item">
            <summary>자료 출처 · 선택 사항</summary>
            <div className="editor-fields">
              <label>
                원본 파일 이름 · 한 줄에 하나
                <textarea
                  rows={2}
                  value={(data.source_documents || []).join("\n")}
                  onChange={(e) =>
                    change({
                      ...data,
                      source_documents: e.target.value.split("\n"),
                    })
                  }
                />
              </label>
              <p className="muted">
                파일 자체는 업로드하지 않습니다. 근거를 확인한 파일명과 페이지만
                적으세요.
              </p>
              {q.source_refs.map((ref, i) => (
                <div className="form-grid" key={i}>
                  <label>
                    출처 {i + 1} 파일
                    <input
                      required
                      value={ref.file}
                      onChange={(e) =>
                        updateQuestion({
                          source_refs: q.source_refs.map((r, j) =>
                            i === j ? { ...r, file: e.target.value } : r,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    출처 {i + 1} 페이지
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={ref.page ?? ""}
                      onChange={(e) =>
                        updateQuestion({
                          source_refs: q.source_refs.map((r, j) =>
                            i === j
                              ? {
                                  ...r,
                                  page: e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                }
                              : r,
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      updateQuestion({
                        source_refs: q.source_refs.filter((_, j) => i !== j),
                      })
                    }
                  >
                    출처 {i + 1} 삭제
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="button secondary"
                onClick={() =>
                  updateQuestion({
                    source_refs: [
                      ...q.source_refs,
                      { file: data.source_documents?.[0] || "", page: null },
                    ],
                  })
                }
              >
                출처 추가
              </button>
            </div>
          </details>
          <button
            type="button"
            className="text-button"
            disabled={data.questions.length === 1}
            onClick={() => {
              change({
                ...data,
                questions: data.questions.filter((_, i) => i !== currentIndex),
              });
              setIndex(Math.max(0, currentIndex - 1));
            }}
          >
            <Trash2 size={16} />
            현재 문제 삭제
          </button>
        </div>
      </section>
      <section className="panel editor-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">04 · 기억 연습</p>
            <h2>
              플래시카드 <span className="muted">· 선택 사항</span>
            </h2>
          </div>
          <span className="tag">{data.flashcards.length}개</span>
        </div>
        {data.flashcards.map((f, i) => (
          <details
            key={f.id}
            className="editor-item"
            open={data.flashcards.length === 1 || undefined}
          >
            <summary>
              카드 {i + 1} · {f.front || "새 카드"}
            </summary>
            <div className="editor-fields">
              <label>
                카드 {i + 1} 개념
                <select
                  value={f.concept_id}
                  onChange={(e) =>
                    updateCard(i, { concept_id: e.target.value })
                  }
                >
                  {options}
                </select>
              </label>
              <label>
                카드 {i + 1} 앞면
                <textarea
                  required
                  rows={2}
                  value={f.front}
                  onChange={(e) => updateCard(i, { front: e.target.value })}
                />
              </label>
              <label>
                카드 {i + 1} 뒷면
                <textarea
                  required
                  rows={2}
                  value={f.back}
                  onChange={(e) => updateCard(i, { back: e.target.value })}
                />
              </label>
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  change({
                    ...data,
                    flashcards: data.flashcards.filter((_, j) => i !== j),
                  })
                }
              >
                카드 {i + 1} 삭제
              </button>
            </div>
          </details>
        ))}
        <button
          type="button"
          className="button secondary"
          onClick={() =>
            change({
              ...data,
              flashcards: [
                ...data.flashcards,
                {
                  id: id("f"),
                  concept_id: data.concepts[0].id,
                  front: "",
                  back: "",
                },
              ],
            })
          }
        >
          <Plus size={16} />
          카드 추가
        </button>
      </section>
    </>
  );
}
