# Windows 앱 패키징

## 구조

Electron이 Next.js standalone 서버와 전용 창을 함께 실행한다. 최종 사용자의 PC에 Git·Node.js가 없어도 작동한다. UI와 학습 API는 기존 앱을 그대로 사용한다.

- `desktop/main.mjs`: 단일 인스턴스, 전용 창, 로컬 서버 자식 프로세스, 메뉴와 종료.
- `desktop/runtime.mjs`: 재실행 시 동일 포트 사용, 충돌 거부, 준비 확인과 동일 출처 검사.
- `scripts/build-desktop.mjs`: 데스크톱 빌드에만 standalone 출력을 활성화한다. 일반 웹 빌드/실행 방식은 유지한다.
- `scripts/prepare-desktop.mjs`: standalone·정적 파일·수동 프롬프트 복사, 기존 SVG에서 앱 아이콘 생성. `.env`와 `.local`은 포함하지 않는다.
- `electron-builder.yml`: 현재 사용자용 x64 NSIS 설치 파일. 사용자 데이터는 제거 시에도 보존.
- `scripts/smoke-desktop.mjs`: 실제 Electron 창에서 등록/풀이/채점, 비앱 API 거부, 단일 인스턴스, 종료, 재실행과 초안/학습 기록 보존 검증.
- `.github/workflows/desktop.yml`: Windows에서 빌드·설치·설치본 실행 검사 후 `.exe`와 SHA-256을 **Actions artifact**로 보관. 릴리즈 게시 권한은 없으며 자동 게시하지 않는다.

## 빌드

빌드하는 PC에는 Node.js 22.12 이상과 npm이 필요하다. Windows x64 설치 파일은 Windows에서 빌드하는 구성을 기준으로 검증한다.

```powershell
npm.cmd ci
npm.cmd run desktop:win
```

결과는 `release/AstraAI-Setup-0.2.0-x64.exe`. `--publish never`가 적용된다. 코드 서명은 구성하지 않았다. 인증서 구매·공개 배포·자동 업데이트는 별도 결정이다.

패키징 전 앱 실행 확인:

```powershell
npm.cmd run desktop:prepare
npm.cmd run desktop
npm.cmd run test:desktop
```

패키징한 설치본 검증:

```powershell
$env:ASTRA_DESKTOP_EXECUTABLE = "$env:LOCALAPPDATA\Programs\AstraAI\AstraAI.exe"
npm.cmd run test:desktop
```

테스트는 별도 임시 사용자 폴더만 사용한다. Windows 앱 프로세스의 PATH에서는 Git·Node.js 경로를 제외하여 실행 환경이 번들에 포함되는지 확인한다. 실제 사용자의 `%APPDATA%\AstraAI`는 건드리지 않는다.

Cloud Linux에서는 `npm run desktop:pack -- --linux`로 압축 전 디렉터리를 만들 수 있다. GUI 검증에는 X 서버가 필요하며, 시스템 설치 권한이 없다면 공식 Debian의 Xvfb 패키지를 사용자 도구 디렉터리에 풀어 사용한다. 컨테이너에 필요한 `ASTRA_TEST_NO_SANDBOX=1`은 **테스트 실행 옵션**이고 출하 앱은 해당 Chromium 스위치를 추가하지 않는다. Linux 패키징/실행 확인은 Windows 설치 검증을 대신하지 않는다.

Electron 바이너리 다운로드가 Cloud의 프록시 때문에 실패할 경우 프록시/CA 환경을 보존하고 Node의 프록시 지원을 사용한다.

```sh
NODE_USE_ENV_PROXY=1 node node_modules/electron/install.js
```

## 실행·보안·데이터

- `utilityProcess.fork`는 동봉한 Next 서버를 실행한다. 시스템 `node.exe`나 셸 명령을 호출하지 않는다.
- 바인딩은 `127.0.0.1`. 기존 Host·Origin 검사를 유지하며 앱 실행 때마다 생성한 비밀 헤더를 추가 검사한다. 앱 외부에서 개인 API에 접근할 수 없다.
- 렌더러는 `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`. preload/임의 IPC는 없다.
- 외부 탐색·새 창·webview·외부 네트워크 요청을 차단한다. 권한은 자체 출처의 클립보드 쓰기만 허용한다.
- 전용 포트를 사용자 설정 파일에 보관해 Chromium 출처와 임시 초안을 유지한다. 포트 충돌 시 다른 서버를 열거나 조용히 포트를 바꾸지 않는다.
- 데이터: `%APPDATA%\AstraAI\data\study.json`. 앱 설치 리소스와 분리하며 업데이트/제거가 이를 지우지 않는다.
- 자동 이전/덮어쓰기는 없다. 이전 소스 버전의 기록을 옮기는 절차는 사용자 문서에 안내한다.
- 정상 종료 시 자식 서버를 종료하고 잠시 대기한다. 서버 저장은 기존 원자적 파일 교체 방식을 유지한다.
- 테스트의 `ASTRA_DESKTOP_HOME`은 임시 프로필 경로, `ASTRA_DESKTOP_TEST`는 자동 테스트 시 오류 대화상자 대신 실패 로그를 내는 용도다.

## 배포 경계

Actions artifact는 검증/검토용이며 비공개 저장소에서는 다운로드에 로그인이 필요하다. `.exe` 자체에는 GitHub 인증이나 외부 서버 의존성이 없다. 파일을 직접 전달하면 수신자는 로그인 없이 실행한다.

로그인 없이 다운로드 가능한 공식 릴리즈가 필요하면 설치 파일만 보관하는 공개 배포 저장소 또는 공개 파일 위치를 소유자가 승인해야 한다. 이 작업에는 소스 저장소 공개 전환, Release 게시, 유료 서명, 계정 연결이 포함되지 않는다.
