# Development instructions

- The product is a Windows personal study app installed from the single root `AstraAI-Setup.exe`.
- Keep the root README short: download, install, open the app. `docs/` is only for end users. All source, build configuration, tests and technical information belong under `developer/`.
- Read `README.md`, `docs/ARCHITECTURE.md` and `docs/DATA_CONTRACT.md` in this directory before editing app code.
- Work directly on `main`. Do not create feature branches or pull requests unless the owner explicitly asks. Retired plans, conversational progress logs and superseded specifications do not belong in the repository.
- Run commands from `developer/`: lint, typecheck, unit tests, production build and applicable Playwright tests. Windows CI verifies both the rebuilt app and the exact installer distributed in the root.
- Keep the root executable and `distribution.json` synchronized. The installer is stored with Git LFS because it exceeds GitHub's ordinary file limit. Check the actual binary after downloading it; a pointer is not an installer.
- Keep pack creation focused on conditions -> copy prompt -> ChatGPT generates a downloadable JSON file -> import -> review/save -> study -> grading -> review. Show one task per screen. Do not add manual question editors or unrelated features. Preserve responsive accessibility.
- Preserve installed user data. Do not weaken loopback Host/Origin checks, per-launch desktop tokens, renderer isolation or sandboxing. Use isolated temporary data for tests.
- No paid service, repository visibility change, external deployment, or environment publication unless authorized by the owner. Never commit credentials or personal study data.
