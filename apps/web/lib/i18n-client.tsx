"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";

import { type Locale, type T, translator } from "./i18n";

const I18nContext = createContext<{ locale: Locale; t: T }>({ locale: "fr", t: translator("fr") });

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => ({ locale, t: translator(locale) }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
