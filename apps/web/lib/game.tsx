"use client";

import type { Action, ClientView, GameEvent } from "@textrpg/engine";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { gameAction } from "@/app/actions";
import { useToast } from "@/components/ui/Toasts";

import { useI18n } from "./i18n-client";
import { type Line, narrate } from "./narrate";
import { sfx } from "./sfx";
import { content, tx } from "./text";

export interface Batch {
  id: number;
  action: Action;
  events: GameEvent[];
  view: ClientView;
}

export type Celebration =
  | { kind: "levelUp"; level: number; gains: Record<string, number> }
  | { kind: "paragon"; paragon: number }
  | { kind: "class" }
  | { kind: "questDone"; templateId: string };

interface GameContextValue {
  heroId: string;
  view: ClientView;
  busy: boolean;
  online: boolean;
  dispatch: (action: Action) => Promise<boolean>;
  subscribe: (listener: (batch: Batch) => void) => () => void;
  chronicle: Line[];
  celebrations: Celebration[];
  dismissCelebration: () => void;
  /** True while a scene (combat) is presenting: celebrations wait for it. */
  sceneOpen: boolean;
  setSceneOpen: (open: boolean) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

const CHRONICLE_SIZE = 80;

export function GameProvider({
  heroId,
  initialView,
  children,
}: {
  heroId: string;
  initialView: ClientView;
  children: ReactNode;
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [view, setView] = useState(initialView);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const [chronicle, setChronicle] = useState<Line[]>([]);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [sceneOpen, setSceneOpen] = useState(Boolean(initialView.combat));
  const listeners = useRef(new Set<(batch: Batch) => void>());
  const batchId = useRef(0);
  const inFlight = useRef(false);

  // The chronicle survives reloads for the rest of the browser session.
  const storageKey = `textrpg.chronicle.${heroId}`;
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) setChronicle(JSON.parse(saved) as Line[]);
    } catch {
      /* storage unavailable */
    }
  }, [storageKey]);
  useEffect(() => {
    try {
      if (chronicle.length) sessionStorage.setItem(storageKey, JSON.stringify(chronicle));
    } catch {
      /* storage unavailable */
    }
  }, [chronicle, storageKey]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const subscribe = useCallback((listener: (batch: Batch) => void) => {
    listeners.current.add(listener);
    return () => void listeners.current.delete(listener);
  }, []);

  const dispatch = useCallback(
    async (action: Action) => {
      if (inFlight.current) return false;
      inFlight.current = true;
      setBusy(true);
      try {
        const result = await gameAction(heroId, action);
        if (!result.ok) {
          sfx.error();
          toast(t(`errors.${result.error}`, result.params), "error");
          if (result.view) setView(result.view);
          return false;
        }
        const batch: Batch = {
          id: ++batchId.current,
          action,
          events: result.events,
          view: result.view,
        };
        setView(result.view);
        const heroName = result.view.hero.name;
        const enemy = result.view.combat?.enemy.info;
        const lines = result.events
          .map((event, i) =>
            narrate(
              event,
              { t, locale, hero: heroName, enemy: enemy?.proper || "", seed: batch.id * 7 },
              i,
            ),
          )
          .filter((line): line is Omit<Line, "id"> => line !== null)
          .map((line, i) => ({ ...line, id: `${batch.id}-${i}` }));
        setChronicle((list) => [...list, ...lines].slice(-CHRONICLE_SIZE));
        const celebrate: Celebration[] = [];
        for (const event of result.events) {
          if (event.type === "levelUp")
            celebrate.push({
              kind: "levelUp",
              level: event.level,
              gains: event.gains as Record<string, number>,
            });
          if (event.type === "paragonUp")
            celebrate.push({ kind: "paragon", paragon: event.paragon });
          if (event.type === "classUnlocked") celebrate.push({ kind: "class" });
          if (event.type === "questDone")
            celebrate.push({ kind: "questDone", templateId: event.templateId });
          if (event.type === "achievement") {
            const achievement = content.achievements.find((a) => a.id === event.id);
            toast(t("toast.achievement", { name: tx(achievement?.name, locale) }), "good");
          }
        }
        if (celebrate.length) setCelebrations((list) => [...list, ...celebrate]);
        for (const listener of listeners.current) listener(batch);
        return true;
      } catch (error) {
        console.error(error);
        sfx.error();
        toast(t(navigator.onLine ? "errors.server" : "errors.offline"), "error");
        return false;
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [heroId, t, locale, toast],
  );

  // Keep energy and day changes fresh while the app stays open.
  useEffect(() => {
    const interval = setInterval(() => {
      if (
        !inFlight.current &&
        document.visibilityState === "visible" &&
        !view.combat &&
        !view.fishing
      )
        void dispatch({ type: "sync" });
    }, 120_000);
    return () => clearInterval(interval);
  }, [dispatch, view.combat, view.fishing]);

  const value = useMemo<GameContextValue>(
    () => ({
      heroId,
      view,
      busy,
      online,
      dispatch,
      subscribe,
      chronicle,
      celebrations,
      dismissCelebration: () => setCelebrations((list) => list.slice(1)),
      sceneOpen,
      setSceneOpen,
    }),
    [heroId, view, busy, online, dispatch, subscribe, chronicle, celebrations, sceneOpen],
  );
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const value = useContext(GameContext);
  if (!value) throw new Error("useGame outside GameProvider");
  return value;
}
