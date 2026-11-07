# 개발자 안내

앱 코드와 개발에 필요한 파일은 이 폴더에 있습니다. 일반 사용자는 [설치 파일](../AstraAI-Setup.exe)과 [사용 설명서](../docs/사용설명서.md)만 사용합니다.

## 실행

Node.js 22.12 이상을 준비하고 저장소의 `developer` 폴더에서 실행합니다.

```powershell
cd developer
npm.cmd ci
npm.cmd run dev
```

브라우저에서 `http://127.0.0.1:3000`을 엽니다. Windows에서는 `npm.cmd`를 사용하면 PowerShell의 `npm.ps1` 실행 정책 오류를 피할 수 있습니다. macOS/Linux에서는 `npm`을 사용합니다.

최적화 빌드는 `npm.cmd run build`, 실행은 `npm.cmd start`입니다.

## 코드 위치

| 경로                             | 내용                                  |
| -------------------------------- | ------------------------------------- |
| `src/app`, `src/components`      | Next.js 화면과 학습·문제은행 UI       |
| `src/lib`                        | API, 저장소, 채점·복습, JSON 검증     |
| `desktop`                        | Electron 창, 내장 서버 실행과 종료    |
| `scripts`                        | 설치 파일 빌드 준비·검증              |
| `schemas`, `examples`, `prompts` | 학습팩 형식, 예제, 수동 생성 프롬프트 |
| `tests`, `e2e`                   | 단위/API/저장소 및 브라우저 테스트    |
| `docs`                           | 현재 아키텍처와 데이터 형식           |

[아키텍처](docs/ARCHITECTURE.md) · [학습팩 형식](docs/DATA_CONTRACT.md) · [배포 파일 관리](docs/DISTRIBUTION.md)

## 검사

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd run verify:installer
```

웹 테스트는 1440/390px의 작성·학습 흐름, 중간 화면 폭, 키보드와 접근성을 확인합니다. 테스트 데이터는 임시 폴더에 저장합니다.

## Windows 설치 파일 빌드

Windows에서 실행합니다.

```powershell
npm.cmd run desktop:win
```

결과는 `release/AstraAI-Setup-0.2.1-x64.exe`입니다. 설치한 뒤 다음 명령으로 실제 앱을 검사합니다.

```powershell
$env:ASTRA_DESKTOP_EXECUTABLE = "$env:LOCALAPPDATA\Programs\AstraAI\AstraAI.exe"
npm.cmd run test:desktop
```

데스크톱 테스트는 별도 임시 프로필을 사용하며 앱의 PATH에서 Git·Node.js 경로를 제외합니다. 문제 등록·내보내기·채점·복습, 단일 실행, 종료, 재실행 후 기록과 초안 보존을 확인합니다.

수정은 `main`에 직접 반영합니다. 루트의 사용자 안내에 개발 명령이나 작업 이력을 추가하지 않습니다.

## 이용 조건

[라이선스](../LICENSE)는 비상업적 사용·수정을 허용합니다. 공식 원본 설치 파일은 무료로 공유할 수 있습니다. 상업적 이용과 소스·수정본 재배포는 별도 허락이 필요합니다. 이 조건은 사용자가 작성한 학습 자료에 대한 권리를 변경하지 않습니다.
