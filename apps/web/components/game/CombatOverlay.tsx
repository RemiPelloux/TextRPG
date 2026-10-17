"use client";

import { getContent, type StatusId } from "@textrpg/content";
import {
  type ClientItem,
  type Combat,
  type EnemyInfo,
  type GameEvent,
  huntEnergy,
  type Status,
} from "@textrpg/engine";
import { useCallback, useEffect, useRef, useState } from "react";

import { Bar } from "@/components/ui/Bar";
import { Icon } from "@/components/ui/Icon";
import { type Batch, useGame } from "@/lib/game";
import { useI18n } from "@/lib/i18n-client";
import { type Line, narrate, paragraphOf } from "@/lib/narrate";
import { reducedMotion, usePrefs } from "@/lib/prefs";
import { sfx, vibrate } from "@/lib/sfx";
import { enemyName, itemName, rarityClass, tx } from "@/lib/text";

import { ItemMedallion } from "./items";

const content = getContent();

interface Float {
  id: number;
  text: string;
  kind: "dmg" | "crit" | "heal" | "miss" | "onhero";
  x: number;
}

interface Result {
  outcome: "victory" | "defeat" | "fled";
  exp: number;
  gold: number;
  shards: number;
  loot: { item: ClientItem; lost: boolean }[];
  challengeScore?: number;
  challengeFinished?: boolean;
}

interface Scene {
  enemy: EnemyInfo;
  context: Combat["context"];
  enemyHp: number;
  enemyMax: number;
  heroHp: number;
  heroMax: number;
  heroStatuses: Status[];
  enemyStatuses: Status[];
  windup: boolean;
  lines: Line[];
  floats: Float[];
  hit: number;
  shake: number;
  phase: "fight" | "result";
  result: Result;
}

const emptyResult = (): Result => ({ outcome: "victory", exp: 0, gold: 0, shards: 0, loot: [] });

function sceneFromCombat(combat: Combat): Scene {
  return {
    enemy: combat.enemy.info,
    context: combat.context,
    enemyHp: combat.enemy.hp,
    enemyMax: combat.enemy.maxHp,
    heroHp: combat.hero.hp,
    heroMax: combat.hero.maxHp,
    heroStatuses: combat.hero.statuses,
    enemyStatuses: combat.enemy.statuses,
    windup: combat.enemy.windup,
    lines: [],
    floats: [],
    hit: 0,
    shake: 0,
    phase: "fight",
    result: emptyResult(),
  };
}

const STATUS_CHIP: Record<StatusId, string> = {
  poison: "venom",
  burn: "ember",
  bleed: "blood",
  stun: "gold",
  weaken: "mana",
  empower: "gold",
  evasive: "mana",
  chill: "frost",
};

let floatId = 1;

