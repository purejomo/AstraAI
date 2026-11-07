# 학습팩 JSON 1.0

[JSON Schema](../schemas/study-pack.schema.json) · [예제](../examples/sample-study-pack.json) · [생성 프롬프트](../prompts/GENERATE_STUDY_PACK.md)

UTF-8의 단일 JSON 객체이며 최대 5MB·500문항이다. Markdown 코드 펜스, 주석, JSON Lines는 받지 않는다.

| 필드                   | 내용                                                                              |
| ---------------------- | --------------------------------------------------------------------------------- |
| `schema_version`       | `"1.0"`                                                                           |
| `title`, `description` | 학습팩 제목과 설명                                                                |
| `source_documents`     | 선택적인 출처 파일명 목록                                                         |
| `concepts`             | 최소 1개. `id`, `title`, `summary`, `key_points`, `faqs`                          |
| `questions`            | 최소 1개. 개념 ID, 난이도, 질문, 보기 4개, 정답 인덱스, 힌트·해설·오답 안내, 출처 |
| `flashcards`           | 개념 ID, 앞면과 뒷면. 빈 배열 허용                                                |

문항의 정답 인덱스는 0~3이며 선택지는 비어 있지 않은 서로 다른 문자열이어야 한다. 중복 ID, 없는 개념 참조, 등록되지 않은 출처 파일, 범위 밖 정답을 거부한다. 출처 페이지는 양의 정수 또는 `null`이다. 원문 근거의 정확성은 작성자가 검수한다.

생성 프롬프트는 이 형식을 따르는 `study-pack.json` 다운로드 파일을 요청한다. 앱은 파일을 검증하고 정답 확인을 거쳐 새 학습팩으로 저장한다. 문제·정답 수정은 GPT에 요청한 뒤 새 파일을 가져온다. 학습팩 JSON에는 개인 풀이 기록·세션을 넣지 않는다.

기존 수정 API는 새 revision을 생성하고 오래된 편집본 저장을 거부하는 계약을 유지한다. 기존 풀이 기록은 당시 revision을 계속 참조한다.
