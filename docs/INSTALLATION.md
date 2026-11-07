# 설치·사용 안내

이 안내는 소스 코드로 AstraAI를 설치하는 방법입니다. 실행 파일만으로 사용하려면 [Windows 앱 안내](WINDOWS_APP.md)를 따르세요. 설치본을 다른 사람에게 인터넷으로 공개하는 방법은 [온라인 운영 안내](HOSTING.md)에서 확인하세요.

## 준비

- [Node.js](https://nodejs.org/) 22 이상: 설치 후 `node --version`으로 확인합니다.
- [Git](https://git-scm.com/): 저장소를 내려받고 업데이트할 때 사용합니다.
- 비공개 저장소의 접근 권한: `Repository not found`가 나타나면 소유자에게 접근 권한을 요청하고 GitHub 로그인을 확인하세요. 비밀번호나 토큰을 채팅에 보내지 마세요.

현재 앱 코드는 `main` 브랜치에 있습니다. 이미 복제한 저장소에서는 `git branch --show-current`로 현재 브랜치를 확인할 수 있습니다.

## Windows PowerShell

일반 PowerShell 창에서 사용자 폴더 아래에 설치합니다.

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\source" | Out-Null
Set-Location "$env:USERPROFILE\source"
git clone --branch main https://github.com/purejomo/AstraAI.git
Set-Location AstraAI
node --version
npm.cmd ci
npm.cmd run build
npm.cmd start
```

이미 복제했다면 기존 `AstraAI` 폴더에서 마지막 세 명령만 실행하세요. `C:\Windows\System32` 같은 시스템 폴더보다 사용자 폴더에 설치하는 것을 권장합니다. 기존 폴더를 옮길 경우 앱을 먼저 종료하고 `.local` 폴더도 함께 보관하세요.

## macOS / Linux

```sh
mkdir -p "$HOME/source"
cd "$HOME/source"
git clone --branch main https://github.com/purejomo/AstraAI.git
cd AstraAI
node --version
npm ci
npm run build
npm start
```

## 브라우저에서 사용하기

터미널에 `Ready`가 표시되면 **앱을 실행한 PC의 브라우저**에서 `http://localhost:3000`을 엽니다. 터미널을 닫거나 PC를 끄면 앱도 종료됩니다. 종료는 `Ctrl+C`입니다.

다시 시작할 때는 같은 설치 폴더에서 다음 명령만 실행하면 됩니다.

```powershell
# Windows PowerShell
npm.cmd start
```

```sh
# macOS / Linux
npm start
```

처음 시험할 때는 [README의 첫 학습팩 사용하기](../README.md#첫-학습팩-사용하기)를 따라 문제 직접 작성 → 저장 → 문제 풀이 → 오답 복습을 진행하세요. 앱을 열면 바로 내 학습실이 표시되며 관리자·학습자 전환 없이 사용할 수 있습니다.

## 업데이트

실행 중인 서버를 `Ctrl+C`로 종료하고 `.local` 폴더를 백업한 뒤, 설치 폴더에서 실행하세요.

```powershell
# Windows PowerShell
git pull --ff-only
npm.cmd ci
npm.cmd run build
npm.cmd start
```

```sh
# macOS / Linux
git pull --ff-only
npm ci
npm run build
npm start
```

`git pull --ff-only`가 중단되면 로컬 수정 내용이나 브랜치 상태를 먼저 확인하세요. 자동으로 초기화하거나 기존 학습 기록을 지울 필요는 없습니다.

## 이전 버전에서 업데이트한 경우

기존 `.local/study.json`을 그대로 사용합니다. 이전의 학습자 1 기록을 기본으로 이어 쓰며, 학습자 2·3의 기록도 보존합니다. 다른 이전 기록을 사용하려면 **설정 및 도움말 → 이전 버전 기록 이어 쓰기**에서 선택하세요. 이 메뉴는 해당 기록이 있는 설치본에만 표시됩니다. 한 번에 선택한 기록만 사용하며 합치거나 지우지 않습니다.

기존 비공개 초안도 문제은행에서 확인할 수 있습니다. 새로 저장한 문제는 게시 절차 없이 바로 학습할 수 있습니다. 이전 세션은 새 개인 학습실 세션으로 자동 전환됩니다.

## 저장 위치와 백업

기본 저장 위치는 설치 폴더의 `.local/study.json`입니다. 해당 파일은 학습팩·학습 기록·로컬 브라우저 세션을 포함하므로 다른 사람에게 코드와 함께 전달하지 마세요.

작성 중인 편집 내용은 브라우저에 임시 보관됩니다. 다른 브라우저·다른 주소에서는 보이지 않으며 브라우저 데이터를 지우면 사라집니다. 학습팩을 정식 저장하거나 **작성 중 JSON 내려받기**로 따로 보관하세요.

백업하려면 앱을 종료한 뒤 `.local` 폴더를 복사합니다. 복원할 때도 앱을 종료하고 저장 위치를 확인하세요. 저장 파일을 직접 편집하면 읽지 못할 수 있습니다. 백업본이 있다면 손상된 파일을 따로 보관한 뒤 정상 백업본으로 복원하세요.

설치본별로 다른 위치에 기록을 저장하려면 서버 실행 전에 지정합니다. 빌드는 한 번 완료되어 있어야 합니다.

```powershell
# Windows PowerShell
$env:ASTRA_DATA_DIR = "$env:USERPROFILE\AstraAI-data"
npm.cmd start
```

```sh
# macOS / Linux
ASTRA_DATA_DIR="$HOME/AstraAI-data" npm start
```

다음에 실행할 때도 같은 저장 위치를 지정해야 기존 기록이 보입니다. 실행 중인 두 앱에 같은 저장 폴더를 지정하지 마세요.

## 자주 만나는 오류

### `npm.ps1`을 실행할 수 없다는 오류

PowerShell의 `PSSecurityException` 또는 “이 시스템에서 스크립트를 실행할 수 없으므로 … npm.ps1 파일을 로드할 수 없습니다”는 `npm.cmd`를 명시해 해결할 수 있습니다.

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd start
```

관리자 PowerShell이나 `Set-ExecutionPolicy` 변경은 필요하지 않습니다. Windows에서는 `npm` 대신 `npm.cmd`, `npx` 대신 `npx.cmd`를 사용할 수 있습니다.

### 프로덕션 빌드를 찾지 못한다는 오류

`npm start` 전에 `npm run build`가 성공해야 합니다. Windows에서는 다음 순서입니다.

```powershell
npm.cmd run build
npm.cmd start
```

빌드가 실패했다면 오류를 해결한 뒤 다시 실행하세요.

### 3000번 포트를 이미 사용 중이라는 오류

같은 앱이 다른 터미널에서 실행 중인지 확인하고 해당 터미널에서 `Ctrl+C`로 종료하세요. 별도 포트가 필요하면 다음처럼 실행합니다.

```powershell
npm.cmd start -- --port 3001
```

이 경우 브라우저 주소는 `http://localhost:3001`입니다.

### 다른 PC에서 링크가 열리지 않아요

`localhost`는 주소를 입력한 PC 자신을 뜻합니다. 현재 버전은 설치한 PC에서만 접속하도록 되어 있습니다. 다른 사람이 자기 앱을 쓰려면 [독립 설치](SELF_HOSTING.md)를 하고, 하나의 앱을 함께 쓰려면 [온라인 운영](HOSTING.md)이 필요합니다.
