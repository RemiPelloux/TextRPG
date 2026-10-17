import { expect, type Page } from "@playwright/test";

export async function newHero(page: Page, name = `E2E${Math.floor(Math.random() * 1e6)}`) {
  await page.goto("/");
  await page.fill("#hero-name", name);
  await page.getByRole("button", { name: /Ouvrir le livre|Commencer|Créer le héros/ }).click();
  await page.waitForURL(/\/play\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "Le Camp" })).toBeVisible();
  return { name, url: page.url() };
}

/** Fight the current combat to its end, preferring auto-combat. */
export async function fightToTheEnd(page: Page) {
  await expect(page.locator(".combat")).toBeVisible();
  const done = page.getByRole("button", { name: /^Continuer$|^Rechasser/ }).first();
  for (let i = 0; i < 60 && !(await done.isVisible().catch(() => false)); i++) {
    for (const name of [/Auto/, /Frapper/]) {
      const button = page.getByRole("button", { name }).first();
      if (
        (await button.isVisible().catch(() => false)) &&
        // Bounded: if the fight ends right now, the button disappears and an unbounded check
        // would wait for it until the test times out.
        (await button.isEnabled({ timeout: 1_000 }).catch(() => false))
      ) {
        // The fight can end mid-click: the result screen then covers the button. Don't wait for it
        // to come back, look again on the next turn of the loop.
        await button.click({ timeout: 2_000 }).catch(() => {});
        break;
      }
    }
    await page.waitForTimeout(400);
  }
  await expect(done).toBeVisible({ timeout: 15_000 });
}

export async function closeOverlays(page: Page) {
  const cont = page.getByRole("button", { name: /^Continuer$/ });
  if (
    await cont
      .first()
      .isVisible()
      .catch(() => false)
  )
    await cont.first().click();
  for (let i = 0; i < 4; i++) {
    const celebration = page.locator(".celebrate .btn");
    if (!(await celebration.isVisible().catch(() => false))) break;
    await celebration.click();
  }
}

export async function go(page: Page, label: RegExp) {
  const nav = page.locator(".bottomnav, .sidenav").filter({ visible: true }).first();
  const link = nav.getByRole("link", { name: label });
  if (await link.count()) await link.click();
  else await page.getByRole("link", { name: label }).first().click();
}
