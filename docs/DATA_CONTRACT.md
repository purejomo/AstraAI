# 학습팩 데이터 계약 v1.0

스키마: [study-pack.schema.json](../schemas/study-pack.schema.json)  
예시: [sample-study-pack.json](../examples/sample-study-pack.json)

## 파일 포맷

- UTF-8 인코딩의 **단일 JSON 객체**. ZIP·Markdown 코드블록·주석·JSON Lines는 불허.
- 최상위 필수 필드: `schema_version`, `title`, `description`, `concepts`, `questions`, `flashcards`.
- `schema_version`은 현재 정확히 `"1.0"`.
- `source_documents`는 실제 관리자가 ChatGPT에 제공한 원본 파일명 목록이며 선택적.
- `concepts[]`에 `id,title,summary,key_points[],faqs[]`를 넣는다.
- `questions[]`에 `id,concept_id,difficulty,type,question,choices[4],answer_index(0~3),hint,explanation,wrong_feedback,source_refs[]`를 넣는다.
- `flashcards[]`는 `id,concept_id,front,back`.
- 출처가 확인될 때만 `source_refs:[{"file":"lecture.pdf","page":3}]`; 확인되지 않으면 `[]` 사용.

## JSON Schema 검사 외 필수 교차 검증

1. 각 배열 내 ID 고유, 모든 배열 전체에서도 가급적 중복 금지.
2. question/flashcard의 concept_id가 실제 concepts.id를 가리킬 것.
3. 모든 객관식 문항에는 **비어있지 않고 의미상 겹치지 않는 서로 다른 4개 선택지**와 단일 정답이 있을 것.
4. source_ref.file은 source_documents에 존재하는 파일명이거나 출처 미확인 `[]`일 것.
5. PDF 페이지번호는 실제 근거와 일치하는지 **관리자 검토 필요**. 앱에서 자동 진위 검증은 불가능.
6. 가짜 기출문제 표시 금지. 'AI 생성 연습문제' 표시.
7. 파일 최대 5MB(첫 버전) 및 문제 수 500개 이하 등 서버 자원 제한.
8. 관리자는 검증 결과 및 샘플 미리보기를 보고 게시를 명시적으로 승인.
9. 게시된 콘텐츠 변경은 새로운 revision을 생성하여 과거 응시의 정답·해설이 바뀌지 않도록 한다.

## 데이터 설계 원칙

- 문제은행 정적 원본은 JSON이며, 사용자의 학습 결과는 PostgreSQL의 별도 테이블에 저장한다.
- 서버는 정답을 제출 전에 응답 JSON에 그대로 노출하지 않는다. 채점은 서버에서 수행한다.
- 문제은행 게시 권한은 관리자만 가진다.
- 각 사용자별 시도, 개인 목표, 복습 예약은 접근 통제 정책으로 격리한다.
- 오답 피드백은 AI의 실시간 판단이 아니라 JSON에 미리 만들어진 텍스트다.
