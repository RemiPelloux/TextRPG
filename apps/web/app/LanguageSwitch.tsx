"use client";

import { useRouter } from "next/navigation";

import { setLocaleAction } from "@/app/actions";
import { useI18n } from "@/lib/i18n-client";

export function LanguageSwitch() {
  const { locale } = useI18n();
  const router = useRouter();
  const other = locale === "fr" ? "en" : "fr";
  return (
    <button
      type="button"
      className="btn ghost small"
      onClick={async () => {
        await setLocaleAction(other);
        router.refresh();
      }}
      aria-label={other === "fr" ? "Passer en français" : "Switch to English"}
    >
      {other === "fr" ? "Français" : "English"}
    </button>
  );
}
