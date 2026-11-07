# AstraAI 아키텍처 및 운영 정책

## 배포 구조

```text
[관리자 ChatGPT Pro]  --(수동 업로드/다운로드)--> study-pack.json
                                                         |
[관리자 브라우저] ---- (로그인/JSON 검증/승인) --------> [Next.js 웹앱 (Vercel)]
[3명 학습자 브라우저] ---- (HTTPS, 초대제) ------------> [Next.js 웹앱 (Vercel)]
                                                         |
                                                         v
                                           [Supabase: Auth + Postgres]
                                           - 학습팩 revision/발행 상태
                                           - 사용자별 학습 시도
                                           - 오답 및 다음 복습 일정
                                           - 시험 목표/학습 계획
```

앱의 AI API 호출은 0회. 원본 PDF·이미지는 우선 브라우저에서 프롬프트 준비에만 사용하며, ChatGPT에는 관리자가 직접 첨부한다. 앱 저장소에 자동 업로드하지 않음. 관리자 JSON 게시가 유일한 콘텐츠 업데이트 경로.

## 핵심 엔터티

`profiles`(id, role, display_name), `invites`(id, email, token_hash, expires_at, accepted_at), `packs`(id, title, owner_id, published_revision_id), `pack_revisions`(id, pack_id, version, data_json, created_at), `pack_access`(user_id, pack_id), `study_goals`(user_id, pack_id, exam_date, daily_minutes), `quiz_attempts`(id, user_id, pack_revision_id, submitted_at, correct_count), `question_attempts`(id, quiz_attempt_id, user_id, question_id, selected_index, is_correct), `review_state`(user_id, pack_id, question_id, streak, next_due_at).

## 서버 인증/채점

- Supabase Auth를 활용하여 인증하며 클라이언트 제공 user_id를 신뢰하지 않음.
- 관리자 권한은 로그인 이메일 문자열 비교가 아니라 서버 측 프로필 역할/RLS 정책으로 확인.
- 일반 사용자의 쿼리는 RLS로 자신에게 배포된 학습팩 및 자신의 기록으로 제한.
- 정답 보호: 문제 전달 시 정답/설명 필드는 숨기고 제출 API 내에서 채점. 정적 문제은행 JSON을 공개 API로 내려주지 않음.
- 학습팩 수정은 불변 revision으로 처리하고 응시 기록은 당시 revision을 계속 참조.
- JSON 크기, 스키마, ID, 참조 무결성 검증은 서버에서 수행.
- 모든 외부 공개 URL은 HTTPS, 관리자 API는 사용자 세션 + 역할 검사.
- 인증 초대 처리 실패, 사용정지, 만료/중복 초대 처리에 오류 메시지 제공.

## 사무실 PC (Windows)

- **개발/테스트 워크스테이션**: Intel Core Ultra 7 265, RAM 64GB, RTX A400 4GB.
- GPU는 필수 아님. AI 요청을 별도 서버로 자동 실행하지 않음.
- PowerShell에서 Git, Node.js 22 LTS, 브라우저, agent-browser 설치 여부 확인.
- 코드는 GitHub Private 저장소에서 `git clone`, 최신 변경은 `git pull`.
- 개발 시작(앱 코드 구현 후): `npm install` → `npm run dev`.
- agent-browser는 브라우저 E2E 검증 도구. 이를 설치한다고 ChatGPT가 무인 상태에서 PC를 원격 제어할 수 있는 것은 아님.

## 배포/비용

- **첫 권장안**: Vercel Hobby + Supabase Free 조합. 사용자 3명/비상업적 실험 규모의 출발점에 적합하나 무료 제공 범위·휴면 제한·로그인 메일 제한 등은 실제 계정에서 확인 필요.
- 사무실 PC를 직접 상시 인터넷 서버로 노출하지 않음. 전원·방화벽·포트 개방·네트워크 관리는 피할 수 있음.
- 계정 소유자가 Vercel/Supabase 프로젝트 연결 및 환경변수 생성/입력을 직접 승인해야 함.
- API 키, 로그인 쿠키, session token은 채팅·GitHub에 남기지 않는다.
- 무료 한도 초과 시 자동 유료 과금/유료 플랜 전환을 막도록 운영자가 서비스 설정을 확인.
- 이메일 발송 제공자의 무료 한도나 비활성 프로젝트 자동 휴면 등으로 접속 장애가 발생할 수 있음.
- 추후 모바일: 우선 PWA(홈 화면 추가), 다음 단계에서 Expo/React Native 또는 래핑 여부 재검토.

## 기술 선택

Next.js + TypeScript + CSS/Tailwind + Zod/Ajv JSON Schema 검사 + Supabase JS + Postgres RLS. 단일 Next.js 서버가 API/뷰/UI를 담당하므로 별도 FastAPI, Celery, GPU inference, vector DB가 필요 없음.
