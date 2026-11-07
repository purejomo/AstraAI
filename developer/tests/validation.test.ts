import { describe, expect, it } from "vitest";
import sample from "../examples/sample-study-pack.json";
import { MAX_BYTES, parsePack } from "../src/lib/validation";
describe("study-pack import contract", () => {
  it("accepts the repository sample", () =>
    expect(parsePack(JSON.stringify(sample))).toEqual(sample));
  const cases: [string, (p: typeof sample) => unknown][] = [
    ["wrong schema version", (p) => (p.schema_version = "2.0")],
    ["missing title", (p) => Reflect.deleteProperty(p, "title")],
    ["duplicate IDs", (p) => p.questions.push({ ...p.questions[0] })],
    [
      "cross-array duplicate IDs",
      (p) => (p.flashcards[0].id = p.concepts[0].id),
    ],
    [
      "missing question concept",
      (p) => (p.questions[0].concept_id = "missing"),
    ],
    ["missing card concept", (p) => (p.flashcards[0].concept_id = "missing")],
    ["three choices", (p) => p.questions[0].choices.pop()],
    ["five choices", (p) => p.questions[0].choices.push("extra")],
    ["answer out of range", (p) => (p.questions[0].answer_index = 4)],
    ["negative answer", (p) => (p.questions[0].answer_index = -1)],
    [
      "duplicate choices",
      (p) => (p.questions[0].choices[1] = p.questions[0].choices[0]),
    ],
    ["whitespace choice", (p) => (p.questions[0].choices[1] = "   ")],
    [
      "normalized duplicate choices",
      (p) =>
        (p.questions[0].choices[1] = "  " + p.questions[0].choices[0] + "  "),
    ],
    [
      "unknown source file",
      (p) =>
        (p.questions[0].source_refs as unknown[]).push({
          file: "unknown.pdf",
          page: 1,
        }),
    ],
    ["empty concepts", (p) => (p.concepts = [])],
    [
      "501 questions",
      (p) =>
        (p.questions = Array.from({ length: 501 }, (_, i) => ({
          ...p.questions[0],
          id: `q${i}`,
        }))),
    ],
    ["additional properties", (p) => Object.assign(p, { unexpected: true })],
    ["invalid difficulty", (p) => (p.questions[0].difficulty = "extreme")],
    ["blank title", (p) => (p.title = "  ")],
    ["empty ID", (p) => (p.flashcards[0].id = "")],
  ];
  it.each(cases)("rejects %s", (_, mutate) => {
    const data = structuredClone(sample);
    mutate(data);
    expect(() => parsePack(JSON.stringify(data))).toThrow();
  });
  it.each(["{broken", "```json\n{}\n```", "[]", "null"])(
    "rejects malformed/non-object JSON %s",
    (raw) => expect(() => parsePack(raw)).toThrow(),
  );
  it("enforces bytes before parsing", () =>
    expect(() => parsePack("가".repeat(Math.ceil(MAX_BYTES / 3)))).toThrow(
      "5MB",
    ));
});