export function CombatOverlay() {
  const { t, locale } = useI18n();
  const { prefs } = usePrefs();
  const { view, dispatch, busy, subscribe, setSceneOpen } = useGame();
  const [scene, setScene] = useState<Scene | null>(() =>
    view.combat ? sceneFromCombat(view.combat) : null,
  );
  const [playing, setPlaying] = useState(false);
  const queue = useRef<{ event: GameEvent; batch: Batch; index: number }[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBatch = useRef<Batch | null>(null);
  const lastAction = useRef<string | null>(null);

  useEffect(() => setSceneOpen(scene !== null), [scene, setSceneOpen]);

  const delayFor = useCallback(
    (event: GameEvent) => {
      if (reducedMotion(prefs)) return 40;
      const base =
        event.type === "hit"
          ? 430
          : event.type === "dot" || event.type === "dodge"
            ? 330
            : event.type === "windup"
              ? 700
              : event.type === "loot"
                ? 0
                : 200;
      return base / prefs.speed;
    },
    [prefs],
  );

  /** Apply one event to the scene (numbers, floats, log line, sound). */
  const applyEvent = useCallback(
    (s: Scene, event: GameEvent, batch: Batch, index: number): Scene => {
      const next: Scene = { ...s, floats: s.floats.slice(-6), result: { ...s.result } };
      const line = narrate(
        event,
        {
          t,
          locale,
          hero: batch.view.hero.name,
          enemy: s.enemy.proper || enemyName(s.enemy, locale, t),
          seed: batch.id * 7,
        },
        index,
      );
      if (line) next.lines = [...s.lines, { ...line, id: `${batch.id}-${index}` }].slice(-30);
      const float = (text: string, kind: Float["kind"]) =>
        next.floats.push({ id: floatId++, text, kind, x: 30 + Math.random() * 40 });
      switch (event.type) {
        case "hit":
          if (event.by === "hero") {
            next.enemyHp = Math.max(0, s.enemyHp - event.damage);
            next.hit = s.hit + 1;
            float(String(event.damage), event.crit ? "crit" : "dmg");
            if (event.crit) {
              next.shake = s.shake + 1;
              sfx.crit();
              vibrate(40);
            } else sfx.hit();
          } else {
            next.heroHp = Math.max(0, s.heroHp - event.damage);
            float(`−${event.damage}`, "onhero");
            if (event.crit) next.shake = s.shake + 1;
            sfx.hurt();
          }
          break;
        case "heavyBlow":
          next.windup = false;
          next.shake = s.shake + 1;
          break;
        case "dot":
          if (event.target === "enemy") {
            next.enemyHp = Math.max(0, s.enemyHp - event.damage);
            float(String(event.damage), "dmg");
          } else {
            next.heroHp = Math.max(0, s.heroHp - event.damage);
            float(`−${event.damage}`, "onhero");
          }
          break;
        case "thorns":
          if (event.target === "enemy") next.enemyHp = Math.max(0, s.enemyHp - event.damage);
          else next.heroHp = Math.max(0, s.heroHp - event.damage);
          break;
        case "heal":
          if (event.target === "hero") {
            next.heroHp = Math.min(s.heroMax, s.heroHp + event.amount);
            float(`+${event.amount}`, "heal");
            sfx.heal();
          } else next.enemyHp = Math.min(s.enemyMax, s.enemyHp + event.amount);
          break;
        case "dodge":
          float(t("combat.miss"), "miss");
          sfx.dodge();
          break;
        case "bastion":
          next.heroHp = 1;
          break;
        case "windup":
          next.windup = true;
          sfx.windup();
          break;
        case "victory":
          next.result = {
            ...next.result,
            outcome: "victory",
            exp: event.exp,
            gold: event.gold,
            shards: event.shards,
          };
          next.enemyHp = 0;
          sfx.victory();
          break;
        case "defeat":
          next.result = { ...next.result, outcome: "defeat" };
          sfx.defeat();
          break;
        case "flee":
          if (event.success) next.result = { ...next.result, outcome: "fled" };
          break;
        case "loot":
          next.result.loot = [
            ...next.result.loot,
            { item: event.item as ClientItem, lost: Boolean(event.lost) },
          ];
          break;
        case "challengeScore":
          next.result = {
            ...next.result,
            challengeScore: event.score,
            challengeFinished: event.finished,
          };
          if (!next.result.exp && event.finished === false) next.result.outcome = "victory";
          break;
      }
      return next;
    },
    [t, locale],
  );

  const finishBatch = useCallback((batch: Batch) => {
    setScene((s) => {
      if (!s) return s;
      const combat = batch.view.combat;
      if (combat) {
        return {
          ...s,
          enemyHp: combat.enemy.hp,
          enemyMax: combat.enemy.maxHp,
          heroHp: combat.hero.hp,
          heroMax: combat.hero.maxHp,
          heroStatuses: combat.hero.statuses,
          enemyStatuses: combat.enemy.statuses,
          windup: combat.enemy.windup,
        };
      }
      const ended = batch.events.some((e) =>
        ["victory", "defeat", "flee", "challengeScore"].includes(e.type),
      );
      if (!ended) return s;
      for (const { item, lost } of s.result.loot) if (!lost) sfx.loot(item.rarity);
      return { ...s, phase: "result" };
    });
  }, []);

  const pump = useCallback(() => {
    const next = queue.current.shift();
    if (!next) {
      setPlaying(false);
      if (lastBatch.current) finishBatch(lastBatch.current);
      return;
    }
    setScene((s) => (s ? applyEvent(s, next.event, next.batch, next.index) : s));
    timer.current = setTimeout(pump, delayFor(next.event));
  }, [applyEvent, delayFor, finishBatch]);

  const skip = useCallback(() => {
    if (!queue.current.length) return;
    if (timer.current) clearTimeout(timer.current);
    const pending = queue.current.splice(0);
    setScene((s) =>
      s ? pending.reduce((acc, p) => applyEvent(acc, p.event, p.batch, p.index), s) : s,
    );
    setPlaying(false);
    if (lastBatch.current) finishBatch(lastBatch.current);
  }, [applyEvent, finishBatch]);

  useEffect(
    () =>
      subscribe((batch) => {
        const start = batch.events.findIndex((e) => e.type === "combatStart");
        const relevant = start >= 0 || batch.action.type.startsWith("combat.");
        if (!relevant) return;
        let events = batch.events.map((event, index) => ({ event, batch, index }));
        if (start >= 0) {
          const begin = batch.events[start] as Extract<GameEvent, { type: "combatStart" }>;
          const combat = batch.view.combat;
          if (!combat) return;
          setScene({
            ...sceneFromCombat(combat),
            enemyHp: begin.hp,
            enemyMax: begin.hp,
            heroStatuses: [],
            enemyStatuses: [],
            windup: false,
          });
          events = events.slice(start);
        }
        lastBatch.current = batch;
        queue.current.push(...events);
        if (!timer.current || queue.current.length === events.length) {
          setPlaying(true);
          if (timer.current) clearTimeout(timer.current);
          pump();
        }
      }),
    [subscribe, pump],
  );

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  // Restart the shake animation on every critical blow without remounting the scene.
  const root = useRef<HTMLDivElement>(null);
  const shakes = scene?.shake ?? 0;
  useEffect(() => {
    const el = root.current;
    if (!el || shakes === 0) return;
    el.classList.remove("shake");
    void el.offsetWidth;
    el.classList.add("shake");
  }, [shakes]);

  if (!scene) return null;
  const combat = view.combat;
  const fighting = scene.phase === "fight";
  const challenge = scene.context.type === "challenge";
  const skills = view.derived.skills
    .map((id) => content.skills.get(id)!)
    .filter((s) => !challenge || s.classId === null);
  const potions = challenge
    ? (view.challenge?.potions ?? 0)
    : view.hero.bag
        .filter(
          (i) =>
            content.items.get(i.baseId)?.effect?.healPct &&
            content.items.get(i.baseId)?.kind === "potion",
        )
        .reduce((n, i) => n + i.quantity, 0);
  const canAct = fighting && !busy && !playing && Boolean(combat);
  const boss = scene.enemy.bossId ? content.bosses.get(scene.enemy.bossId) : undefined;
  const act = (action: Parameters<typeof dispatch>[0]) => {
    lastAction.current = action.type;
    void dispatch(action);
  };
  const close = () => {
    setScene(null);
    queue.current = [];
  };
  const huntAgain =
    scene.context.type === "hunt" && !view.combat
      ? (() => {
          const difficulty = scene.context.difficulty;
          const cost = huntEnergy(view.hero, content.difficulties.get(difficulty)!);
          return {
            difficulty,
            cost,
            possible: view.hero.energy >= cost,
            wounded: view.hero.health < view.stats.maxHealth * 0.3,
          };
        })()
      : null;

  return (
    <div
      className="combat"
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={t("combat.title")}
    >
      <header className="foe">
        <div className="spread" style={{ alignItems: "baseline" }}>
          <div className="stack" style={{ gap: 0, minWidth: 0 }}>
            <span
              className={`foe-name ${scene.enemy.elite ? "r-text r-rare" : ""} ${boss ? "r-text r-legendary" : ""}`}
            >
              {enemyName(scene.enemy, locale, t)}
            </span>
            {boss && <span className="foe-title">{tx(boss.title, locale)}</span>}
          </div>
          <span className="chip">{t("common.level", { level: scene.enemy.level })}</span>
        </div>
        <Bar
          value={scene.enemyHp}
          max={scene.enemyMax}
          kind="enemy"
          thick
          label={t("combat.enemyHealth")}
          text={`${scene.enemyHp} / ${scene.enemyMax}`}
        />
        <div className="row" style={{ gap: 6, minHeight: 22 }}>
          {scene.enemyStatuses.map((s) => (
            <span key={s.id} className={`chip ${STATUS_CHIP[s.id]}`}>
              {t(`status.${s.id}`)} {s.id === "stun" ? "" : s.turns}
            </span>
          ))}
          {scene.windup && <span className="chip blood">{t("combat.windupChip")}</span>}
        </div>
      </header>

      <section className="stage" onClick={skip}>
        <div
          className={`foe-figure ${scene.enemy.elite ? "elite" : ""} ${boss ? "boss" : ""} ${scene.windup ? "windup" : ""} ${scene.enemyHp <= 0 ? "dead" : ""}`}
        >
          <Icon
            key={`hit-${scene.hit}`}
            name={scene.enemy.icon}
            className="sigil"
            style={scene.hit ? { animation: "recoil 220ms ease-out" } : undefined}
          />
          {scene.floats.map((f) => (
            <span
              key={f.id}
              className={`float ${f.kind}`}
              style={{
                left: `${f.x}%`,
                top: f.kind === "onhero" || f.kind === "heal" ? "75%" : "30%",
              }}
            >
              {f.text}
            </span>
          ))}
        </div>
        <div className="chronicle" aria-live="polite">
          {scene.lines.slice(-7).map((line) => (
            <p
              key={line.id}
              className={`line ${line.tone} ${line.rarity ? rarityClass(line.rarity as never) : ""}`}
            >
              <span className="para">§ {paragraphOf(line.id)}</span>
              {line.text}
            </p>
          ))}
        </div>
      </section>

      <footer className="hero-strip">
        {fighting ? (
          <>
            <div className="spread">
              <span className="display" style={{ fontSize: "0.95rem" }}>
                {challenge ? t("challenge.heroName") : view.hero.name}
              </span>
              <div className="row" style={{ gap: 6 }}>
                {scene.heroStatuses.map((s) => (
                  <span key={s.id} className={`chip ${STATUS_CHIP[s.id]}`}>
                    {t(`status.${s.id}`)} {s.turns}
                  </span>
                ))}
              </div>
            </div>
            <Bar
              value={scene.heroHp}
              max={scene.heroMax}
              thick
              label={t("common.health")}
              text={`${scene.heroHp} / ${scene.heroMax}`}
            />
            <div className="moves">
              <button
                className="btn primary"
                disabled={!canAct}
                onClick={() => act({ type: "combat.attack" })}
              >
                <Icon name="GiCrossedSwords" width={18} height={18} /> {t("combat.attack")}
              </button>
              <button
                className={`btn ${scene.windup ? "ember pulse" : ""}`}
                disabled={!canAct}
                onClick={() => act({ type: "combat.guard" })}
              >
                <Icon name="GiShield" width={18} height={18} /> {t("combat.guard")}
              </button>
              <button
                className="btn"
                disabled={!canAct || potions <= 0 || scene.heroHp >= scene.heroMax}
                onClick={() => act({ type: "combat.potion" })}
              >
                <Icon name="GiHealthPotion" width={18} height={18} /> {t("combat.potion")}{" "}
                <span className="cost">×{potions}</span>
              </button>
              {boss || challenge ? (
                <button
                  className="btn ghost"
                  disabled={!canAct}
                  onClick={() => act({ type: "combat.auto" })}
                >
                  <Icon name="GiCycle" width={18} height={18} /> {t("combat.auto")}
                </button>
              ) : (
                <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
                  <button
                    className="btn ghost"
                    style={{ flex: 1 }}
                    disabled={!canAct}
                    onClick={() => act({ type: "combat.auto" })}
                    title={t("combat.autoHint")}
                  >
                    <Icon name="GiCycle" width={18} height={18} /> {t("combat.auto")}
                  </button>
                  <button
                    className="btn ghost"
                    style={{ flex: 1 }}
                    disabled={!canAct}
                    onClick={() => act({ type: "combat.flee" })}
                  >
                    <Icon name="GiRun" width={18} height={18} />
                    <span className="sr-only">{t("combat.flee")}</span>
                  </button>
                </div>
              )}
              {skills.length > 0 && (
                <div className="skills">
                  {skills.map((skill) => {
                    const cd = combat?.cooldowns[skill.id] ?? 0;
                    return (
                      <button
                        key={skill.id}
                        className="btn small"
                        disabled={!canAct || cd > 0}
                        onClick={() => act({ type: "combat.skill", skillId: skill.id })}
                        title={tx(skill.text, locale)}
                      >
                        <Icon name={skill.icon} width={16} height={16} /> {tx(skill.name, locale)}
                        {cd > 0 && <span className="cd num">{cd}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <ResultPanel
            result={scene.result}
            challenge={challenge}
            dungeon={scene.context.type === "dungeon"}
            onClose={close}
            huntAgain={
              huntAgain
                ? {
                    ...huntAgain,
                    run: () => {
                      close();
                      void dispatch({ type: "hunt.start", difficulty: huntAgain.difficulty });
                    },
                  }
                : null
            }
            nextChallenge={
              challenge && view.challenge && !view.challenge.finished
                ? () => {
                    close();
                    void dispatch({ type: "challenge.next" });
                  }
                : null
            }
          />
        )}
      </footer>
    </div>
  );
}

function ResultPanel({
  result,
  challenge,
  dungeon,
  onClose,
  huntAgain,
  nextChallenge,
}: {
  result: Result;
  challenge: boolean;
  dungeon: boolean;
  onClose: () => void;
  huntAgain: { cost: number; possible: boolean; wounded: boolean; run: () => void } | null;
  nextChallenge: (() => void) | null;
}) {
  const { t, locale } = useI18n();
  const title = { victory: "combat.victory", defeat: "combat.defeat", fled: "combat.fled" }[
    result.outcome
  ];
  return (
    <div className="stack" style={{ gap: 14, textAlign: "center" }}>
      <h2
        className={result.outcome === "victory" ? "r-text r-rare" : ""}
        style={{ fontSize: "1.6rem" }}
      >
        ✦ {t(title)} ✦
      </h2>
      {result.outcome === "victory" && !challenge && (
        <div className="row ui num" style={{ justifyContent: "center", gap: 16 }}>
          <span>
            +{result.exp} {t("common.exp")}
          </span>
          <span className="r-text r-rare">+{result.gold} ◉</span>
          {result.shards > 0 && <span className="r-text r-magic">+{result.shards} ◆</span>}
          {dungeon && <span className="chip">{t("dungeon.toStash")}</span>}
        </div>
      )}
      {challenge && result.challengeScore !== undefined && (
        <p className="display r-text r-legendary" style={{ fontSize: "1.3rem" }}>
          {t("challenge.score", { score: result.challengeScore })}
        </p>
      )}
      {result.outcome === "defeat" && !challenge && (
        <p className="dim">{t(dungeon ? "combat.defeatDungeonHint" : "combat.defeatHint")}</p>
      )}
      {result.loot.length > 0 && (
        <div className="loot-grid">
          {result.loot.map(({ item, lost }, i) => {
            const special = ["legendary", "set", "ancestral"].includes(item.rarity);
            return (
              <div
                key={item.uid}
                className={`loot-drop ${rarityClass(item.rarity)} ${special ? "suspense" : ""}`}
                style={{
                  animationDelay: `${i * 140 + (special ? 500 : 0)}ms`,
                  opacity: lost ? 0.45 : 1,
                }}
              >
                <ItemMedallion item={item} />
                <span className={`name r-text ${item.identified ? "" : "unknown-name"}`}>
                  {itemName(item, locale, t)}
                </span>
                {lost && <span className="chip blood">{t("items.bagFull")}</span>}
              </div>
            );
          })}
        </div>
      )}
      {huntAgain?.wounded && result.outcome !== "defeat" && (
        <p className="delta-down ui">{t("hunt.lowHealth")}</p>
      )}
      <div className="row" style={{ justifyContent: "center" }}>
        {nextChallenge && (
          <button className="btn primary" onClick={nextChallenge}>
            {t("challenge.next")}
          </button>
        )}
        {huntAgain && result.outcome !== "defeat" && (
          <button className="btn primary" disabled={!huntAgain.possible} onClick={huntAgain.run}>
            {t("combat.again")} <span className="cost">⚡{huntAgain.cost}</span>
          </button>
        )}
        <button
          className={`btn ${huntAgain || nextChallenge ? "" : "primary"}`}
          onClick={onClose}
          autoFocus
        >
          {t(dungeon && result.outcome === "victory" ? "dungeon.continue" : "common.continue")}
        </button>
      </div>
    </div>
  );
}
