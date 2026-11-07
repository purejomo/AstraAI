# 설치 파일 관리

일반 사용자는 `main` 루트의 `AstraAI-Setup.exe` 하나를 내려받아 설치한다. README 다운로드 링크는 항상 이 파일을 가리킨다. 검증용 Actions artifact를 사용자 배포 경로로 사용하지 않는다.

## 파일과 무결성

실행 파일은 GitHub 일반 Git 파일 크기 제한을 넘으므로 Git LFS로 보관한다. [distribution.json](../distribution.json)에 배포 버전·크기·SHA-256을 기록한다. 사용자 다운로드에는 LFS 설치가 필요 없다. 개발자가 파일을 가져올 때는 저장소 루트에서 `git lfs pull`을 실행한다.

```powershell
cd developer
npm.cmd run verify:installer
```

이 검사는 실제 Windows 실행 파일인지, LFS 포인터만 남은 상태가 아닌지, 기록된 SHA-256과 일치하는지 확인한다.

## 교체 절차

1. `package.json`과 `desktop/package.json`의 버전을 함께 올리고 `package-lock.json`을 갱신한다.
2. `npm.cmd run desktop:win`으로 빌드하고 설치한 앱의 `npm.cmd run test:desktop` 검사를 통과시킨다.
3. 빌드한 설치 파일을 루트의 `AstraAI-Setup.exe`로 복사하고 `distribution.json`의 버전·크기·SHA-256을 갱신한다.
4. `npm.cmd run verify:installer` 후 `main`에 직접 커밋·푸시한다. Git LFS 업로드도 성공했는지 확인한다.
5. Windows CI에서 새로 빌드한 앱과 루트에서 내려받은 배포 파일의 실제 설치·실행 결과를 확인한다.

설치 파일의 제품 이름과 appId, 사용자 데이터 경로를 유지한다. 자동 업데이트와 유료 코드 서명은 구성하지 않았다. 저장소 접근 권한과 설치 후 앱 사용은 별개이며, 설치 파일을 전달받은 사람은 로그인 없이 사용할 수 있다.

## 라이선스 동봉

루트 `LICENSE`가 프로젝트의 비상업적 이용 조건이다. 빌드 시 설치 안내와 앱 패키지에 포함한다. `prepare-licenses.mjs`는 서버에 실제 포함되는 패키지의 라이선스와 번들 구성 요소의 고지를 수집해 설치 경로의 `resources/licenses`에 넣는다. Electron·Chromium 고지도 설치 파일에 포함된다. 외부 구성 요소에는 각자의 라이선스가 적용된다.
