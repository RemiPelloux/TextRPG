/** Turning content and items into words, in the player's language. */
import { getContent, type Rarity, type StatKey, type Text } from "@textrpg/content";
import { type ClientItem, DAY, type Origin, type Proc } from "@textrpg/engine";

import type { Locale, T } from "./i18n";

export const content = getContent();

export function tx(text: Text | undefined, locale: Locale, feminine = false): string {
  if (!text) return "";
  if (locale === "fr") return feminine && text.frF ? text.frF : text.fr;
  return text.en;
}

const PERCENT_STATS = new Set<StatKey>([
  "damagePct",
  "critChance",
  "critDamage",
  "dodge",
  "lifeSteal",
  "thorns",
  "goldFind",
  "magicFind",
  "expBonus",
]);

export function isPercent(stat: StatKey): boolean {
  return PERCENT_STATS.has(stat);
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    maximumFractionDigits: 1,
  }).format(value);
}

/** "+12 Strength" / "+5% Critical chance" (French puts a thin space before %). */
export function formatStat(stat: StatKey, value: number, t: T, locale: Locale): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const amount = formatNumber(Math.abs(value), locale);
  const unit = isPercent(stat) ? (locale === "fr" ? " %" : "%") : "";
  return `${sign}${amount}${unit} ${t(`stats.${stat}`)}`;
}

export function statValue(stat: StatKey, value: number, locale: Locale): string {
  const unit = isPercent(stat) ? (locale === "fr" ? " %" : "%") : "";
  return `${formatNumber(value, locale)}${unit}`;
}

/** Diablo-style item names: "Sharp Sword of the Fox" / "Épée tranchante du Renard". */
export function itemName(item: ClientItem, locale: Locale, t: T): string {
  const base = content.items.get(item.baseId);
  if (!base) return item.baseId;
  const baseName = tx(base.name, locale);
  const feminine = base.gender === "f";
  if (!item.identified && ["rare", "legendary", "set", "ancestral"].includes(item.rarity)) {
    return t(feminine ? "items.unknownF" : "items.unknown", { base: baseName });
  }
  if (item.legendaryId) {
    const name = tx(content.legendaries.get(item.legendaryId)?.name, locale) || baseName;
    return item.rarity === "ancestral" ? t("items.ancestral", { name }) : name;
  }
  if (item.legend) {
    const name = legendName(item.legend, locale, t);
    return item.rarity === "ancestral" ? t("items.ancestral", { name }) : name;
  }
  if (item.setPieceId)
    return tx(content.setPieces.get(item.setPieceId)?.piece.name, locale) || baseName;
  if (item.rareName) {
    const names = content.rareNames[locale];
    return `${names.first[item.rareName[0]] ?? ""} ${names.second[item.rareName[1]] ?? ""}`.trim();
  }
  if (item.rarity === "magic") {
    const affixes = item.affixes
      .map((a) => content.affixes.find((x) => x.id === a.id))
      .filter(Boolean);
    const prefix = affixes.find((a) => a!.type === "prefix");
    const suffix = affixes.find((a) => a!.type === "suffix");
    const p = prefix ? tx(prefix.name, locale, feminine) : "";
    const s = suffix ? tx(suffix.name, locale) : "";
    const m = materialName(item, locale);
    return (locale === "fr" ? [baseName, m, p, s] : [p, m, baseName, s]).filter(Boolean).join(" ");
  }
  const m = materialName(item, locale);
  return (locale === "fr" ? [baseName, m] : [m, baseName]).filter(Boolean).join(" ");
}

/** "Iron" (an adjective in English) / "de fer" (a complement in French). */
export function materialName(item: { material?: string }, locale: Locale): string {
  return tx(content.materials.find((m) => m.id === item.material)?.name, locale);
}

/** Procedural legendaries: "Aldric's Lament" / "Complainte d'Aldric". */
export function legendName(legend: { noun: number; proper: string }, locale: Locale, t: T): string {
  const noun = tx(content.legendNames.nouns[legend.noun], locale);
  const elided = /^[aeiouyhàâéèêîôû]/i.test(legend.proper);
  return t("items.legendName", { noun, proper: legend.proper, de: elided ? "d'" : "de " });
}

export function legendLore(legend: { lore: number; proper: string }, locale: Locale): string {
  return tx(content.legendNames.lore[legend.lore], locale).replaceAll("{proper}", legend.proper);
}

/** What a generated power does, with its numbers. */
export function procText(proc: Proc, t: T, locale: Locale): string {
  return t(`procs.${proc.t}`, {
    chance: Math.round(proc.chance * 100),
    value: formatNumber(proc.value, locale),
    turns: proc.turns ?? 0,
    every: proc.every ?? 0,
  });
}

export function procName(template: string, t: T): string {
  return t(`procName.${template}`);
}

/** Every drop has a story: where it came from. */
export function originText(origin: Origin, locale: Locale, t: T): string {
  const enemy = origin.enemy ? enemyName(origin.enemy, locale, t) : "";
  if (origin.src === "hunt" && !enemy) return t("origin.huntAnon");
  return t(`origin.${origin.src}`, { enemy, floor: origin.floor ?? 0 });
}

export function dayDate(day: number, locale: Locale): string {
  return new Date(day * DAY).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function rarityClass(rarity: Rarity): string {
  return `r-${rarity}`;
}

/** "Grakthor the Orc" / "Grakthor l'Orc", "Vessa la Araignée Venimeuse". */
export function enemyName(
  info: { proper: string; kindId: string; bossId?: string; elite?: string },
  locale: Locale,
  t: T,
): string {
  if (info.bossId) return tx(content.bosses.get(info.bossId)?.name, locale);
  const def = content.enemyKinds.find((k) => k.id === info.kindId);
  const feminine = def?.gender === "f";
  const kind = tx(def?.name, locale);
  const elite = info.elite
    ? tx(content.elites.find((e) => e.id === info.elite)?.name, locale, feminine)
    : "";
  const article = /^[aeiouyàâéèêîôûh]/i.test(kind) ? "l'" : feminine ? "la " : "le ";
  return t(elite ? "enemy.nameElite" : "enemy.name", { proper: info.proper, kind, elite, article });
}

export function duration(ms: number, locale: Locale): string {
  const minutes = Math.max(0, Math.ceil(ms / 60_000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return locale === "fr" ? `${m} min` : `${m}m`;
  return locale === "fr"
    ? `${h} h ${String(m).padStart(2, "0")}`
    : `${h}h ${String(m).padStart(2, "0")}m`;
}
