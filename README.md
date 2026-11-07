# AstraAI · 나의 학습실

관리자가 만든 학습팩으로 개념을 읽고, 문제를 풀고, 오답을 복습하는 개인 학습 앱입니다. **현재 버전은 Codex Cloud / 로컬 개발 데모**입니다. Next.js + TypeScript로 구현했으며, Supabase·Vercel·실사용자 인증·외부 배포는 연결하지 않았습니다.

## 바로 실행하기

Git과 Node.js 22 이상이 필요합니다. 현재 앱 코드는 `feat/cloud-study-mvp` 브랜치에 있습니다.

### Windows PowerShell

처음 내려받는 경우 일반 PowerShell 창에서 아래 명령을 한 줄씩 실행하세요. 사용자 폴더 아래에 작업 폴더를 만들어 `C:\Windows\System32`에서 작업하지 않도록 합니다.

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\source" | Out-Null
Set-Location "$env:USERPROFILE\source"
git clone --branch feat/cloud-study-mvp https://github.com/purejomo/AstraAI.git
Set-Location AstraAI
node --version
npm.cmd ci
npm.cmd run dev
```

`node --version`이 `v22` 이상인지 확인하세요. 이미 저장소를 복제했다면 다시 복제하지 말고, 기존 `AstraAI` 폴더에서 `npm.cmd ci`와 `npm.cmd run dev`를 실행하면 됩니다.

터미널에 `Ready`가 표시되면 **앱을 실행한 PC의 브라우저 주소창**에 `http://localhost:3000`을 입력하세요. 앱을 사용하는 동안 PowerShell 창을 열어두고, 종료할 때는 `Ctrl+C`를 누릅니다. 다음에 다시 실행할 때는 같은 `AstraAI` 폴더에서 `npm.cmd run dev`만 실행하면 됩니다.

**`npm.ps1` 실행 정책 오류가 나타나는 경우**

`이 시스템에서 스크립트를 실행할 수 없으므로 … npm.ps1 파일을 로드할 수 없습니다` 또는 `PSSecurityException`은 PowerShell이 npm의 `.ps1` 실행 파일을 차단한 것입니다. Windows에서는 아래처럼 `.cmd` 실행 파일을 명시하세요.

```powershell
npm.cmd ci
npm.cmd run dev
```

관리자 PowerShell이나 `Set-ExecutionPolicy` 변경은 필요하지 않습니다. 이 문서의 다른 `npm` 명령도 Windows에서는 `npm.cmd`, `npx` 명령은 `npx.cmd`로 실행하세요.

최신 코드를 받으려면 실행 중인 서버를 `Ctrl+C`로 종료한 뒤, 기존 저장소 폴더에서 실행합니다.

```powershell
git pull --ff-only
npm.cmd ci
npm.cmd run dev
```

### macOS / Linux / Codex Cloud

```sh
npm ci
npm run dev
```

앱을 실행한 환경의 브라우저에서 `http://localhost:3000`을 열고 데모 계정을 선택합니다. Cloud에서는 기존 체크아웃 `/workspace/AstraAI`에서 작업하며, 준비된 Node 22를 사용하려면 먼저 `source /workspace/.astraai-tools/activate.sh`를 실행합니다. 새 worktree는 필요하지 않습니다. Cloud 앱은 Cloud의 Desktop 브라우저에서 접속합니다.

개발·프로덕션 테스트 서버 모두 기본적으로 `127.0.0.1`에만 바인딩합니다. API도 로컬 Host와 변경 요청의 동일 Origin을 검사합니다. 배포 가능한 실제 인증을 대신하는 장치가 아니므로 이 데모를 공개 서비스로 노출하지 마세요.

```sh
npm run build
npm run start
```

## 첫 학습 흐름

**빠르게 시험하려면:** 관리자 입장 → **샘플 불러오기** → **검증하고 미리보기** → 내용 검수 체크 → **검수한 초안 저장** → **3명에게 게시** → 상단에서 **학습자 1** 선택 → 학습팩의 **문제 풀기 → 퀴즈 시작** 순서로 진행하세요. 일부러 틀린 답을 제출한 뒤 **오답과 복습**에서 다시 풀어보고, 새로고침 후에도 기록이 유지되는지 확인할 수 있습니다. 샘플을 사용할 때는 ChatGPT 작업이 필요하지 않습니다.

1. **관리자**로 입장합니다. 제목·목표·문항 수로 프롬프트를 만들고 복사합니다.
2. 관리자가 자신의 ChatGPT 대화에 프롬프트와 원본 PDF/이미지를 직접 첨부합니다. 앱은 자동 전송하지 않습니다.
3. 내려받은 UTF-8 `study-pack.json`을 업로드하거나 JSON을 붙여 넣습니다. **샘플 불러오기**로 저장소의 예제도 사용할 수 있습니다.
4. 검증 → 정답·해설·출처 미리보기 → 내용 검수 확인 → **초안 저장**을 진행합니다.
5. 공유할 데모 학습자 1~3명을 선택한 뒤 **게시**합니다. 이 버튼은 로컬 앱 안에서 학습팩을 공개하며 외부 배포를 수행하지 않습니다.
6. 상단에서 **학습자 1**로 전환해 개념/FAQ를 읽고 퀴즈를 풉니다. 정답은 제출 후 서버에서 채점합니다.
7. **오답과 복습**에서 해설과 일정을 확인하고 재응시합니다. 플래시카드·모의고사·목표·현황도 같은 학습팩에서 사용할 수 있습니다.

