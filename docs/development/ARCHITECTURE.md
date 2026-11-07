# AstraAI 아키텍처

현재 제품은 한 사람이 작성과 학습을 모두 하는 개인 PC용 앱이다. 설치본마다 데이터가 독립적이며 온라인 인증·DB·배포는 [후속 계획](ONLINE_ROADMAP.md)에 있다.

```text
브라우저
  ├─ 나의 문제은행: 직접 작성 / JSON 가져오기 / 수정 / 내보내기
  ├─ 선택 사항: 프롬프트 복사 → 사용자의 ChatGPT → JSON 가져오기
  └─ 개념 / 퀴즈 / 복습 / 카드 / 모의고사 / 계획 / 현황
        ↓
Next.js App Router + Route Handler
  ├─ loopback Host + 같은 Origin의 변경 요청
  ├─ 자동 발급한 로컬 브라우저 세션
  ├─ JSON 검증 / 불변 revision 저장 / 수정 충돌 검사
  └─ 서버 출제·채점 / 개인 학습 기록
        ↓
Storage.transaction → 단일 프로세스 FileStorage (.local/study.json)
```

## 코드 구성

- `src/components/library.tsx`: 개인 문제은행, JSON/샘플/수동 프롬프트, 미리보기, 검수, 저장·내보내기, 브라우저 초안.
- `src/components/pack-editor.tsx`: 개념/FAQ, 문항/정답/출처, 카드 입력. ID는 생성 시 부여하며 수정 중 유지한다.
- `src/components/study-app.tsx`: 로컬 세션 초기화, 탐색, 홈, 설정과 이전 기록 선택.
- `src/components/learning-views.tsx`, `quiz.tsx`: 기존 학습 루프와 답안 복원.
- `src/lib/validation.ts`: Ajv 2020-12, ID/개념/보기/출처/공백/크기/500문항 검증.
- `src/lib/api.ts`: 로컬 요청 경계, 세션, 콘텐츠 API, 서버 채점, 버전별 기록과 이전 이력 선택.
- `src/lib/learning.ts`: 서울 날짜, 복습 간격 1/3/7/14일, 최근 10회 지표, 출제 DTO.
- `src/lib/storage.ts`: Promise 큐 직렬화, 임시 파일 쓰기 후 원자적 교체. 손상된 파일을 덮어쓰지 않는다.

## 세션과 요청 경계

세션 쿠키는 HttpOnly/SameSite=Strict, 24시간이며 앱이 자동 생성/갱신한다. 세션 사용자 값 `local-owner`만 인정하고 예전 데모 역할 세션은 사용하지 않는다. 클라이언트의 임의 profileId로 계정을 선택할 수 없다. 실제 인터넷 인증은 아니므로 localhost/127.0.0.1/::1 외 Host를 거부한다. 변경 요청은 브라우저 Host 기준으로 정확히 같은 Origin만 허용한다. Next가 내부 URL을 바인드 호스트로 정규화할 수 있으므로 실제 Host를 사용하고 forwarded 헤더는 신뢰하지 않는다.

독립 설치본의 모든 콘텐츠는 그 설치본 소유자의 문제은행이다. `library/packs/:id`에는 편집에 필요한 정답을 포함하지만 출제 응답은 정답·해설·오답 피드백을 제외한다. 저장 요청의 `userId`/`role`을 사용자 식별로 사용하지 않는다. 온라인 권한 보장이나 부정행위 방지 기능으로 주장하지 않는다.

## API

- `POST session {}`: 로컬 세션 준비. `GET bootstrap`: 학습 자료 요약과 현재 이력.
- `GET library/sample`, `POST library/prompt`, `POST library/preview`: 자료 준비/검증.
- `POST library/save {raw, packId?, baseRevisionId?}`: 검증 후 새 팩 또는 새 revision 저장. 즉시 학습에 적용한다.
- `GET library/packs/:id`: 최신 작성본과 `baseRevisionId` 반환. JSON 내보내기는 내용만 내려받는다.
- 기존 팩 저장 시 `baseRevisionId`가 최신 저장본과 다르면 409. 실패 시 기존 데이터에 변화가 없다.
- `runs`, `runs/:id`, `study`, `flashcards`, `goals`, `reset`: 학습 기능. 초기화는 확인 문구를 요구하고 현재 기록만 지운다.
- `POST history`: 이전 데모 이력이 있는 설치본에서 이어 쓸 기록 선택. 새 계정 생성이나 인증 기능이 아니다.
- 이전 `admin/*` 게시/공유 API는 사용하지 않는다.

## 데이터 호환성과 저장

저장 파일 버전 1과 JSON 계약 1.0을 유지한다. `packs.publishedId`는 현재 학습 버전 포인터로 재사용하고 이전 `access`는 보존하되 개인 설치본에서 접근 제한으로 적용하지 않는다. 이전 비공개 팩은 마지막 revision을 사용한다. 기존 게시본과 나중의 미게시 수정본이 둘 다 있으면 학습은 기존 게시본을 유지하고, 편집기는 최신 수정본을 열어 검수 후 저장하도록 한다.

기본 기록 ID는 기존 `learner-1`이다. `historyId`는 이어 쓸 이전 이력 ID를 선택하는 선택 필드다. `learner-2/3`의 기록은 덮어쓰거나 합치지 않으며 설정에서 선택할 수 있다. 선택하지 않은 기록의 상세 응시에는 현재 이력으로 접근하지 않는다. 모든 이력은 동일한 개인 설치본에 있는 보존 데이터이며 실제 사용자 권한 격리로 주장하지 않는다.

새 저장은 이전 revision 객체를 수정하지 않는다. 과거 응시·복습은 당시 버전을 계속 참조한다. 목표는 학습팩 단위, 개념 진도/현재 성취도는 버전 단위다. 모의고사는 서버 마감 + 전송 유예 5초 이후에 추가 답안을 인정하지 않는다.

작성 중 초안은 브라우저 localStorage의 `astra-personal-draft-v1`에 보관한다. 초안 수정 시 검수 상태를 해제한다. 브라우저 저장 공간 오류를 표시하고 JSON 다운로드로 보관할 수 있다. 학습팩 정식 저장 후 초안을 제거한다. 초안은 서버 백업에 포함되지 않는다.

파일 저장은 한 Next.js 프로세스에서만 지원한다. 서버리스·다중 프로세스·인터넷 공유는 인증과 DB 어댑터 구현 이후 검증한다. 앱은 외부 폰트/CDN/AI API 없이 실행되며 GPU는 필요 없다.

## 디자인

[Taste Skill](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md)을 타이포그래피·정렬·색상·간격·포커스·모션의 참고로 사용한다. 사용자 요구에 맞는 실제 학습 도구를 직접 구현하며 마케팅용 전면 히어로나 사진 템플릿을 복제하지 않는다. 입력은 섹션별로 나누고 문항 하나씩 편집해 큰 JSON도 다룰 수 있도록 한다.
