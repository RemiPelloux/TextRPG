import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "textrpg_locale";

type Messages = typeof en;
const MESSAGES: Record<Locale, Messages> = { en, fr };

export type Params = Record<string, string | number>;
export type T = (key: string, params?: Params) => string;

function lookup(messages: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined), messages);
}

function format(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => (name in params ? String(params[name]) : `{${name}}`));
}

/** Translate `key`. Arrays of variants pick one with `params.v` (a stable number). */
export function translator(locale: Locale): T {
  const messages = MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
  return (key, params) => {
    let value = lookup(messages, key) ?? lookup(MESSAGES.en, key);
    if (Array.isArray(value)) value = value[Math.abs(Number(params?.v ?? 0)) % value.length];
    if (typeof value !== "string") return key;
    return format(value, params);
  };
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function pickLocale(cookie: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(cookie)) return cookie;
  const preferred = (acceptLanguage ?? "").toLowerCase();
  if (preferred.startsWith("en")) return "en";
  return DEFAULT_LOCALE;
}
