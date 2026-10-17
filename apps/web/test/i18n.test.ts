import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { translator } from "@/lib/i18n";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

function keys(node: unknown, prefix = ""): string[] {
  if (!node || typeof node !== "object" || Array.isArray(node)) return [prefix.slice(0, -1)];
  return Object.entries(node).flatMap(([k, v]) => keys(v, `${prefix}${k}.`));
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe("translations", () => {
  it("have the same keys in French and English", () => {
    expect(keys(en).sort()).toEqual(keys(fr).sort());
  });

  it("cover every static key used by the interface", () => {
    const root = join(__dirname, "..");
    const used = new Set<string>();
    for (const dir of ["app", "components", "lib"]) {
      for (const file of sourceFiles(join(root, dir))) {
        for (const match of readFileSync(file, "utf8").matchAll(/\bt\("([a-zA-Z0-9_.]+)"/g))
          used.add(match[1]!);
      }
    }
    const known = new Set(keys(fr));
    // Keys that hold variant arrays are leaves too.
    const missing = [...used].filter((key) => !known.has(key));
    expect(missing).toEqual([]);
  });

  it("translate every error the engine and server can raise", () => {
    const root = join(__dirname, "../../..");
    const codes = new Set<string>();
    for (const file of [
      ...sourceFiles(join(root, "packages/engine/src")),
      ...sourceFiles(join(root, "packages/server/src")),
    ]) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/fail\("([a-zA-Z]+)"/g)) codes.add(m[1]!);
      for (const m of text.matchAll(/(?:ServiceError|AuthError)\("([a-zA-Z]+)"\)/g))
        codes.add(m[1]!);
      for (const m of text.matchAll(/error: "([a-zA-Z]+)"/g)) codes.add(m[1]!);
    }
    const missing = [...codes].filter((code) => !(code in fr.errors) || !(code in en.errors));
    expect(missing).toEqual([]);
  });

  it("fills placeholders and picks stable variants", () => {
    const t = translator("fr");
    expect(t("common.level", { level: 7 })).toBe("Niv. 7");
    expect(t("log.heroHit", { v: 1, hero: "Aria", damage: 12, enemy: "X" })).toBe(
      t("log.heroHit", { v: 1, hero: "Aria", damage: 12, enemy: "X" }),
    );
    expect(t("does.not.exist")).toBe("does.not.exist");
  });
});
