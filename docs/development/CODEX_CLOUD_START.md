# Codex Cloud 단독 개발 지침

현재 단계는 Cloud에서 개발·검증하는 개인 PC용 앱이다. Vercel, Supabase, 유료 API, 외부 배포를 전제하지 않는다. 최신 요구는 누구나 코드 사본으로 스스로 문제를 만들고 공부하는 방식이며, 이전 관리자/학습자 게시 모델을 대체한다.

## 시작

`AGENTS.md`, `README.md`, `PRD_FINAL.md`, `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, `../DATA_CONTRACT.md`, `../../schemas/study-pack.schema.json`, `../../examples/sample-study-pack.json`을 읽는다. 기능 브랜치에서 구현하고 GitHub 쓰기가 가능하면 커밋·PR로 정리한다.

## 유지할 핵심 흐름

1. 계정 선택 없이 개인 학습실 열기.
2. 직접 개념·문제·카드 작성 또는 JSON/샘플 가져오기.
3. 서버 검증·미리보기·정답 검수 후 저장하고 즉시 학습.
4. 개념·퀴즈·서버 채점·오답 복습·플래시카드·모의고사·계획·성취도.
5. 수정 시 새 revision 보관, JSON 내보내기/다른 설치본 가져오기.
6. 기존 데이터와 개별 이전 기록 보존. 조용히 합치거나 삭제하지 않기.

수동 ChatGPT 프롬프트는 선택 사항이다. 사용자가 원본 PDF/이미지를 자신의 대화에 직접 첨부한다. 앱 내부 OpenAI API·실시간 LLM·계정 토큰 연결은 없다.

## 검증과 완료

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- agent-browser가 없으면 Playwright. 직접 작성/JSON 오류/수정/저장/문제 풀이/복습/내보내기, 1440px·390px 화면, 중간 화면 폭, 키보드·접근성·콘솔 확인.
- Windows 사용 명령은 `npm.cmd`; 실행/사용 안내는 README, 검증/기술 상세는 `docs/development/`에 둔다.
- 진행과 결과를 `IMPLEMENTATION_PLAN.md`에 기록하고 실패를 수정한다. 로컬 검증과 원격 CI 결과를 구분한다.
- 실제 온라인 인증/DB/배포는 후속 작업이며 완료했다고 주장하지 않는다.

## 승인

코드·테스트·안전한 의존성 설치·기능 브랜치 커밋·PR는 기존 사용자 요청으로 승인되어 있다. 유료 서비스·외부 배포·실제 데이터 삭제·보안 완화·외부 계정 연결은 별도 승인이 필요하다. 비밀값이나 개인 자료를 저장소에 남기지 않는다. 환경 초안을 게시하지 않는다.
