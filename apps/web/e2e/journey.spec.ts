import { expect, test } from "@playwright/test";

import { closeOverlays, fightToTheEnd, go, newHero } from "./helpers";

test("a new player plays a first hunt without signing up", async ({ page }) => {
  await newHero(page, "Aria");
  await expect(page.getByText("Réveil")).toBeVisible();
  await go(page, /Chasse/);
  await expect(page.getByRole("heading", { name: "Terres de chasse" })).toBeVisible();
  await page
    .getByRole("button", { name: /Chasser/ })
    .first()
    .click();
  await fightToTheEnd(page);
  await expect(page.getByRole("heading", { name: /Victoire|Défaite|Fuite/ })).toBeVisible();
  await closeOverlays(page);
  await expect(page.locator(".combat")).toBeHidden();
  // Energy was spent (an easy hunt costs 2, half price before level 5) and shows in the top bar.
  await expect(page.locator(".topbar")).toContainText("19 / 20");
});

test("the bag opens item details and the market sells potions", async ({ page }) => {
  await newHero(page);
  await go(page, /Sac/);
  await expect(page.getByRole("heading", { name: "Le sac" })).toBeVisible();
  await page.locator(".item-row").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto(page.url().replace(/\/bag$/, "/market"));
  const potionCard = page
    .locator(".panel")
    .filter({ hasText: /^Potion/ })
    .first();
  await potionCard.getByRole("button", { name: /Acheter/ }).click();
  await expect(page.locator(".topbar")).toContainText("0 ◉");
});

test("the hero sheet, quests, depths and codex render", async ({ page }) => {
  const { url } = await newHero(page);
  for (const [path, heading] of [
    ["", "Le Camp"],
    ["/hunt", "Terres de chasse"],
    ["/hero", "Équipement"],
    ["/quests", "Quêtes"],
    ["/depths", "Sous la ville"],
    ["/codex", "Codex"],
    ["/forge", "La forge"],
    ["/cube", "Le Cube"],
    ["/settings", "Réglages"],
  ] as const) {
    await page.goto(url + path);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
    // Nothing may widen the page on a phone: the whole layout (and fixed overlays) would shift.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${path || "/"} is wider than the screen`).toBeLessThanOrEqual(0);
  }
});

test("the depths: enter, open a door, keep going", async ({ page }) => {
  const { url } = await newHero(page);
  await page.goto(url + "/depths");
  await page.getByRole("button", { name: /Descendre/ }).click();
  await expect(page.getByRole("heading", { name: "Étage 1" })).toBeVisible();
  await page.locator(".door").first().click();
  if (
    await page
      .locator(".combat")
      .isVisible()
      .catch(() => false)
  ) {
    await fightToTheEnd(page);
    await closeOverlays(page);
  }
  await expect(page.locator(".depths .step.done, .quote, .door").first()).toBeVisible();
});

test("a guest saves the account and finds the hero on another device", async ({
  page,
  browser,
}) => {
  const { name } = await newHero(page);
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto("/account");
  await page.fill("#email", email);
  await page.fill("#password", "moonstone-42");
  await page.getByRole("button", { name: "Sauvegarder" }).click();
  await page.waitForURL("/");

  const other = await browser.newContext({ locale: "fr-FR" });
  const second = await other.newPage();
  await second.goto("/account");
  await second.getByRole("tab", { name: /déjà un compte/ }).click();
  await second.fill("#email", email);
  await second.fill("#password", "moonstone-42");
  await second.getByRole("button", { name: "Se connecter" }).click();
  await second.waitForURL("/");
  await expect(second.getByRole("link", { name: new RegExp(name) })).toBeVisible();
  await other.close();
});

test("switching to English", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Switch to English/ }).click();
  await expect(page.getByText("The world is mysterious.")).toBeVisible();
});

test("PWA: manifest, service worker and icons are served", async ({ request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.length).toBeGreaterThan(2);
  expect((await request.get("/sw.js")).ok()).toBe(true);
  expect((await request.get("/icons/icon-512.png")).ok()).toBe(true);
});

test("the leaderboard is public", async ({ page }) => {
  await page.goto("/leaderboard?board=daily");
  await expect(page.getByRole("heading", { name: "Classement" })).toBeVisible();
});

test("the cube opens from level 1 and shows its slots, sigils sit in the codex", async ({
  page,
}) => {
  const { url } = await newHero(page);
  await page.goto(url + "/cube");
  await expect(page.getByRole("heading", { name: "Le Cube" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Transmuter/ })).toBeDisabled();
  await page.getByRole("tab", { name: "Pouvoirs" }).click();
  await expect(page.getByText("Emplacement 1")).toBeVisible();
  await expect(page.getByText("Niveau 10")).toBeVisible();
  await page.goto(url + "/codex");
  await page.getByRole("tab", { name: "Sceaux" }).click();
  await expect(page.getByRole("heading", { name: /Lignée du Loup/ })).toBeVisible();
});