화면에 표시되는 계정 전환은 **개발/데모 전용**입니다. 누구나 관리자 계정으로 전환할 수 있어 실제 인증으로 사용할 수 없습니다. 각 데모 세션은 HttpOnly 쿠키로 식별하며 서버는 세션의 사용자/역할을 기준으로 요청을 처리합니다. 클라이언트가 보낸 `userId`나 정답은 신뢰하지 않습니다.

## 구현 기능

- JSON Schema draft 2020-12 + 5MB/500문항 제한 + ID 고유성 + 개념 참조 + 보기 정규화/중복 + 출처 파일 검사.
- 검수 전 초안/게시 분리, 학습자별 공유, 비공개, 불변 개정본. 개정 후에도 과거 응시의 정답과 해설 유지.
- 개념·핵심 내용·FAQ, 범위/문항 수 선택, 서버 출제/채점, 힌트, 답안 초안과 진행 중 학습 복원.
- 오답 1일, 연속 정답 3/7/14일 복습. 플래시카드 기억 여부도 같은 규칙 적용.
- 모의고사 제한 시간·문항 이동·시간 만료 자동 제출. 서버 마감 후 5초를 넘긴 제출은 미응답 처리. 브라우저를 닫으면 다시 열어 이어갈 때 만료 처리.
- 개인별 시험일/공부 시간, 취약·미학습 개념 우선 계획, 최근 10번 기준 개념별 이해도, 응시 이력.
- 개인 데모 기록 삭제 확인, 데스크톱/모바일 메뉴, 키보드 조작, 줄인 모션 설정.

원본 자료의 사실관계와 보기의 **의미상** 중복은 관리자 검수가 필요합니다. 스키마 검증은 콘텐츠의 정확성을 보증하지 않습니다. AI 생성 연습문제이며 실제 기출로 표시하지 않습니다.

## 저장 방식과 한계

`src/lib/storage.ts`의 `Storage` 인터페이스 뒤에 로컬 JSON 파일 어댑터를 둡니다. 기본 파일은 `.local/study.json`이며 Git에 포함하지 않습니다. 하나의 Next.js 프로세스 안에서 변경을 직렬화하고 임시 파일 → 원자적 교체로 기록합니다. 새로고침·프로세스 재시작 후 같은 디렉터리의 데이터는 유지됩니다.

**다중 프로세스/서버리스/공유 네트워크 파일 시스템용 저장소가 아닙니다.** 환경 파일이 삭제되면 데이터도 사라집니다. 기존 파일이 손상됐을 때 새 데이터로 덮어쓰지 않고 오류를 반환합니다. 다른 개발 서버와 테스트 서버가 같은 데이터 디렉터리를 공유하지 마세요. 세션 만료는 24시간입니다.

별도 데이터 디렉터리:

```sh
# macOS / Linux
ASTRA_DATA_DIR=/tmp/astra-demo npm run dev
```

```powershell
# Windows PowerShell
$env:ASTRA_DATA_DIR = "$PWD\.local-demo"
npm.cmd run dev
```

현재 비밀값이나 API 키는 필요하지 않습니다. ChatGPT 쿠키/토큰, 실시간 LLM, OpenAI API, GPU 서버를 사용하지 않습니다.

## 검증

Windows PowerShell:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

macOS / Linux:

```sh
npm run lint
npm run typecheck
npm test
npm run build
# 일반 개발 PC: 테스트용 Chromium 설치
npx playwright install chromium
npm run test:e2e
```

Cloud에는 Chromium이 이미 설치되어 있습니다.

```sh
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

```powershell
# 설치된 Chrome/Chromium을 지정할 경우에만
$env:CHROMIUM_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
npm.cmd run test:e2e
```

E2E는 빌드된 앱을 포트 3100에서 시작하고, 각 실행의 임시 디렉터리를 사용합니다. 개발 데이터는 지우지 않습니다. Playwright 결과/스크린샷은 `test-results/`, HTML 보고서는 `playwright-report/`에 생성되며 Git에서 제외됩니다. `agent-browser`가 없는 Cloud에서는 지침에 따라 Playwright를 사용했습니다.

## 다음 단계

실제 초대/만료 링크·이메일 인증·관리자 역할 검증·Supabase RLS·영속 DB·Vercel 배포·실사용자 PC 간 검증은 **아직 구현/연결되지 않았습니다**. 사용자의 승인 후 별도 작업으로 진행합니다. 그때 사용자 본인의 프로젝트 URL과 키를 안전하게 환경 설정에 입력하고 계정/권한/리디렉션/무료 한도를 확인해야 합니다. 키를 채팅이나 GitHub에 남기지 않습니다.

PWA·푸시·음성 읽기는 PRD의 P2 후속 항목입니다. 자세한 결과와 다음 작업은 [구현 계획](docs/IMPLEMENTATION_PLAN.md), 설계는 [PRD](docs/PRD_FINAL.md), [아키텍처](docs/ARCHITECTURE.md), [데이터 계약](docs/DATA_CONTRACT.md)을 참고하세요.
