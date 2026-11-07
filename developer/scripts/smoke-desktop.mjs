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
  await page
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("button", { name: "학습팩 만들기", exact: true })
    .click();
  await page.getByLabel("학습팩 제목", { exact: true }).fill("앱 실행 확인");
  await page.getByLabel("학습 목표와 수준").fill("기초");
  await page.getByLabel("문항 수", { exact: true }).fill("3");
  await page
    .getByRole("button", { name: "프롬프트 만들기", exact: true })
    .click();
  await page.getByRole("button", { name: "프롬프트 복사하고 다음" }).click();
  await expect(
    page.getByRole("heading", { name: "ChatGPT에 자료와 함께 보내세요" }),
  ).toBeVisible();
  const copied = await instance.evaluate(({ clipboard }) =>
    clipboard.readText(),
  );
  if (
    !copied.includes("3문항") ||
    !copied.includes("study-pack.json") ||
    !copied.includes("앱 실행 확인")
  )
    throw new Error("Bundled prompt was not copied");
  // Verify the browser handoff without opening or contacting an external service.
  await instance.evaluate(({ shell }) => {
    globalThis.astraOpenedURLs = [];
    shell.openExternal = async (url) => {
      globalThis.astraOpenedURLs.push(url);
    };
  });
  await page.getByRole("link", { name: "ChatGPT 열기" }).click();
  await expect
    .poll(() => instance.evaluate(() => globalThis.astraOpenedURLs))
    .toEqual(["https://chatgpt.com/"]);
  await page.evaluate(() => {
    window.open("https://example.com/");
    window.open("https://chatgpt.com/?q=secret");
    window.open("file:///tmp/private");
  });
  expect(await instance.evaluate(() => globalThis.astraOpenedURLs)).toEqual([
    "https://chatgpt.com/",
  ]);
  expect(instance.windows()).toHaveLength(1);
  expect(new URL(page.url()).origin).toBe(origin);
  await page.getByRole("button", { name: "JSON 파일을 받았어요" }).click();
  await page
    .getByLabel("학습팩 JSON 파일")
    .setInputFiles(path.resolve("examples/sample-study-pack.json"));
  await page.getByLabel("내용과 정답을 확인했습니다.").check();
  await page.getByRole("button", { name: "학습팩 저장", exact: true }).click();
  await page
    .getByRole("button", { name: "바로 학습하기", exact: true })
    .click();
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
    .getByRole("button", { name: "학습팩 만들기", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "학습팩 제목", exact: true })
    .fill("재시작 후 이어 쓰는 초안");
  await page.getByLabel("학습 목표와 수준").fill("기초 복습");
  await page
    .getByRole("button", { name: "프롬프트 만들기", exact: true })
    .click();
  await page.getByRole("button", { name: "프롬프트 복사하고 다음" }).click();
  await expect(
    page.getByRole("heading", { name: "ChatGPT에 자료와 함께 보내세요" }),
  ).toBeVisible();
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
    .getByRole("button", { name: "학습팩 만들기", exact: true })
    .click();
  await expect(
    reopened.getByRole("heading", { name: "ChatGPT에 자료와 함께 보내세요" }),
  ).toBeVisible();
  await reopened.getByRole("button", { name: "이전", exact: true }).click();
  await reopened.getByRole("button", { name: "이전", exact: true }).click();
  await expect(
    reopened.getByRole("textbox", { name: "학습팩 제목", exact: true }),
  ).toHaveValue("재시작 후 이어 쓰는 초안");
  await reopened
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("button", { name: "오답과 복습", exact: true })
    .click();
  await expect(reopened.locator(".review")).toHaveCount(1);
  console.log(
    "Desktop smoke passed: packaged assets, protected renderer/API, GPT prompt, clipboard, browser handoff, JSON import, grading, single instance, shutdown and persisted state/prompt progress after restart.",
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
