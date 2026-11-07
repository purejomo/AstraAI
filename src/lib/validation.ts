import Ajv2020 from "ajv/dist/2020";
import schema from "../../schemas/study-pack.schema.json";
import type { StudyPack } from "./types";
const validate = new Ajv2020({ allErrors: true }).compile<StudyPack>(schema);
export const MAX_BYTES = 5 * 1024 * 1024;
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
    public details: string[] = [],
  ) {
    super(message);
  }
}
export function parsePack(raw: string): StudyPack {
  if (Buffer.byteLength(raw, "utf8") > MAX_BYTES)
    throw new AppError("파일은 5MB 이하여야 합니다.");
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new AppError(
      "JSON 문법을 확인해 주세요. 코드 블록 없이 JSON 객체만 입력하세요.",
    );
  }
  if (!validate(data))
    throw new AppError(
      "학습팩 형식이 올바르지 않습니다.",
      400,
      (validate.errors || [])
        .slice(0, 20)
        .map((e) => `${e.instancePath || "/"}: ${e.message}`),
    );
  const errors: string[] = [];
  if (data.questions.length > 500)
    errors.push("/questions: 문항은 최대 500개입니다.");
  const ids = new Set<string>();
  for (const key of ["concepts", "questions", "flashcards"] as const)
    for (const [i, item] of data[key].entries()) {
      if (!item.id.trim() || ids.has(item.id))
        errors.push(`/${key}/${i}/id: 비어 있거나 중복된 ID입니다.`);
      ids.add(item.id);
    }
  const concepts = new Set(data.concepts.map((c) => c.id));
  for (const key of ["questions", "flashcards"] as const)
    for (const [i, item] of data[key].entries())
      if (!concepts.has(item.concept_id))
        errors.push(`/${key}/${i}/concept_id: 존재하지 않는 개념입니다.`);
  for (const [i, q] of data.questions.entries()) {
    const choices = q.choices.map((c) =>
      c.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase(),
    );
    if (choices.some((c) => !c) || new Set(choices).size !== 4)
      errors.push(
        `/questions/${i}/choices: 서로 다른, 비어 있지 않은 보기 4개가 필요합니다.`,
      );
    if (q.source_refs.some((s) => !data.source_documents?.includes(s.file)))
      errors.push(
        `/questions/${i}/source_refs: 등록되지 않은 출처 파일입니다.`,
      );
  }
  if (!data.title.trim()) errors.push("/title: 제목이 비어 있습니다.");
  if (errors.length)
    throw new AppError(
      "학습팩 참조 및 내용 검증에 실패했습니다.",
      400,
      errors.slice(0, 20),
    );
  return data;
}
export function text(value: unknown, label: string, max = 200): string {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new AppError(`${label}을(를) 확인해 주세요.`);
  return value;
}
export function integer(value: unknown, min: number, max: number): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  )
    throw new AppError(`${min}~${max} 사이의 정수가 필요합니다.`);
  return value;
}
