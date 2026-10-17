"use client";

import { useRouter } from "next/navigation";

import { setLocaleAction } from "@/app/actions";
import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/lib/i18n-client";

/** Switches FR/EN. `icon` renders it as a gilded seal with its label (title screen). */
export function LanguageSwitch({ variant = "button" }: { variant?: "button" | "icon" }) {
  const { locale } = useI18n();
  const router = useRouter();
  const other = locale === "fr" ? "en" : "fr";
  const label = other === "fr" ? "Français" : "English";
  const change = async () => {
    await setLocaleAction(other);
    router.refresh();
  };
  const aria = other === "fr" ? "Passer en français" : "Switch to English";
  if (variant === "icon") {
    return (
      <button type="button" onClick={change} aria-label={aria}>
        <span className="seal">
          <Icon name="GiWorld" />
        </span>
        {label}
      </button>
    );
  }
  return (
    <button type="button" className="btn ghost small" onClick={change} aria-label={aria}>
      {label}
    </button>
  );
}
