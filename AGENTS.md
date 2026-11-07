# Instructions for Codex: AstraAI

This repository is a noncommercial private study app for exactly 3 invited learners and 1 administrator.

## Mandatory starting context
Read `README.md`, `docs/PRD_FINAL.md`, `docs/ARCHITECTURE.md`, `docs/DATA_CONTRACT.md`, `docs/IMPLEMENTATION_PLAN.md`, `schemas/study-pack.schema.json`, and `prompts/GENERATE_STUDY_PACK.md` before coding. These are the agreed source of truth; update them when a technical decision changes.

## Build, don't only plan
The app has not been implemented yet. Use Next.js + TypeScript and a calm, typographic responsive interface. Implement and test the end-to-end workflow: admin prompt generation -> ChatGPT manual output -> study-pack.json import/validation/preview/publication -> invited learner login -> concept study/quiz/server-side grading -> wrong-answer review/learning goals/dashboard. Add flashcards and mock exams once the full loop is reliable. Use `examples/sample-study-pack.json` in tests.

No live LLM, OpenAI API, account token sharing, GPU inference, or direct ChatGPT login in the app. The admin manually uploads source material to their own ChatGPT and imports the generated JSON into the app. Do not present rules-based responses as realtime AI.

## Working method
- Work in an isolated `feat/mvp` or task branch. Keep `main` stable. Commit cohesive changes and open a PR for review when functional.
- Make a short internal implementation checklist and work through it with minimal interruption. Inspect code, implement, run `npm run lint`, `npm test`, `npm run build`, and browser tests where applicable. Fix failures, not just report them.
- Use `agent-browser` for real browser checks: app opening, navigation, form validation, quiz completion, 1440px and 390px screenshots, browser console errors. Before use, run `agent-browser skills get core` if available. If unavailable, use Playwright and report clearly.
- Use Taste Skill as inspiration for intentional typography, spacing, alignment, contrast, restrained color, accessible motion. Do not clone Astra branding, assets, or code.
- Mark test/demo/mocked flows distinctly. Never claim live multi-user auth or persistent data is functioning unless tested against configured services.
- If Supabase/Vercel credentials are missing, implement interfaces and local sample-data demo mode first, document exact secrets/configuration required, then wait for authorization. Do not invent credentials.
- No paid plan or charge, destructive action, user-data deletion, public production release, or security relaxation without explicit owner approval.
- Never commit `.env`, tokens, passwords, cookies, service-role keys, user documents, or logs containing secrets.
- After each functional milestone update `docs/IMPLEMENTATION_PLAN.md` with completed items, command outputs, remaining blockers, and the next task.
- Keep autonomous work progressing when technically possible, but stop and request approval when identity, deployment rights, billing, or irreversible actions are needed.

## Completion evidence
Locally working app with documented setup; valid and invalid JSON import tests; responsive UI; protected admin-only routes; independently separated records for invited users after Supabase integration; verified correct grading and review scheduling; no OpenAI API usage; written test results and PR link. Do not falsely report any incomplete item as done.
