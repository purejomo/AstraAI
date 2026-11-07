# 개발 문서

이 디렉터리는 코드 수정, 테스트, 설계와 작업 이력을 다룹니다. 설치해서 사용하는 사람을 위한 문서는 [README](../../README.md), [설치 안내](../INSTALLATION.md), [온라인 운영](../HOSTING.md), [독립 설치](../SELF_HOSTING.md)에 있습니다.

## 읽는 순서

1. [AGENTS.md](../../AGENTS.md): 저장소 작업 지침
2. [최종 PRD](PRD_FINAL.md): 기능과 수용 기준
3. [아키텍처](ARCHITECTURE.md): 저장소·API·인증 구조
4. [데이터 계약](../DATA_CONTRACT.md)와 [JSON Schema](../../schemas/study-pack.schema.json)
5. [구현 계획 및 검증 이력](IMPLEMENTATION_PLAN.md)
6. [Cloud 단독 개발 지침](CODEX_CLOUD_START.md), [온라인 전환 계획](ONLINE_ROADMAP.md)

기존 설계 문서의 경로는 `docs/development/` 아래로 이동했습니다. 현재 개인 PC용 앱의 인증과 저장 한계를 운영 기능이 완성된 것으로 표현하지 않습니다.

## 개발 서버

Node.js 22 이상, npm을 사용합니다.

```sh
npm ci
npm run dev
```

```powershell
# Windows PowerShell: 스크립트 실행 정책을 변경하지 않고 실행
npm.cmd ci
npm.cmd run dev
```

사용자가 따르는 설치 흐름은 `npm run build` → `npm start`입니다. 코드 수정 중에는 HMR을 제공하는 `npm run dev`를 사용합니다. 둘 다 기본적으로 로컬 인터페이스에 바인딩합니다.

## Codex Cloud

기존 체크아웃 `/workspace/AstraAI`를 사용합니다. 클라우드 작업은 이미 격리되어 있으므로 사용자의 명시적 요청 없이 Git worktree를 만들지 않습니다. 준비된 Node 22가 필요한 경우:

```sh
source /workspace/.astraai-tools/activate.sh
cd /workspace/AstraAI
npm ci
npm run dev
```

Cloud 안의 Desktop 브라우저에서 로컬 앱을 확인합니다. 다른 PC의 `localhost` 주소로 Cloud 서버에 접속할 수는 없습니다. 환경 게시와 웹 앱 배포는 별개입니다.

## 검사 명령

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Cloud에서는 기존 Chromium을 사용할 수 있습니다.

```sh
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

Windows에서 설치된 Chrome을 사용할 경우:

```powershell
$env:CHROMIUM_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
npm.cmd run test:e2e
```

E2E는 먼저 빌드한 앱을 포트 3100에서 시작하고 실행별 임시 데이터 디렉터리를 사용합니다. `test-results/`와 `playwright-report/`는 Git에서 제외됩니다. `agent-browser`가 없으면 저장소 지침에 따라 Playwright를 사용합니다. axe 자동 검사는 접근성 검증의 일부이며 실제 보조 기술 검사를 모두 대체하지 않습니다.

현재 CI는 PR 및 수동 실행에서 린트·타입·단위/API 테스트·빌드·브라우저 테스트를 수행합니다. 로컬 테스트와 원격 CI 결과는 구분해 기록합니다.

## 데이터와 실행 구조

- `src/lib/validation.ts`: Ajv 스키마와 교차 참조 검사
- `src/lib/api.ts`: 로컬 세션, 개인 문제은행, 수정 충돌 검사, 출제·채점, 이전 이력 보존
- `src/lib/learning.ts`: 서울 날짜 기준 복습 간격과 최근 10회 지표
- `src/lib/storage.ts`: `Storage.transaction` 인터페이스와 로컬 파일 어댑터
- `src/components/`: 개인 문제은행 편집기와 학습 화면

현재 파일 저장 어댑터는 **하나의 Next.js 프로세스용**입니다. Promise 큐로 변경을 직렬화하고 임시 파일을 원자적으로 교체합니다. 서버리스·다중 프로세스·공유 파일 시스템에는 사용할 수 없습니다. 손상된 기존 파일은 덮어쓰지 않고 오류를 반환합니다.

세션은 자동 발급하는 HttpOnly/SameSite=Strict 쿠키이며 인터넷 신원 확인이 아닙니다. 로컬 Host와 동일 Origin 검사를 유지합니다. 출제 DTO는 정답·해설을 제외하고, 서버가 제출을 채점합니다. 기존 저장본을 수정하지 않고 새 revision으로 보관하여 과거 정답을 유지합니다.

## Windows 앱

설치 파일 빌드·실행 검증·아티팩트 준비 절차는 [Windows 앱 패키징](DESKTOP.md)을 따릅니다. 사용자용 설명은 [Windows 앱 안내](../WINDOWS_APP.md)에 있습니다.

## 문서 유지

README에는 설치·사용·운영에 필요한 안내만 둡니다. 개발 명령, 테스트 결과, Cloud 설정, 내부 구조와 진행 이력은 이 디렉터리에 기록합니다. 사용자에게 영향을 주는 현재 제한은 사용자 문서에도 간단하고 정확하게 남깁니다.
