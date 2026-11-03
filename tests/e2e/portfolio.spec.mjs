import { test as base, expect, chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { chromePath } from "../../build/paths.mjs";
const projectCount = JSON.parse(
  readFileSync(
    new URL("../../content/info/archive.json", import.meta.url),
    "utf8",
  ),
).projects.length;

const test = base.extend({
  browser: [
    async ({}, use) => {
      const browser = process.env.CDP_URL
        ? await chromium.connectOverCDP(process.env.CDP_URL)
        : await chromium.launch({ executablePath: chromePath });
      await use(browser);
      await browser.close();
    },
    { scope: "worker" },
  ],
});

test("home renders black opening, retains fonts, and honors reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const videos = [];
  page.on("request", (request) => {
    if (/\.mp4/.test(request.url())) videos.push(request.url());
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "PYOTR GOLOUB" }),
  ).toBeVisible();
  await expect(page.locator(".hero-video")).toHaveCSS(
    "background-color",
    "rgb(0, 0, 0)",
  );
  await expect(page.locator("video")).not.toHaveAttribute("poster");
  await expect(
    page.getByRole("button", { name: "Play showreel" }),
  ).toBeVisible();
  await page.waitForTimeout(500);
  expect(videos).toHaveLength(0);
  await page.getByRole("button", { name: "Play showreel" }).click();
  await expect.poll(() => videos.length).toBeGreaterThan(0);
  await expect(
    page.locator(
      'link[as="font"][href="/content/misc/CossetteTitre-Regular.ttf"]',
    ),
  ).toHaveAttribute("href", "/content/misc/CossetteTitre-Regular.ttf");
});

test("home text paints while font downloads are pending", async ({
  page,
  context,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const pending = [];
  await page.route(/\.(?:ttf|woff2?)(?:\?|$)/, (route) => pending.push(route));
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const heading = page.getByRole("heading", { name: "PYOTR GOLOUB" });
    await heading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
    expect(pending.length).toBeGreaterThan(0);
    const box = await heading.boundingBox();
    const offset = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
    const cdp = await context.newCDPSession(page);
    const { data } = await cdp.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: {
        x: box.x + offset.x,
        y: box.y + offset.y,
        width: box.width,
        height: box.height,
        scale: 1,
      },
    });
    const pixels = await sharp(Buffer.from(data, "base64")).stats();
    expect(
      pixels.channels[0].max,
      "Heading must contain visible text before fonts finish",
    ).toBeGreaterThan(200);
  } finally {
    await Promise.all(pending.map((route) => route.abort()));
    await page.unrouteAll({ behavior: "ignoreErrors" });
  }
});

test("menu opens by keyboard and escape closes it", async ({ page }) => {
  await page.goto("/about/");
  const menu = page.locator("#menu-icon");
  await expect(menu).toHaveAccessibleName("Open menu");
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#nav-menu")).toHaveClass("open");
  await page.keyboard.press("Escape");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator('#nav-menu a[href="/about"]')).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("header controls retain original dark ink on every page", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of ["/archive/M08/", "/", "/selected/"]) {
    await page.goto(route);
    await page.mouse.move(200, 300);
    const ink = "oklch(0.216 0.0072 245)";
    await expect(page.locator(".sticky-email")).toHaveCSS("color", ink);
    await expect(page.locator("#menu-icon .stripe").first()).toHaveCSS(
      "background-color",
      ink,
    );
    await expect(page.locator("#menu-icon")).toHaveCSS(
      "mix-blend-mode",
      "normal",
    );
  }
});

test("archive warms two images after text paint, expands, filters, and sorts", async ({
  page,
}) => {
  const imageRequests = [];
  page.on("request", (request) => {
    if (
      request.url().includes("/content/projects/") ||
      request.url().includes("/content/optimized/")
    )
      imageRequests.push(request.url());
  });
  await page.goto("/archive/");
  await expect(page.locator(".archive-item")).toHaveCount(projectCount);
  await expect
    .poll(() =>
      page.evaluate(() =>
        [
          ...document.querySelectorAll('.archive-item[data-shown="true"]'),
        ].every((item) =>
          [...item.querySelectorAll("img")].every((image, index) =>
            index < 2
              ? image.complete && image.naturalWidth > 0
              : image.hasAttribute("data-src"),
          ),
        ),
      ),
    )
    .toBe(true);
  expect(imageRequests.length).toBeGreaterThan(0);
  const paintAndRequests = await page.evaluate(() => ({
    paint: performance.getEntriesByName("first-contentful-paint")[0].startTime,
    warmup: performance.getEntriesByName("archive-preview-warmup")[0].startTime,
    images: performance
      .getEntriesByType("resource")
      .filter(
        (entry) =>
          entry.initiatorType === "img" &&
          /\/content\/(optimized|projects)\//.test(entry.name),
      )
      .map((entry) => entry.startTime),
  }));
  expect(paintAndRequests.warmup).toBeGreaterThanOrEqual(
    paintAndRequests.paint,
  );
  expect(
    paintAndRequests.images.every((start) => start >= paintAndRequests.paint),
  ).toBe(true);
  if (!test.info().project.use.isMobile) {
    const videoPreview = page.locator('.archive-item[data-project-id="M08"]');
    await videoPreview.hover();
    await expect(videoPreview.locator("video").first()).toHaveAttribute(
      "poster",
      /\.webp$/,
    );
    await expect(videoPreview.locator("video").first()).not.toHaveAttribute(
      "src",
    );
  }
  const item = page.locator('.archive-item[data-shown="true"]').first();
  const summary = item.locator("summary");
  await item.evaluate((element) => element.scrollIntoView({ block: "center" }));
  const bounds = await summary.boundingBox();
  await summary.click({
    position: { x: bounds.width * 0.45, y: bounds.height * 0.3 },
  });
  await expect(item).toHaveAttribute("open", "");
  await expect(item.locator(".project-description")).toHaveCSS(
    "text-align",
    "left",
  );
  await expect.poll(() => imageRequests.length).toBeGreaterThan(0);
  const tag = page
    .locator(".hashtag:not(.hashtag--reset) .hashtag-button")
    .first();
  await tag.click();
  await expect(tag).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() => page.locator(".archive-item:visible").count())
    .toBeLessThan(projectCount);
  await page.locator("#hashtag-reset button").click();
  await expect(page.locator(".archive-item:visible")).toHaveCount(projectCount);
  await page.locator("#filter-who").click();
  await expect(page.locator("#filter-who .sort-indicator")).toBeVisible();
});

