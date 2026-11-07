import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import sample from "../examples/sample-study-pack.json";
async function stage(
  page: Page,
  title: string,
  testInfo: TestInfo,
  name: string,
  checkAccessibility = false,
) {
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  if (checkAccessibility)
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath(`${name}.png`),
    fullPage: true,
  });
}
const jsonFile = (data: unknown) => ({
  name: "study-pack.json",
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify(data)),
});
for (const width of [1440, 390])
  test(`GPT prompt → JSON → quiz → review, cards, exam and plans at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        !message.text().includes("400 (Bad Request)")
      )
        errors.push(message.text());
    });
    const title = `운영체제 학습 · ${width}px`;
    async function nav(label: string) {
      if (width === 390)
        await page
          .getByRole("button", { name: "메뉴 열기", exact: true })
          .click();
      await page
        .getByRole("navigation", { name: "주 메뉴" })
        .getByRole("button", { name: label, exact: true })
        .click();
    }
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "오늘의 학습", exact: true }),
    ).toBeVisible();
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);
    await nav("학습팩 만들기");
    await page.getByLabel("학습팩 제목", { exact: true }).fill(title);
    await page.getByLabel("학습 목표와 수준").fill("대학 기초");
    await page.getByLabel("문항 수", { exact: true }).fill("1");
    await page.reload();
    await nav("학습팩 만들기");
    await expect(page.getByLabel("학습팩 제목", { exact: true })).toHaveValue(
      title,
    );
    await stage(
      page,
      "어떤 문제를 만들까요?",
      testInfo,
      `conditions-${width}`,
      width === 390,
    );
    await expect(
      page.getByRole("button", { name: "샘플로 시작하기" }),
    ).toHaveCount(0);
    await expect(page.getByLabel("문제 내용", { exact: true })).toHaveCount(0);
    await page
      .getByRole("button", { name: "프롬프트 만들기", exact: true })
      .click();
    await stage(
      page,
      "프롬프트를 복사하세요",
      testInfo,
      `prompt-${width}`,
      width === 390,
    );
    await page.getByRole("button", { name: "프롬프트 복사하고 다음" }).click();
    await stage(
      page,
      "ChatGPT에 자료와 함께 보내세요",
      testInfo,
      `gpt-${width}`,
      width === 390,
    );
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain(title);
    expect(copied).toContain("study-pack.json");
    expect(copied).toContain("실제 다운로드 링크");
    await expect(
      page.getByRole("link", { name: "ChatGPT 열기" }),
    ).toHaveAttribute("href", "https://chatgpt.com/");
    await page.reload();
    await nav("학습팩 만들기");
    await expect(
      page.getByRole("heading", { name: "ChatGPT에 자료와 함께 보내세요" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "JSON 파일을 받았어요" }).click();
    await stage(
      page,
      "받은 JSON 파일을 가져오세요",
      testInfo,
      `import-${width}`,
      width === 390,
    );
    await page
      .getByLabel("학습팩 JSON 파일")
      .setInputFiles(jsonFile({ ...sample, title }));
    await stage(
      page,
      "문제와 정답을 확인하세요",
      testInfo,
      `preview-${width}`,
      width === 390,
    );
    await expect(
      page.getByRole("button", { name: "학습팩 저장", exact: true }),
    ).toBeDisabled();
    await page.getByLabel("내용과 정답을 확인했습니다.").check();
    await page
      .getByRole("button", { name: "학습팩 저장", exact: true })
      .click();
    await stage(
      page,
      "학습팩을 저장했어요",
      testInfo,
      `saved-${width}`,
      width === 390,
    );
    await page
      .getByRole("button", { name: "바로 학습하기", exact: true })
      .click();
    await nav("나의 학습팩");
    await page
      .locator(".pack-card")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) })
      .click();
    await expect(
      page.getByRole("heading", { name: "운영체제의 역할", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "읽고 이해했어요" }).click();
    await expect(
      page.getByRole("button", { name: "학습 완료", exact: true }),
    ).toBeDisabled();
    await page.getByRole("tab", { name: "문제 풀기", exact: true }).click();
    await page.getByRole("button", { name: "퀴즈 시작", exact: true }).click();
    await expect(
      page.getByRole("heading", {
        name: sample.questions[0].question,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "답안 제출하고 채점" }),
    ).toBeDisabled();
    await page.getByRole("radio").nth(1).check();
    await page.screenshot({
      path: testInfo.outputPath(`quiz-${width}.png`),
      fullPage: true,
    });
    await page.reload();
    await page.getByRole("button", { name: "진행 중 학습 이어가기" }).click();
    await expect(page.getByRole("radio").nth(1)).toBeChecked();
    await page.getByRole("button", { name: "답안 제출하고 채점" }).click();
    await expect(
      page.getByRole("heading", { name: "1문항 중 0개 정답", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("학습 기록 저장 완료", { exact: true }),
    ).toBeVisible();
    await nav("오답과 복습");
    const review = page
      .locator(".review")
      .filter({ has: page.getByText(title, { exact: true }) })
      .first();
    await expect(review).toBeVisible();
    await review.getByRole("button", { name: "이 문제 다시 풀기" }).click();
    await page.getByRole("radio").nth(0).check();
    await page.getByRole("button", { name: "답안 제출하고 채점" }).click();
    await expect(
      page.getByRole("heading", { name: "1문항 중 1개 정답", exact: true }),
    ).toBeVisible();
    await nav("나의 학습팩");
    await page
      .locator(".pack-card")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) })
      .click();
    await page.getByRole("tab", { name: "플래시카드", exact: true }).click();
    await page.getByRole("button", { name: "카드 뒤집기" }).click();
    await expect(
      page.getByText(sample.flashcards[0].back, { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "기억했어요", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "카드 뒤집기" }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "모의고사", exact: true }).click();
    await page
      .getByRole("button", { name: "모의고사 시작", exact: true })
      .click();
    await expect(page.getByRole("timer")).toBeVisible();
    await page.getByRole("radio").nth(0).check();
    await page.getByRole("button", { name: "답안 제출하고 채점" }).click();
    await expect(
      page.getByRole("heading", { name: "1문항 중 1개 정답", exact: true }),
    ).toBeVisible();
    await nav("학습 계획");
    const goal = page
      .locator("form.panel")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
    await goal.getByLabel("하루 공부 시간 (분)").fill("30");
    await goal.getByRole("button", { name: "학습 목표 저장" }).click();
    await expect(goal.getByLabel("하루 공부 시간 (분)")).toHaveValue("30");
    await nav("학습 현황");
    await expect(
      page.getByRole("heading", { name: "최근 학습 기록", exact: true }),
    ).toBeVisible();
    await expect(
      page.locator(".history-row").filter({ hasText: title }),
    ).toHaveCount(3);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "오늘의 학습", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`dashboard-${width}.png`),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await nav("학습 현황");
    await expect(
      page.locator(".history-row").filter({ hasText: title }),
    ).toHaveCount(3);
    expect(errors).toEqual([]);
  });
test("local session boundary and tablet layout", async ({ page }) => {
  expect((await page.request.get("/api/library/sample")).status()).toBe(401);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "오늘의 학습", exact: true }),
  ).toBeVisible();
  expect((await page.request.get("/api/library/sample")).status()).toBe(200);
  for (const width of [1024, 768]) {
    await page.setViewportSize({ width, height: 1024 });
    await expect(
      page.getByRole("heading", { name: "오늘의 학습", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});

test("keyboard navigation and WCAG accessibility on dashboard and pack creation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "오늘의 학습", exact: true }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("button", { name: "학습팩 만들기", exact: true })
    .click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "메뉴 열기", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "메뉴 열기", exact: true }),
  ).toBeFocused();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("multi-question exam restores navigation and automatically submits unanswered questions", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "오늘의 학습", exact: true }),
  ).toBeVisible();
  const fixture = {
    ...sample,
    title: "모의고사 다중 문항 검증",
    questions: Array.from({ length: 3 }, (_, i) => ({
      ...sample.questions[0],
      id: `exam_${i}`,
      question: `문항 ${i + 1}: ${sample.questions[0].question}`,
    })),
  };
  const headers = { origin: "http://127.0.0.1:3100" };
  const imported = await page.request.post("/api/library/save", {
    headers,
    data: { raw: JSON.stringify(fixture) },
  });
  expect(imported.status()).toBe(201);
  await page.reload();
  await page
    .locator(".pack-card")
    .filter({
      has: page.getByRole("heading", { name: fixture.title, exact: true }),
    })
    .click();
  await page.getByRole("tab", { name: "개념 학습", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("tab", { name: "모의고사", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByLabel("제한 시간 (분)").fill("1");
  await page
    .getByRole("button", { name: "모의고사 시작", exact: true })
    .click();
  await page.getByRole("radio").nth(0).check();
  await page.getByRole("button", { name: "다음 문항", exact: true }).click();
  await page.getByRole("radio").nth(1).check();
  await page.getByRole("button", { name: "이전 문항", exact: true }).click();
  await expect(page.getByRole("radio").nth(0)).toBeChecked();
  await page.reload();
  await page.getByRole("button", { name: "진행 중 학습 이어가기" }).click();
  await expect(page.getByRole("radio").nth(0)).toBeChecked();
  await page.clock.install();
  await page.clock.fastForward(65000);
  await expect(
    page.getByRole("heading", { name: "3문항 중 1개 정답", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("내 답: 미응답 / 시간 만료", { exact: true }),
  ).toHaveCount(1);
});

test("import recovery, one-question preview and saving despite a failed list refresh", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "학습팩 만들기", exact: true })
    .click();
  await page.getByRole("button", { name: "이미 JSON 파일이 있어요" }).click();
  const upload = page.getByLabel("학습팩 JSON 파일");
  await upload.setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{broken"),
  });
  await expect(page.locator("#main").getByRole("alert")).toContainText(
    "JSON 문법",
  );
  await expect(page.locator("#main").getByRole("alert")).toContainText(
    "ChatGPT에 아래 오류",
  );
  await upload.setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from([0xff]),
  });
  await expect(page.locator("#main").getByRole("alert")).toContainText("UTF-8");
  const fixture = {
    ...sample,
    title: "파일 확인 후 저장",
    questions: Array.from({ length: 3 }, (_, i) => ({
      ...sample.questions[0],
      id: `preview_${i}`,
      question: `미리보기 문제 ${i + 1}`,
    })),
  };
  await upload.setInputFiles(jsonFile(fixture));
  await expect(
    page.getByRole("heading", { name: "미리보기 문제 1", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "미리보기 문제 2", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "이전 문제", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "다음 문제", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "미리보기 문제 2", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "다음 문제", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "다음 문제", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("내용과 정답을 확인했습니다.").check();
  await page.getByRole("button", { name: "다른 JSON 파일 선택" }).click();
  await upload.setInputFiles(jsonFile(fixture));
  await expect(
    page.getByLabel("내용과 정답을 확인했습니다."),
  ).not.toBeChecked();
  await page.reload();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "학습팩 만들기", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "받은 JSON 파일을 가져오세요" }),
  ).toBeVisible();
  await upload.setInputFiles(jsonFile(fixture));
  await page.getByLabel("내용과 정답을 확인했습니다.").check();
  await page.route("**/api/library/save", (route) =>
    route.fulfill({ status: 500, json: { error: "저장 재시도 확인" } }),
  );
  await page.getByRole("button", { name: "학습팩 저장", exact: true }).click();
  await expect(page.locator("#main").getByRole("alert")).toContainText(
    "저장 재시도 확인",
  );
  await page.unroute("**/api/library/save");
  await page.route("**/api/bootstrap", (route) =>
    route.fulfill({ status: 500, json: { error: "목록 갱신 실패" } }),
  );
  let saves = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/library/save")) saves++;
  });
  await page.getByRole("button", { name: "학습팩 저장", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "학습팩을 저장했어요" }),
  ).toBeVisible();
  await expect(page.locator("#main").getByRole("alert")).toContainText(
    "학습팩은 저장됐습니다",
  );
  await expect(
    page.getByRole("button", { name: "학습팩 저장", exact: true }),
  ).toHaveCount(0);
  await page.unroute("**/api/bootstrap");
  await page.getByRole("button", { name: "바로 학습하기" }).click();
  await expect(
    page.getByRole("tab", { name: "문제 풀기", exact: true }),
  ).toBeVisible();
  expect(saves).toBe(1);
  const data = await (await page.request.get("/api/bootstrap")).json();
  expect(
    data.packs.filter((p: { title: string }) => p.title === fixture.title),
  ).toHaveLength(1);
});

test("prompt retry and clipboard fallback remain usable on narrow screens", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => {
          throw new Error("denied");
        },
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "메뉴 열기", exact: true }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "학습팩 만들기", exact: true })
    .click();
  await page.getByLabel("학습팩 제목", { exact: true }).fill("자료구조");
  await page.getByLabel("학습 목표와 수준").fill("기초");
  await page.route("**/api/library/prompt", (route) =>
    route.fulfill({ status: 500, json: { error: "다시 요청해 주세요" } }),
  );
  await page
    .getByRole("button", { name: "프롬프트 만들기", exact: true })
    .click();
  await expect(page.locator("#main").getByRole("alert")).toContainText(
    "다시 요청",
  );
  await page.unroute("**/api/library/prompt");
  await page
    .getByRole("button", { name: "프롬프트 만들기", exact: true })
    .click();
  await page.getByRole("button", { name: "프롬프트 복사하고 다음" }).click();
  await expect(page.getByLabel("GPT에 보낼 프롬프트")).toBeVisible();
  await expect(page.getByLabel("GPT에 보낼 프롬프트")).toHaveValue(/자료구조/);
  await stage(page, "프롬프트를 복사하세요", testInfo, "manual-copy-320", true);
  await page.getByRole("button", { name: "직접 복사했어요 · 다음" }).click();
  await stage(
    page,
    "ChatGPT에 자료와 함께 보내세요",
    testInfo,
    "gpt-320",
    true,
  );
  await page.getByRole("button", { name: "JSON 파일을 받았어요" }).click();
  await stage(
    page,
    "받은 JSON 파일을 가져오세요",
    testInfo,
    "import-320",
    true,
  );
});
