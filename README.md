# AstraAI

개인용 학습 도우미 프로젝트. 대학생과 자격증 수험생을 위한 3명 초대제 웹앱을 개발합니다.

> 현재 상태: **최종 설계 확정 / 애플리케이션 구현 전**. 이 저장소에 설계, 데이터 규약, ChatGPT 수동 생성 프롬프트, 테스트 기준을 기록합니다. 현시점에는 실행 가능한 웹앱 코드가 없습니다.

## 확정된 핵심 원칙

- 운영자(관리자) 1명이 **자신의 ChatGPT Pro**에서 문제은행과 학습 콘텐츠를 생성합니다.
- 생성물은 **UTF-8 JSON 파일(`study-pack.json`)**로 저장합니다.
- 운영자가 앱에 JSON을 업로드하고 검증한 뒤 **초대한 학습자 3명**에게 게시합니다.
- 3명은 **각자의 계정과 학습 기록**을 가지며, ChatGPT 로그인/토큰/API 키가 필요 없습니다.
- 정답·오답·반복 학습 기반으로 개인별 학습 성과 및 복습 일정을 **규칙 기반**으로 계산합니다.
- 과목은 고정하지 않습니다. 대학 강의나 자격증 등 어떤 분야도 동일한 JSON 계약으로 지원합니다.
- PC 웹 우선, 390px 모바일 화면까지 대응. 추후 iOS/Android에서 사용할 수 있도록 PWA를 확장합니다.
- API 과금 금지, 초기 운영비 0원 목표. 무료 호스팅·DB의 제한과 휴면 중단 가능성은 존재합니다.
- ChatGPT 대화/세션을 크롤링하거나 인증 토큰을 재사용하지 않습니다.
- Astra의 학습 UX는 벤치마킹하되 상표/화면 자산/전용 카피를 복제하지 않습니다.

## 관리자의 학습 콘텐츠 생성 절차

1. 앱에서 과목·시험 목표·문항 수 등을 지정합니다.
2. [생성 프롬프트](prompts/GENERATE_STUDY_PACK.md)를 복사하여 관리자 본인의 ChatGPT 대화에 붙여넣습니다.
3. 해당 학습 자료 PDF 또는 이미지를 **ChatGPT 대화에도 직접 첨부**합니다. 앱은 이를 자동 전송하지 않습니다.
4. ChatGPT가 제공한 `study-pack.json`을 내려받습니다.
5. 앱의 관리자 화면에서 업로드하여 [JSON 규약](schemas/study-pack.schema.json)을 검사하고 미리 봅니다.
6. 관리자가 승인 및 게시하면 초대된 3명에게 노출됩니다.
7. 학습자들은 퀴즈·플래시카드·오답노트·계획·진도 화면을 사용합니다.

## 문서

- [최종 PRD](docs/PRD_FINAL.md): 역할, 화면, 기능, 수용 기준
- [시스템 아키텍처](docs/ARCHITECTURE.md): Windows, 웹 배포, 데이터/보안, 서버 API
- [데이터 계약](docs/DATA_CONTRACT.md) 및 [JSON Schema](schemas/study-pack.schema.json)
- [ChatGPT 생성 프롬프트](prompts/GENERATE_STUDY_PACK.md)
- [개발/테스트 체크리스트](docs/IMPLEMENTATION_PLAN.md)
- [데이터 샘플](examples/sample-study-pack.json)

## 개발 기술(설계 확정, 아직 구현 안 됨)

- Next.js + TypeScript (PC 및 모바일 반응형)
- Supabase Free: 인증, PostgreSQL, 초대자 3명 학습 기록
- Vercel Hobby: 비상업적 개인용 공개 HTTPS 웹 배포
- 관리자 화면의 JSON 입력·스키마 검증; 배포 후 학습 데이터 공유
- 별도 FastAPI 서버, 유료 AI API, 로컬 LLM, GPU 실행은 사용하지 않음
- Taste Skill의 차분한 타이포그래피·그리드·상호작용 원칙을 참고하되 대시보드에 맞게 독자적으로 구현

개발용 PC는 Windows PowerShell을 기준으로 합니다. 코드가 추가된 이후 `git clone https://github.com/purejomo/AstraAI.git`, `npm install`, `npm run dev` 흐름을 지원합니다. 현재는 소스 앱이 없으므로 `npm run dev`는 실행되지 않습니다.

## 보안

- 저장소는 Private입니다. 비밀번호, ChatGPT 쿠키/세션, API 키, Supabase service-role 키를 커밋하지 않습니다.
- 초대 링크는 1회용이고 만료됩니다. 공개 가입은 차단합니다.
- 관리자만 문제은행을 등록·수정·게시할 수 있고, 학습 기록은 회원별 격리(RLS)합니다.

2026-11-07 확정.