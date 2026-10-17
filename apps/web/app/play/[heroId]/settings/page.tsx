"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { deleteHeroAction, deletePushAction, savePushAction, setLocaleAction } from "@/app/actions";
import { useToast } from "@/components/ui/Toasts";
import { useGame } from "@/lib/game";
import { useI18n } from "@/lib/i18n-client";
import { type Prefs, usePrefs } from "@/lib/prefs";

type InstallPrompt = Event & { prompt: () => Promise<void> };

function Choice<K extends keyof Prefs>({ name, value, options }: { name: K; value: Prefs[K]; options: { value: Prefs[K]; label: string }[] }) {
  const { update } = usePrefs();
  return (
    <div className="row" role="radiogroup">
      {options.map((o) => (
        <button key={String(o.value)} role="radio" aria-checked={value === o.value} className={`btn small ${value === o.value ? "primary" : "ghost"}`} onClick={() => update({ [name]: o.value } as Partial<Prefs>)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function Settings() {
  const { t, locale } = useI18n();
  const { prefs } = usePrefs();
  const { heroId, view } = useGame();
  const toast = useToast();
  const router = useRouter();
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [pushOn, setPushOn] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    navigator.serviceWorker?.ready.then((reg) => reg.pushManager.getSubscription()).then((sub) => setPushOn(Boolean(sub))).catch(() => {});
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function togglePush() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await deletePushAction(existing.endpoint);
        await existing.unsubscribe();
        setPushOn(false);
        return;
      }
      if ((await Notification.requestPermission()) !== "granted") {
        toast(t("settings.pushDenied"), "error");
        return;
      }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapid!) });
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await savePushAction({ endpoint: json.endpoint, keys: json.keys, heroId });
      setPushOn(true);
      toast(t("settings.pushOn"), "good");
    } catch {
      toast(t("settings.pushError"), "error");
    }
  }

  return (
    <>
      <div className="page-head">
        <span className="label">{t("settings.eyebrow")}</span>
        <h1>{t("settings.title")}</h1>
      </div>

      <section className="panel stack">
        <h2 className="label">{t("settings.language")}</h2>
        <div className="row">
          {(["fr", "en"] as const).map((l) => (
            <button
              key={l}
              className={`btn small ${locale === l ? "primary" : "ghost"}`}
              onClick={async () => {
                await setLocaleAction(l);
                router.refresh();
              }}
            >
              {l === "fr" ? "Français" : "English"}
            </button>
          ))}
        </div>

        <h2 className="label">{t("settings.sound")}</h2>
        <Choice name="sound" value={prefs.sound} options={[{ value: true, label: t("settings.on") }, { value: false, label: t("settings.off") }]} />

        <h2 className="label">{t("settings.combatSpeed")}</h2>
        <Choice name="speed" value={prefs.speed} options={[{ value: 1, label: "×1" }, { value: 2, label: "×2" }]} />

        <h2 className="label">{t("settings.motion")}</h2>
        <Choice name="motion" value={prefs.motion} options={[{ value: "full", label: t("settings.motionFull") }, { value: "reduced", label: t("settings.motionReduced") }]} />

        <h2 className="label">{t("settings.text")}</h2>
        <Choice name="text" value={prefs.text} options={[{ value: "normal", label: "100 %" }, { value: "large", label: "115 %" }, { value: "xl", label: "130 %" }]} />

        <h2 className="label">{t("settings.contrast")}</h2>
        <Choice name="contrast" value={prefs.contrast} options={[{ value: "normal", label: t("settings.contrastNormal") }, { value: "high", label: t("settings.contrastHigh") }]} />
      </section>

      <section className="panel stack">
        <h2 className="label">{t("settings.app")}</h2>
        {install ? (
          <button
            className="btn primary"
            onClick={async () => {
              await install.prompt();
              setInstall(null);
            }}
          >
            {t("settings.install")}
          </button>
        ) : (
          <p className="dim">{t("settings.installHint")}</p>
        )}
        {vapid ? (
          <button className="btn" onClick={togglePush}>
            {pushOn ? t("settings.pushDisable") : t("settings.pushEnable")}
          </button>
        ) : (
          <p className="faint ui" style={{ fontSize: "0.75rem" }}>
            {t("settings.pushUnavailable")}
          </p>
        )}
      </section>

      <section className="panel stack">
        <h2 className="label">{t("settings.account")}</h2>
        <Link className="btn" href="/account">
          {t("settings.manageAccount")}
        </Link>
        <Link className="btn ghost" href="/">
          {t("settings.switchHero")}
        </Link>
        {confirmDelete ? (
          <div className="stack">
            <p className="delta-down">{t("settings.deleteConfirm", { name: view.hero.name })}</p>
            <div className="row">
              <button className="btn danger" onClick={() => void deleteHeroAction(heroId)}>
                {t("settings.deleteYes")}
              </button>
              <button className="btn ghost" onClick={() => setConfirmDelete(false)}>
                {t("common.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <button className="btn danger small" onClick={() => setConfirmDelete(true)}>
            {t("settings.delete")}
          </button>
        )}
      </section>

      <section className="panel stack">
        <h2 className="label">{t("settings.credits")}</h2>
        <p className="dim" style={{ fontSize: "0.88rem" }}>
          {t("settings.creditsText")}
        </p>
        <p className="faint ui" style={{ fontSize: "0.75rem" }}>
          {t("settings.icons")}{" "}
          <a href="https://game-icons.net" target="_blank" rel="noreferrer">
            game-icons.net
          </a>{" "}
          (CC BY 3.0) — Lorc, Delapouite & contributors.
        </p>
      </section>
    </>
  );
}
