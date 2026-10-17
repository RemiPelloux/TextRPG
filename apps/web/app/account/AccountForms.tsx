"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { claimAction, loginAction } from "@/app/actions";
import { useI18n } from "@/lib/i18n-client";

export function AccountForms({ guest }: { guest: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<"claim" | "login">(guest ? "claim" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await (mode === "claim" ? claimAction : loginAction)({ email, password });
    setPending(false);
    if (!result.ok) {
      setError(t(`errors.${result.error}`));
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <section className="panel stack">
      <div className="tabs" role="tablist">
        <button role="tab" className="tab" aria-selected={mode === "claim"} onClick={() => setMode("claim")}>
          {t("account.claim")}
        </button>
        <button role="tab" className="tab" aria-selected={mode === "login"} onClick={() => setMode("login")}>
          {t("account.login")}
        </button>
      </div>
      <p className="dim">{mode === "claim" ? t("account.claimText") : t("account.loginText")}</p>
      <form className="stack" onSubmit={submit}>
        <div className="field">
          <label className="label" htmlFor="email">
            {t("account.email")}
          </label>
          <input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor="password">
            {t("account.password")}
          </label>
          <input id="password" className="input" type="password" autoComplete={mode === "claim" ? "new-password" : "current-password"} minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && (
          <p className="delta-down ui" role="alert">
            {error}
          </p>
        )}
        <button className="btn primary" type="submit" disabled={pending}>
          {mode === "claim" ? t("account.claimButton") : t("account.loginButton")}
        </button>
      </form>
    </section>
  );
}
