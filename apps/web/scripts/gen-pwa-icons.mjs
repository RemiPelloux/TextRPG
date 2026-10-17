/** Render public/icons/icon.svg into the PNG sizes the manifest needs (uses the installed Chromium). */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(here, "../public/icons/icon.svg"), "utf8");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage();
const targets = [
  ["icon-192.png", 192, 0],
  ["icon-512.png", 512, 0],
  ["icon-maskable-512.png", 512, 0.12],
  ["apple-touch-icon.png", 180, 0],
];
for (const [file, size, pad] of targets) {
  await page.setViewportSize({ width: size, height: size });
  const inset = Math.round(size * pad);
  await page.setContent(
    `<body style="margin:0;background:#0a0b10;width:${size}px;height:${size}px;display:grid;place-items:center">` +
      `<div style="width:${size - inset * 2}px;height:${size - inset * 2}px">${svg.replace("<svg", '<svg width="100%" height="100%"')}</div></body>`,
  );
  await page.screenshot({ path: join(here, "../public/icons", file), omitBackground: false });
}
await browser.close();
console.log("icons written");