test("selected honors deep link, media navigation, and bounded scroll DOM", async ({
  page,
}) => {
  await page.goto("/selected/#E16");
  await expect(page.locator("#selected-curtain")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("#E16");
  const visibleProject = () =>
    page.evaluate(
      () =>
        [...document.querySelectorAll(".project-section")].sort(
          (a, b) =>
            Math.abs(a.getBoundingClientRect().top) -
            Math.abs(b.getBoundingClientRect().top),
        )[0]?.dataset.projectId,
    );
  await expect.poll(visibleProject).toBe("E16");
  const details = page
    .locator(
      '.project-section[data-project-id="E16"] .selected-project-details',
    )
    .filter({ visible: true });
  await expect(details.locator(".project-summary")).toHaveCSS(
    "font-family",
    /^"Inter Tight"/,
  );
  await details.locator("summary").click();
  await expect(details).toHaveAttribute("open", "");
  await expect(details.locator(".project-description")).toHaveCSS(
    "font-family",
    /^"Inter Tight"/,
  );
  const summarySize = await details
    .locator(".project-summary")
    .evaluate((element) => getComputedStyle(element).fontSize);
  await expect(details.locator(".project-description")).toHaveCSS(
    "font-size",
    summarySize,
  );
  await details.locator("summary").click();
  await details.locator("summary").evaluate((element) => element.blur());
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          [...document.querySelectorAll(".project-section")]
            .find(
              (section) =>
                section.dataset.projectId === "E16" &&
                Math.abs(section.getBoundingClientRect().top) < 2,
            )
            ?.querySelector(".project-media").dataset.mediaIndex,
      ),
    )
    .toBe("1");
  await page.keyboard.press("ArrowDown");
  await expect.poll(visibleProject).not.toBe("E16");
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(1400);
  expect(await page.locator(".project-section").count()).toBeLessThanOrEqual(
    24,
  );
  expect(
    await page.evaluate(() =>
      [...document.querySelectorAll(".project-section")].some(
        (section) => Math.abs(section.getBoundingClientRect().top) < 2,
      ),
    ),
  ).toBe(true);
});

test("legacy redirect preserves query and fragment", async ({ page }) => {
  await page.goto("/theatre/?from=old#E16");
  await expect(page).toHaveURL(/\/selected\/\?from=old#E16$/);
});

test("project video controls and error fallback work", async ({ page }) => {
  const mediaRequests = [];
  page.on("request", (request) => {
    if (/\.(mp4|webm)(?:\?|$)/.test(request.url()))
      mediaRequests.push(request.url());
  });
  await page.goto("/archive/M08/");
  await expect(page.locator(".project-info .project-description")).toHaveCSS(
    "text-align",
    "left",
  );
  for (const timing of await page.locator(".video-control-time").all()) {
    await expect(timing).toHaveCSS("color", "rgb(255, 255, 255)");
  }
  await expect(
    page.getByRole("button", { name: /Play video|Pause video/ }).first(),
  ).toBeVisible();
  await expect(page.locator("video").first()).toHaveAttribute(
    "poster",
    /\.webp$/,
  );
  await page.waitForTimeout(300);
  expect(mediaRequests).toHaveLength(0);
  await page
    .getByRole("button", { name: "Play video", exact: true })
    .first()
    .click();
  await expect.poll(() => mediaRequests.length).toBeGreaterThan(0);
  const response = await page.goto("/missing-page-for-test/");
  expect(response.status()).toBe(404);
  await expect(page.locator("body")).toBeVisible();
});

test("representative pages have no script errors or failed local assets", async ({
  page,
}) => {
  const errors = [];
  const failed = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (
      response.url().startsWith("http://127.0.0.1:4173/") &&
      response.status() >= 400
    )
      failed.push(response.url());
  });
  for (const route of [
    "/",
    "/about/",
    "/archive/",
    "/selected/#E16",
    "/archive/E16/",
    "/archive/M08/",
  ]) {
    await page.goto(route);
    await page.waitForTimeout(150);
  }
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});

test("failed showreel keeps content and navigation usable", async ({
  page,
}) => {
  await page.route("**/*.mp4", (route) => route.abort());
  const failure = page.waitForEvent("requestfailed", {
    predicate: (request) => /\.mp4(?:\?|$)/.test(request.url()),
  });
  await page.goto("/");
  await failure;
  await expect(
    page.getByRole("heading", { name: "PYOTR GOLOUB" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Play showreel", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page
    .locator("#nav-menu")
    .getByRole("link", { name: "profile", exact: true })
    .click();
  await expect(page).toHaveURL(/\/about\/$/);
});
