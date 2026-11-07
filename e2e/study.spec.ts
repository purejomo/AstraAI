import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import sample from "../examples/sample-study-pack.json";
for (const width of [1440, 390])
  test(`admin import → learner quiz → review, cards, exam and plans at ${width}px`, async ({
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
    await page.getByRole("button", { name: /관리자 프롬프트/ }).click();
    await expect(
      page.getByRole("heading", { name: "학습팩 만들기" }),
    ).toBeVisible();
    await page
      .getByText("01 · ChatGPT에 사용할 프롬프트 만들기", { exact: true })
      .click();
    await page.getByLabel("학습팩 제목", { exact: true }).fill("운영체제");
    await page.getByLabel("학습 목표와 수준").fill("대학 2학년");
    await page
      .getByRole("button", { name: "프롬프트 생성", exact: true })
      .click();
    await expect(page.getByLabel("생성된 프롬프트")).toHaveValue(/운영체제/);
    await page.getByLabel("학습팩 JSON 파일").setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from("{broken"),
    });
    await page.getByRole("button", { name: "검증하고 미리보기" }).click();
    await expect(page.locator("#main").getByRole("alert")).toContainText(
      "JSON 문법",
    );
    await page.getByLabel("학습팩 JSON 파일").setInputFiles({
      name: "study-pack.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ ...sample, title })),
    });
    await page.getByRole("button", { name: "검증하고 미리보기" }).click();
    await expect(
      page.getByText("구조 검증 통과", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "검수한 초안 저장" }),
    ).toBeDisabled();
    await page.getByLabel("내용과 정답을 검수했습니다.").check();
    await page.getByRole("button", { name: "검수한 초안 저장" }).click();
    const managed = page
      .locator(".managed-pack")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
    await expect(managed).toBeVisible();
    await expect(managed).toContainText("비공개");
    await managed.getByRole("button", { name: "v1 · 3명에게 게시" }).click();
    await expect(managed).toContainText("게시 중");
    await page.screenshot({
      path: testInfo.outputPath(`admin-${width}.png`),
      fullPage: true,
    });
    await page
      .getByLabel("데모 계정", { exact: true })
      .selectOption("learner-1");
    await expect(
      page.getByRole("heading", { name: "오늘의 학습", exact: true }),
    ).toBeVisible();
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
    await page
      .getByLabel("데모 계정", { exact: true })
      .selectOption("learner-2");
    await nav("학습 현황");
    await expect(page.locator(".history-row")).toHaveCount(0);
    await page
      .getByLabel("데모 계정", { exact: true })
      .selectOption("learner-1");
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
test("anonymous APIs, role checks and tablet layout", async ({ page }) => {
  await page.goto("/");
  expect((await page.request.get("/api/admin/sample")).status()).toBe(401);
  await page.getByRole("button", { name: /학습자 3 개념/ }).click();
  await expect(
    page.getByRole("heading", { name: "오늘의 학습", exact: true }),
  ).toBeVisible();
  expect((await page.request.get("/api/admin/sample")).status()).toBe(403);
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

test("keyboard navigation and WCAG accessibility on login and dashboard", async ({
  page,
}) => {
  await page.goto("/");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("button", { name: /학습자 3 개념/ }).click();
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
  await page.getByRole("button", { name: /관리자 프롬프트/ }).click();
  await expect(
    page.getByRole("heading", { name: "학습팩 만들기" }),
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
  const imported = await page.request.post("/api/admin/import", {
    headers,
    data: { raw: JSON.stringify(fixture) },
  });
  expect(imported.status()).toBe(201);
  const ids = await imported.json();
  const publish = await page.request.post("/api/admin/publish", {
    headers,
    data: { ...ids, access: ["learner-3"] },
  });
  expect(publish.status()).toBe(200);
  await page.getByLabel("데모 계정", { exact: true }).selectOption("learner-3");
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
