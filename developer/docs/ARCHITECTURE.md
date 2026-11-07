# 현재 아키텍처

## 실행 구조

Windows 설치 파일은 Electron과 Next.js standalone 서버를 포함한다. 사용자의 시스템 Node.js나 Git을 실행하지 않는다. Electron의 `utilityProcess.fork`가 저장·채점 서버를 띄우고 전용 창에서 UI를 연다. 앱 종료 시 서버도 종료한다.

`desktop/main.mjs`는 단일 인스턴스, 창, 메뉴, 서버 수명과 권한을 관리한다. `desktop/runtime.mjs`는 동일 포트 재사용, 충돌 거부, 서버 준비 확인을 담당한다. 포트와 Chromium 프로필을 유지하므로 재실행해도 프롬프트 준비 단계를 이어갈 수 있다.

`scripts/build-desktop.mjs`는 앱 패키징 때만 standalone 출력을 켠다. `scripts/prepare-desktop.mjs`는 서버·정적 파일·프롬프트·아이콘을 준비한다. `.env`와 개인 저장 파일은 설치본에서 제외한다. `electron-builder.yml`은 현재 Windows 사용자용 x64 NSIS 설치 파일을 만든다.

## 학습 흐름

앱을 열면 개인 학습실로 들어간다. 사용자가 GPT로 만든 문제 파일을 가져와 공부한다. 별도 운영자·로그인·게시 과정은 없다.

조건 입력 → 프롬프트 복사 → 외부 ChatGPT에서 JSON 파일 생성 → 파일 가져오기 → 한 문제씩 확인·저장 → 개념 학습·퀴즈·채점 → 오답 복습. 각 단계는 별도 화면이며 수동 문제 편집기는 제공하지 않는다. 플래시카드, 시간 제한 모의고사, 목표·계획·성취도도 같은 로컬 저장소를 사용한다.

가져온 JSON은 새 학습팩으로 저장한다. 기존 데이터의 revision과 수정·내보내기 API 계약은 호환성을 위해 유지하며, 과거 응시와 복습은 당시의 정답·해설을 참조한다. 생성 화면에는 편집·내보내기 UI를 두지 않는다.

## 데이터

- 설치된 앱: `%APPDATA%\AstraAI\data\study.json`
- 소스 실행: `developer/.local/study.json`; `ASTRA_DATA_DIR`로 변경 가능
- 테스트: 임시 디렉터리와 `ASTRA_DESKTOP_HOME` 사용
- 프롬프트 조건·진행 단계: Chromium localStorage, `astra-pack-flow-v1`
- 저장 전 JSON 미리보기: 메모리에만 보관; 재실행하면 파일 선택 단계로 돌아간다. 기존 작성 초안 키는 삭제하지 않는다.

파일 저장은 한 서버 프로세스에서 직렬화하며 임시 파일 작성 후 원자적으로 교체한다. 설치·제거와 데이터 경로를 분리한다. 저장 버전 1과 기존 파일의 필드는 호환성을 위해 유지하지만 사용자 데이터는 삭제하거나 합치지 않는다.

## API와 보안

- `session`, `bootstrap`: 로컬 세션과 학습실 상태
- `library/sample`, `library/prompt`, `library/preview`, `library/save`, `library/packs/:id`: 프롬프트·JSON 검증·저장 및 기존 콘텐츠 API
- `runs`, `study`, `flashcards`, `goals`, `reset`: 풀이·채점·복습·계획

서버는 `127.0.0.1`에만 바인딩하고 Host 및 변경 요청의 Origin을 검사한다. 데스크톱 앱에서는 실행마다 생성한 API 비밀 헤더도 검사한다. 출제 응답에서 정답·해설을 제외하고 서버에서 채점한다.

Electron은 `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`를 사용한다. 렌더러의 외부 탐색·새 창·webview·외부 네트워크 요청을 차단한다. 예외는 사용자가 누른 정확한 `https://chatgpt.com/` 링크를 시스템 브라우저에서 여는 것뿐이다. 프롬프트·파일·세션·토큰을 URL에 담아 보내지 않는다. 자체 출처의 클립보드 쓰기만 허용한다. 서버 저장 방식은 인터넷 공개나 다중 서버용이 아니다.

## 학습 규칙

오답은 1일 뒤, 연속 정답은 3·7·14일 뒤 복습한다. 성취도는 최근 최대 10회 시도를 사용하며 3회 미만은 데이터 부족으로 표시한다. 계획은 서울 날짜 기준이다. 모의고사는 서버 마감 시각과 5초의 제출 유예를 사용한다.

외부 AI API·CDN·폰트 서버 없이 실행한다. ChatGPT 프롬프트는 사용자가 별도 대화에 직접 붙여 넣는다. 앱이 AI API를 호출하거나 생성 결과를 자동으로 받지는 않는다.
