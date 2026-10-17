"use client";

import { DIFFICULTY_IDS } from "@textrpg/content";
import { CHALLENGE_FIGHTS, WEEKLY_ENERGY } from "@textrpg/engine";

import { Icon } from "@/components/ui/Icon";
import { useGame } from "@/lib/game";
import { useI18n } from "@/lib/i18n-client";
import { sfx } from "@/lib/sfx";
import { content, tx } from "@/lib/text";

const THREAT: Record<string, number> = { easy: 1, normal: 2, hard: 3, hell: 4 };
const LOOT_TONE: Record<string, string> = { easy: "r-common", normal: "r-magic", hard: "r-rare", hell: "r-legendary" };

export default function Hunt() {
  const { t, locale } = useI18n();
  const { view, dispatch, busy } = useGame();
  const { hero, derived } = view;
  const blocked = Boolean(view.dungeon || view.fishing);
  const weekly = content.bosses.get("blood_moon_wyrm")!;

  return (
    <>
      <div className="page-head">
        <span className="label">{t("hunt.eyebrow")}</span>
        <h1>{t("hunt.title")}</h1>
        <p className="dim">{t("hunt.intro")}</p>
      </div>
      {view.dungeon && <p className="chip blood">{t("errors.inDungeon")}</p>}

      <div className="grid-cards">
        {DIFFICULTY_IDS.map((id) => {
          const difficulty = content.difficulties.get(id)!;
          const level = Math.max(1, hero.level + difficulty.levelOffset);
          const enough = hero.energy >= difficulty.energy;
          return (
            <article key={id} className={`panel stack ${id === "hell" ? "ornate" : ""}`}>
              <div className="spread">
                <h2 className={id === "hell" ? "r-text r-ancestral" : ""}>{tx(difficulty.name, locale)}</h2>
                <span className="chip blood" aria-label={t("hunt.threat", { level: THREAT[id]! })}>
                  {"☠".repeat(THREAT[id]!)}
                </span>
              </div>
              <p className="dim">{t(`hunt.flavor.${id}`)}</p>
              <dl className="statgrid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="stat">
                  <dt className="dim">{t("hunt.enemyLevel")}</dt>
                  <dd className="v" style={{ margin: 0 }}>
                    {level}
                  </dd>
                </div>
                <div className="stat">
                  <dt className="dim">{t("hunt.lootChance")}</dt>
                  <dd className={`v r-text ${LOOT_TONE[id]}`} style={{ margin: 0 }}>
                    {Math.round(difficulty.dropChance * 100)} %
                  </dd>
                </div>
                <div className="stat">
                  <dt className="dim">{t("hunt.legendary")}</dt>
                  <dd className="v" style={{ margin: 0 }}>
                    {(difficulty.rarity.legendary * 100).toFixed(1)} %
                  </dd>
                </div>
                <div className="stat">
                  <dt className="dim">{t("hunt.rewards")}</dt>
                  <dd className="v" style={{ margin: 0 }}>
                    ×{difficulty.expMult}
                  </dd>
                </div>
              </dl>
              <button
                className={`btn ${id === "hell" ? "danger" : "primary"}`}
                disabled={busy || blocked || !enough}
                onClick={() => {
                  sfx.click();
                  void dispatch({ type: "hunt.start", difficulty: id });
                }}
              >
                {t("hunt.go")} <span className="cost">⚡{difficulty.energy}</span>
              </button>
            </article>
          );
        })}
      </div>

      <section className="panel ornate stack">
        <div className="row" style={{ flexWrap: "nowrap" }}>
          <Icon name={weekly.icon} width={44} height={44} style={{ color: "var(--r-legendary)", flex: "none" }} />
          <div className="stack" style={{ gap: 2 }}>
            <span className="label">{t("hunt.weekly")}</span>
            <h2 className="r-text r-legendary">
              {tx(weekly.name, locale)}, {tx(weekly.title, locale)}
            </h2>
          </div>
        </div>
        <p className="flavor">« {tx(weekly.lore, locale)} »</p>
        <p className="dim">{t("hunt.weeklyText")}</p>
        <button className="btn ember" disabled={busy || blocked || !derived.weeklyAvailable || hero.level < 5 || hero.energy < WEEKLY_ENERGY} onClick={() => void dispatch({ type: "weekly.start" })}>
          {derived.weeklyAvailable ? (hero.level < 5 ? t("hunt.weeklyLocked") : t("hunt.weeklyGo")) : t("hunt.weeklyDone")}
          <span className="cost">⚡{WEEKLY_ENERGY}</span>
        </button>
      </section>

      <section className="panel stack" id="challenge">
        <div className="row">
          <Icon name="GiTrophyCup" width={36} height={36} style={{ color: "var(--gold-bright)" }} />
          <div className="stack" style={{ gap: 2 }}>
            <span className="label">{t("challenge.eyebrow")}</span>
            <h2>{t("challenge.title")}</h2>
          </div>
        </div>
        <p className="dim">{t("challenge.text", { fights: CHALLENGE_FIGHTS })}</p>
        {view.challenge && view.challenge.day === view.time.day ? (
          <div className="row">
            <span className="chip gold">{t("challenge.score", { score: view.challenge.score })}</span>
            {!view.challenge.finished && !view.combat && (
              <button className="btn primary" disabled={busy} onClick={() => void dispatch({ type: "challenge.next" })}>
                {t("challenge.next")}
              </button>
            )}
            {view.challenge.finished && <span className="dim">{t("challenge.comeBack")}</span>}
          </div>
        ) : (
          <button className="btn primary" disabled={busy || Boolean(view.combat)} onClick={() => void dispatch({ type: "challenge.start" })}>
            {t("challenge.start")}
          </button>
        )}
      </section>
    </>
  );
}
