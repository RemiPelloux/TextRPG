"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createHeroAction } from "@/app/actions";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toasts";
import { useI18n } from "@/lib/i18n-client";
import { sfx } from "@/lib/sfx";

const SUGGESTIONS = [
  "Aria",
  "Bram",
  "Ysolde",
  "Kael",
  "Mira",
  "Orrin",
  "Thessa",
  "Varek",
  "Lune",
  "Corvin",
  "Esme",
  "Daro",
];

export function NewHeroForm({ first }: { first: boolean }) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [placeholder] = useState(
    () => SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)]!,
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    sfx.click();
    const result = await createHeroAction({
      name: name.trim() || placeholder,
      tzOffset: new Date().getTimezoneOffset(),
    });
    if (result.ok && result.heroId) {
      router.push(`/play/${result.heroId}`);
      return;
    }
    toast(t(`errors.${result.ok ? "server" : result.error}`), "error");
    setPending(false);
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="field">
        <label htmlFor="hero-name" className="sr-only">
          {t("title.nameLabel")}
        </label>
        <div className="input-group">
          <input
            id="hero-name"
            className="input"
            value={name}
            maxLength={20}
            placeholder={t("title.namePlaceholder")}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
          />
          <button
            type="button"
            className="dice"
            aria-label={t("title.randomName")}
            title={t("title.randomName")}
            onClick={() => {
              sfx.click();
              setName(SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)]!);
            }}
          >
            <Icon name="GiRollingDices" />
          </button>
        </div>
      </div>
      <button className="btn primary block" type="submit" disabled={pending}>
        {pending ? t("title.creating") : first ? t("title.start") : t("title.create")}
        <span className="chev" aria-hidden>
          ›
        </span>
      </button>
      {first && (
        <p className="faint" style={{ fontSize: "0.85rem", textAlign: "center" }}>
          {t("title.noSignup")}
        </p>
      )}
    </form>
  );
}
