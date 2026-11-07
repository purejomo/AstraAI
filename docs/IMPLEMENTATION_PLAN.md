# 구현 및 검증 계획

## 선행사항

- 저장소: `purejomo/AstraAI` (Private, 쓰기 권한 확인)
- 계정: Vercel, Supabase 프로젝트의 사용자 승인/연결 필요
- 개발 PC: Windows PowerShell, Git, Node 22+, Chrome/Edge
- 개발 완료 목표: **오늘 핵심 기능 작동 검증**, 완전한 Astra 기능 복제는 별도 후속 작업

## 구현 순서

1. Next.js/TypeScript 초기화, ESLint, 기본 UI 토큰, CI 빌드.
2. Supabase 인증 및 관리자/학습자 3명 초대 전용 가입, RLS 정책.
3. DB 마이그레이션: packs, revisions, access, goals, attempts, reviews.
4. 관리자: 폼으로 학습팩 프롬프트 생성/복사 + ChatGPT 수동 업로드 안내.
5. 관리자: JSON import → Ajv validation → 참조 검사 → 문제 미리보기 → 게시.
6. 학습자: 학습팩 목록, 개념/요약/FAQ, 4지선다 퀴즈, 서버 채점.
7. 답안 시도/오답 및 다음 복습 날짜 저장, 모의고사, 플래시카드.
8. 오늘의 학습 계획 및 개념별 정답률 대시보드.
9. 데스크톱·모바일 반응형 QA 및 브라우저 자동 테스트.
10. Vercel 배포, 세 사람 별도 브라우저 계정 테스트.

## 완료 기준

- 관리자에서 샘플 학습팩을 게시한 뒤 학습자 계정에서 보임.
- 초대받지 않은 계정은 학습 자료/진도/관리자 화면 접근 불가.
- 각 학습자의 오답/진도/계획은 다른 계정에 노출되지 않음.
- 답안을 제출하면 서버가 채점하며 새로고침 후에도 기록이 남음.
- 잘못된 JSON/기본 구조 불일치/중복 ID/누락 개념 참조/잘못된 정답 인덱스 등 10가지 오류를 차단함.
- 문제를 풀기 전 정답이 API 응답에 노출되지 않음.
- API 호출이나 유료 과금이 필요한 기능이 없음.
- 1440/1024/768/390px에서 브라우저 화면 스크린샷 검토.
- 외부 접속 가능 여부는 배포 이후 실사용자 브라우저에서 확인.

## PowerShell 첫 준비

```powershell
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
# PowerShell 재시작 후
git --version
node --version
npm --version
git clone https://github.com/purejomo/AstraAI.git
cd AstraAI
```

Git 또는 Node가 이미 설치되어 있다면 해당 설치 명령은 생략. 앱 코드가 구현되기 전에는 `npm install` 및 `npm run dev`가 아직 동작하지 않음.

## 진행 관리

코드와 문서는 커밋 이력으로 관리. 작업 우선순위는 P0(핵심 학습 루프), P1(플래시카드·모의고사), P2(PWA·음성 등)로 구분. 출시/권한 변경/유료 서비스 시작/기존 자료 삭제는 사용자 승인 후 진행.
