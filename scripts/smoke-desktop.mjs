import { _electron as electron, expect } from "@playwright/test";
import { mkdtemp, readFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import electronPath from "electron";

const directory = await mkdtemp(path.join(tmpdir(), "AstraAI smoke 경로 "));
const executablePath = process.env.ASTRA_DESKTOP_EXECUTABLE || electronPath;
const args = process.env.ASTRA_DESKTOP_EXECUTABLE
  ? []
  : [path.resolve("desktop")];
// Cloud containers cannot provide Chromium's OS sandbox. This is a test-only
// launch option; the shipped app never appends no-sandbox itself.
if (process.env.ASTRA_TEST_NO_SANDBOX === "1") args.unshift("--no-sandbox");
const env = {
  ...process.env,
  ASTRA_DESKTOP_HOME: directory,
  ASTRA_DESKTOP_TEST: "1",
};
delete env.ELECTRON_RUN_AS_NODE;
if (process.platform === "win32") {
  // Verify the installed app without Node.js or Git on its executable search path.
  for (const key of Object.keys(env))
    if (key.toLowerCase() === "path") delete env[key];
  env.PATH = `${process.env.SystemRoot};${process.env.SystemRoot}\\System32`;
}
let instance;
let origin;
const errors = [];
async function launch() {
  instance = await electron.launch({
    executablePath,
    args,
    env,
    timeout: 45000,
  });
  instance.process().stderr.on("data", (chunk) => {
    if (/Error:|failed/i.test(chunk.toString())) errors.push(chunk.toString());
  });
  const page = await instance.firstWindow({ timeout: 45000 });
  page.on("pageerror", (e) => errors.push(e.message));
  await expect(
    page.getByRole("heading", { name: "오늘의 학습", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  origin = new URL(page.url()).origin;
  return page;
}
try {
  const page = await launch();
  const preferences = await instance.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences(),
  );
  if (
    !preferences.sandbox ||
    !preferences.contextIsolation ||
    preferences.nodeIntegration
  )
    throw new Error("Unsafe renderer preferences");
  if ((await fetch(`${origin}/api/bootstrap`)).status !== 403)
    throw new Error("Desktop API accepted a request outside the app");
  await page.evaluate(() =>
    navigator.clipboard.writeText("AstraAI clipboard check"),
  );
  if (
    (await instance.evaluate(({ clipboard }) => clipboard.readText())) !==
    "AstraAI clipboard check"
  )
    throw new Error("Clipboard copy failed");
  const prompt = await page.evaluate(async () => {
    const response = await fetch("/api/library/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "앱 실행 확인", level: "기초", count: 3 }),
    });
    return (await response.json()).prompt;
  });
  if (!prompt?.includes("3문항")) throw new Error("Bundled prompt is missing");
  await page
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("button", { name: "나의 문제은행", exact: true })
    .click();
  await page
    .getByRole("button", { name: "샘플로 시작하기", exact: true })
    .click();
  await page.getByLabel("내용과 정답을 확인했습니다.").check();
  await page
    .getByRole("button", { name: "내 학습팩에 저장", exact: true })
    .click();
  const exportedFile = path.join(directory, "exported-study-pack.json");
  await instance.evaluate(({ session }, file) => {
    session.defaultSession.once("will-download", (_event, item) =>
      item.setSavePath(file),
    );
  }, exportedFile);
  await page
    .getByRole("button", { name: "JSON 내보내기", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        JSON.parse(await readFile(exportedFile, "utf8").catch(() => "{}"))
          .schema_version,
    )
    .toBe("1.0");
  await page.getByRole("button", { name: "학습하기", exact: true }).click();
  await page.getByRole("tab", { name: "문제 풀기", exact: true }).click();
  await page.getByRole("button", { name: "퀴즈 시작", exact: true }).click();
  await page.getByRole("radio").nth(1).check();
  await page
    .getByRole("button", { name: "답안 제출하고 채점", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "1문항 중 0개 정답", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("학습 기록 저장 완료", { exact: true }),
  ).toBeVisible();
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/desktop-app.png" });
  const second = spawn(executablePath, args, { env, stdio: "ignore" });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      second.kill();
      reject(new Error("Second instance did not exit"));
    }, 10000);
    second.on("exit", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error(`Second instance exited ${code}`));
    });
    second.on("error", reject);
  });
  if (instance.windows().length !== 1)
    throw new Error("Single-instance lock failed");
  // Leave an incomplete draft to verify stable origin and Chromium profile reuse.
  await page
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("button", { name: "나의 문제은행", exact: true })
    .click();
  await page
    .getByRole("button", { name: "새 학습팩 만들기", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "학습팩 제목", exact: true })
    .fill("재시작 후 이어 쓰는 초안");
  const previousOrigin = origin;
  await instance.close();
  instance = undefined;
  await expect
    .poll(
      async () => {
        try {
          await fetch(origin, { signal: AbortSignal.timeout(500) });
          return false;
        } catch {
          return true;
        }
      },
      { timeout: 10000 },
    )
    .toBe(true);
  const state = JSON.parse(
    await readFile(path.join(directory, "data/study.json"), "utf8"),
  );
  if (
    state.packs.length !== 1 ||
    state.runs[0]?.grades?.[0]?.correct !== false ||
    state.reviews.length !== 1
  )
    throw new Error("Saved learning state is incomplete");
  const reopened = await launch();
  if (origin !== previousOrigin)
    throw new Error("App origin changed after restart");
  await expect(reopened.locator(".pack-card")).toHaveCount(1);
  await reopened
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("button", { name: "나의 문제은행", exact: true })
    .click();
  await expect(
    reopened.getByRole("textbox", { name: "학습팩 제목", exact: true }),
  ).toHaveValue("재시작 후 이어 쓰는 초안");
  await reopened
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("button", { name: "오답과 복습", exact: true })
    .click();
  await expect(reopened.locator(".review")).toHaveCount(1);
  console.log(
    "Desktop smoke passed: packaged assets, protected renderer/API, authoring, grading, single instance, shutdown and persisted state/draft after restart.",
  );
} catch (error) {
  console.error(errors.join("\n"));
  console.error(
    await readFile(path.join(directory, "desktop-error.log"), "utf8").catch(
      () => "",
    ),
  );
  throw error;
} finally {
  await instance?.close();
  await rm(directory, { recursive: true, force: true });
}
