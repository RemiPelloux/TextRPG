"use client";

import { BOSS_EVERY, DUNGEON_ENERGY, type RoomType, STEPS_PER_FLOOR } from "@textrpg/engine";

import { ItemMedallion } from "@/components/game/items";
import { Icon } from "@/components/ui/Icon";
import { useGame } from "@/lib/game";
import { useI18n } from "@/lib/i18n-client";
import { sfx } from "@/lib/sfx";
import { content, tx } from "@/lib/text";

const ROOM_ICON: Record<RoomType, string> = {
  fight: "GiCrossedSwords",
  elite: "GiDeathSkull",
  treasure: "GiOpenTreasureChest",
  trap: "GiWolfTrap",
  event: "GiPerspectiveDiceSixFacesRandom",
  campfire: "GiCampfire",
  boss: "GiCrownedSkull",
  stairs: "GiStairsGoal",
};

export default function Depths() {
  const { t, locale } = useI18n();
  const { view, dispatch, busy } = useGame();
  const run = view.dungeon;
  const go = (action: Parameters<typeof dispatch>[0]) => {
    sfx.click();
    void dispatch(action);
  };

  if (!run) {
    return (
      <>
        <div className="page-head">
          <span className="label">{t("dungeon.eyebrow")}</span>
          <h1>{t("dungeon.title")}</h1>
          <p className="dim">{t("dungeon.intro")}</p>
        </div>
        <section className="panel ornate stack">
          <dl className="statgrid">
            <div className="stat">
              <dt className="dim">{t("dungeon.startFloor")}</dt>
              <dd className="v" style={{ margin: 0 }}>
                {view.time.dungeonCheckpoint}
              </dd>
            </div>
            <div className="stat">
              <dt className="dim">{t("dungeon.deepest")}</dt>
              <dd className="v" style={{ margin: 0 }}>
                {view.counters.deepestFloor}
              </dd>
            </div>
            <div className="stat">
              <dt className="dim">{t("dungeon.bossEvery")}</dt>
              <dd className="v" style={{ margin: 0 }}>
                {BOSS_EVERY}
              </dd>
            </div>
          </dl>
          <p className="dim">{t("dungeon.rules")}</p>
          <button className="btn primary" disabled={busy || view.hero.energy < DUNGEON_ENERGY || Boolean(view.fishing)} onClick={() => go({ type: "dungeon.enter" })}>
            {t("dungeon.enter")} <span className="cost">⚡{DUNGEON_ENERGY}</span>
          </button>
        </section>
      </>
    );
  }

  const event = run.pendingEvent ? content.events.find((e) => e.id === run.pendingEvent) : undefined;
  const bossFloor = run.floor % BOSS_EVERY === 0;

  return (
    <>
      <div className="page-head">
        <span className="label">{t("dungeon.eyebrow")}</span>
        <h1>{t("dungeon.floor", { floor: run.floor })}</h1>
        {bossFloor && <span className="chip blood">{t("dungeon.bossFloor")}</span>}
      </div>

      <div className="depths" aria-label={t("dungeon.progress", { step: run.step + 1, steps: STEPS_PER_FLOOR })}>
        {Array.from({ length: STEPS_PER_FLOOR }, (_, i) => (
          <div key={i} className={`step ${i < run.step || run.atStairs ? "done" : ""} ${i === run.step && !run.atStairs ? "here" : ""}`} />
        ))}
      </div>

      {event ? (
        <section className="panel ornate stack">
          <h2>{tx(event.title, locale)}</h2>
          <p className="quote">{tx(event.text, locale)}</p>
          <div className="stack">
            {event.choices.map((choice, index) => (
              <button key={index} className="btn block" disabled={busy} onClick={() => go({ type: "dungeon.choice", index })}>
                {tx(choice.label, locale)}
              </button>
            ))}
          </div>
        </section>
      ) : run.atStairs ? (
        <section className="panel ornate stack">
          <div className="row">
            <Icon name="GiStairsGoal" width={40} height={40} style={{ color: "var(--gold)" }} />
            <h2>{t("dungeon.stairs")}</h2>
          </div>
          <p className="dim">{t("dungeon.stairsText")}</p>
          <div className="row">
            <button className="btn danger" disabled={busy} onClick={() => go({ type: "dungeon.descend" })}>
              {t("dungeon.descend", { floor: run.floor + 1 })}
            </button>
            <button className="btn primary" disabled={busy} onClick={() => go({ type: "dungeon.leave" })}>
              {t("dungeon.leave")}
            </button>
          </div>
        </section>
      ) : (
        <section className="stack">
          <p className="dim">{t(run.doors.length === 1 ? "dungeon.oneDoor" : "dungeon.twoDoors")}</p>
          <div className="doors">
            {run.doors.map((room, index) => (
              <button key={index} className="door" disabled={busy || Boolean(view.combat)} onClick={() => go({ type: "dungeon.door", index })}>
                <Icon name={ROOM_ICON[room]} />
                <span className="label">{t(`dungeon.room.${room}`)}</span>
                <span className="faint ui" style={{ fontSize: "0.72rem" }}>
                  {t(`dungeon.roomHint.${room}`)}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="panel stack">
        <div className="spread">
          <h2>{t("dungeon.stash")}</h2>
          <span className="row ui num" style={{ gap: 12 }}>
            <span className="r-text r-rare">{run.stashGold} ◉</span>
            <span className="r-text r-magic">{run.stashShards} ◆</span>
          </span>
        </div>
        <p className="faint ui" style={{ fontSize: "0.75rem" }}>
          {t("dungeon.stashHint")}
        </p>
        <div className="row">
          {run.stash.length === 0 && <span className="dim">{t("dungeon.stashEmpty")}</span>}
          {run.stash.map((item) => (
            <ItemMedallion key={item.uid} item={item} />
          ))}
        </div>
      </section>
    </>
  );
}
