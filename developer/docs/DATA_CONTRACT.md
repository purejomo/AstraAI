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

저장된 내용을 수정하면 새 revision을 만든다. JSON 내보내기는 최신 콘텐츠만 포함하며 개인 풀이 기록·세션은 포함하지 않는다. 다른 앱에서 가져오면 새 학습팩으로 저장된다.
