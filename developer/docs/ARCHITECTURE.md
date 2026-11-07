# 현재 아키텍처

## 실행 구조

Windows 설치 파일은 Electron과 Next.js standalone 서버를 포함한다. 사용자의 시스템 Node.js나 Git을 실행하지 않는다. Electron의 `utilityProcess.fork`가 저장·채점 서버를 띄우고 전용 창에서 UI를 연다. 앱 종료 시 서버도 종료한다.

`desktop/main.mjs`는 단일 인스턴스, 창, 메뉴, 서버 수명과 권한을 관리한다. `desktop/runtime.mjs`는 동일 포트 재사용, 충돌 거부, 서버 준비 확인을 담당한다. 포트와 Chromium 프로필을 유지하므로 재실행해도 작성 중 초안을 이어 쓸 수 있다.

`scripts/build-desktop.mjs`는 앱 패키징 때만 standalone 출력을 켠다. `scripts/prepare-desktop.mjs`는 서버·정적 파일·프롬프트·아이콘을 준비한다. `.env`와 개인 저장 파일은 설치본에서 제외한다. `electron-builder.yml`은 현재 Windows 사용자용 x64 NSIS 설치 파일을 만든다.

## 학습 흐름

앱을 열면 개인 학습실로 들어간다. 같은 사용자가 문제를 만들고 공부한다. 별도 운영자·로그인·게시 과정은 없다.

직접 작성 또는 JSON 가져오기 → 서버 검증과 미리보기 → 내용 확인 후 저장 → 개념 학습·퀴즈·채점 → 오답 복습. 플래시카드, 시간 제한 모의고사, 목표·계획·성취도도 같은 로컬 저장소를 사용한다.

문제를 수정하면 새 revision을 만들며 기존 응시와 복습은 당시의 정답·해설을 참조한다. 오래된 편집본의 저장은 409로 거부한다. JSON 내보내기는 학습팩 내용만 포함한다.

## 데이터

- 설치된 앱: `%APPDATA%\AstraAI\data\study.json`
- 소스 실행: `developer/.local/study.json`; `ASTRA_DATA_DIR`로 변경 가능
- 테스트: 임시 디렉터리와 `ASTRA_DESKTOP_HOME` 사용
- 작성 중 초안: Chromium localStorage, `astra-personal-draft-v1`

파일 저장은 한 서버 프로세스에서 직렬화하며 임시 파일 작성 후 원자적으로 교체한다. 설치·제거와 데이터 경로를 분리한다. 저장 버전 1과 기존 파일의 필드는 호환성을 위해 유지하지만 사용자 데이터는 삭제하거나 합치지 않는다.

## API와 보안

- `session`, `bootstrap`: 로컬 세션과 학습실 상태
- `library/sample`, `library/prompt`, `library/preview`, `library/save`, `library/packs/:id`: 문제은행 작성·검증·수정·내보내기
- `runs`, `study`, `flashcards`, `goals`, `reset`: 풀이·채점·복습·계획

서버는 `127.0.0.1`에만 바인딩하고 Host 및 변경 요청의 Origin을 검사한다. 데스크톱 앱에서는 실행마다 생성한 API 비밀 헤더도 검사한다. 출제 응답에서 정답·해설을 제외하고 서버에서 채점한다.

Electron은 `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`를 사용한다. 외부 탐색·새 창·webview·외부 네트워크 요청을 차단한다. 자체 출처의 클립보드 쓰기만 허용한다. 서버 저장 방식은 인터넷 공개나 다중 서버용이 아니다.

## 학습 규칙

오답은 1일 뒤, 연속 정답은 3·7·14일 뒤 복습한다. 성취도는 최근 최대 10회 시도를 사용하며 3회 미만은 데이터 부족으로 표시한다. 계획은 서울 날짜 기준이다. 모의고사는 서버 마감 시각과 5초의 제출 유예를 사용한다.

외부 AI API·CDN·폰트 서버 없이 실행한다. 선택 기능인 ChatGPT 프롬프트는 사용자가 별도 대화에 직접 붙여 넣는다.
