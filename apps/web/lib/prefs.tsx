"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

import { loadSoundPreference, setSound } from "./sfx";

export interface Prefs {
  sound: boolean;
  motion: "full" | "reduced";
  text: "normal" | "large" | "xl";
  contrast: "normal" | "high";
  speed: 1 | 2;
  /** Two editions of the same book: paper (default) or read by candlelight. */
  theme: "paper" | "night";
}

const DEFAULTS: Prefs = {
  sound: true,
  motion: "full",
  text: "normal",
  contrast: "normal",
  speed: 1,
  theme: "paper",
};
const KEY = "textrpg.prefs";

const PrefsContext = createContext<{ prefs: Prefs; update: (patch: Partial<Prefs>) => void }>({
  prefs: DEFAULTS,
  update: () => {},
});

function apply(prefs: Prefs) {
  const root = document.documentElement;
  root.dataset.motion = prefs.motion;
  root.dataset.text = prefs.text;
  root.dataset.contrast = prefs.contrast;
  root.dataset.theme = prefs.theme;
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  useEffect(() => {
    let stored: Partial<Prefs>;
    try {
      stored = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Prefs>;
    } catch {
      stored = {};
    }
    const next = { ...DEFAULTS, ...stored, sound: loadSoundPreference() };
    setPrefs(next);
    apply(next);
  }, []);

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      if (patch.sound !== undefined) setSound(patch.sound);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* private mode: preferences last for this visit only */
      }
      apply(next);
      return next;
    });
  }, []);

  return <PrefsContext.Provider value={{ prefs, update }}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  return useContext(PrefsContext);
}

export function reducedMotion(prefs: Prefs): boolean {
  if (prefs.motion === "reduced") return true;
  return (
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}
