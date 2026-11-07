# Instructions for Codex: AstraAI

AstraAI is a noncommercial personal study app. Anyone with repository access can install an independent copy, author their own concepts/questions/cards, and study them. There is no operator-upload dependency, administrator/learner role switch, invitation requirement or three-learner limit in the current product. Source visibility and licensing have not been decided.

## Mandatory starting context

Read `README.md`, `docs/development/PRD_FINAL.md`, `docs/development/ARCHITECTURE.md`, `docs/DATA_CONTRACT.md`, `docs/development/IMPLEMENTATION_PLAN.md`, `schemas/study-pack.schema.json`, and `prompts/GENERATE_STUDY_PACK.md` before coding. Update them when a technical decision changes. Current personal-workspace requirements supersede historical operator-publication requirements.

## Build, don't only plan

Preserve the working Next.js + TypeScript study workflow and calm responsive interface. The core loop is direct authoring or JSON import -> validation/preview -> save -> immediate study -> server grading -> wrong-answer review/goals/dashboard. Flashcards and timed exams are implemented. Editing creates immutable revisions; earlier attempts and reviews retain their original answers. Keep JSON export/import portable across independent installations.

No live LLM, paid AI API, account token sharing, GPU inference, or direct ChatGPT login in the app. Optional prompt preparation lets the user manually attach their own material to ChatGPT and import its JSON. Direct authoring must work without ChatGPT.

## Working method

- Work in a task branch. Keep `main` stable. Commit cohesive changes and open/update a PR when functional.
- Inspect code, implement, run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and applicable browser tests. Fix failures.
- Use `agent-browser` for real browser checks if available (`agent-browser skills get core` first); otherwise use Playwright and report the fallback. Check authoring, validation, quizzes, 1440px/390px screenshots and browser errors.
- Use Taste Skill as inspiration for typography, spacing, alignment, contrast, restrained color and accessible motion. Do not clone Astra branding/assets/code.
- The current app is local-only and single-process. A local session cookie is not Internet authentication. Keep loopback Host and same-Origin mutation checks. Real authentication and hosted persistence are future work.
- Preserve existing `.local` data. Previous demo histories remain separate; `historyId` selects which existing history to continue. Never merge or delete them silently. Legacy storage fields are retained for compatibility.
- No paid plan, charge, destructive action, user-data deletion, public release, external account connection or security relaxation without owner approval. Code changes/commits/PRs are authorized by the user's request.
- Never commit `.env`, tokens, cookies, keys, user documents or private data. Use isolated temporary storage for tests.
- Update `docs/development/IMPLEMENTATION_PLAN.md` after functional milestones with results, blockers and next steps.

## Documentation layout

README is for installation/use/operation. Development commands, tests, architecture and progress belong in `docs/development/`. User guides are `docs/INSTALLATION.md`, `docs/QUESTION_BANK.md`, `docs/SELF_HOSTING.md`, and `docs/HOSTING.md`. Do not present unimplemented online deployment as ready.

## Completion evidence

Working personal authoring/import/edit/export/study loop; invalid input rejection; responsive UI; local request/session guards; revision/history preservation; verified grading/review scheduling; no AI API use; written validation and PR link. Clearly distinguish local checks from remote CI and future online work.
