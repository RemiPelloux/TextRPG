"use client";

import { CLASS_IDS, type Slot, type StatKey } from "@textrpg/content";
import { CLASS_LEVEL, type ClientItem, critChanceOf, PARAGON_PER_POINT, PARAGON_STATS, talentResetCost } from "@textrpg/engine";
import { useState } from "react";

import { ItemMedallion, slotOrder } from "@/components/game/items";
import { ItemSheet } from "@/components/game/ItemSheet";
import { Icon } from "@/components/ui/Icon";
import { useGame } from "@/lib/game";
import { useI18n } from "@/lib/i18n-client";
import { content, statValue, tx } from "@/lib/text";

const SHOWN: StatKey[] = ["maxHealth", "strength", "defense", "speed", "luck", "damagePct", "critDamage", "dodge", "lifeSteal", "thorns", "goldFind", "magicFind", "expBonus", "maxEnergy"];
const SLOT_ICON: Record<Slot, string> = {
  weapon: "GiBroadsword",
  armor: "GiLeatherArmor",
  helm: "GiVisoredHelm",
  gloves: "GiGauntlet",
  boots: "GiLeatherBoot",
  amulet: "GiGemPendant",
  ring: "GiRing",
  tool: "GiFishingPole",
};

export default function Hero() {
  const { t, locale } = useI18n();
  const { view, dispatch, busy } = useGame();
  const { hero, stats, derived } = view;
  const [selected, setSelected] = useState<{ item: ClientItem; slot: Slot } | null>(null);
  const heroClass = hero.classId ? content.classes.get(hero.classId) : undefined;

  return (
    <>
      <div className="page-head">
        <span className="label">{heroClass ? tx(heroClass.name, locale) : t("hero.noClass")}</span>
        <h1>{hero.name}</h1>
        <p className="dim ui">
          {t("common.level", { level: hero.level })} · {t("hero.power", { power: view.power })}
          {hero.paragon ? ` · ${t("hero.paragonLevel", { paragon: hero.paragon })}` : ""}
        </p>
      </div>

      <section className="panel ornate stack">
        <h2 className="label">{t("hero.equipment")}</h2>
        <div className="paperdoll">
          {slotOrder().map((slot) => {
            const item = hero.equipment[slot];
            return (
              <button key={slot} className="slot" onClick={() => item && setSelected({ item, slot })} disabled={!item} aria-label={t(`slots.${slot}`)}>
                {item ? (
                  <ItemMedallion item={item} />
                ) : (
                  <span className="medallion empty">
                    <Icon name={SLOT_ICON[slot]} />
                  </span>
                )}
                <span className="label">{t(`slots.${slot}`)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel stack">
        <h2 className="label">{t("hero.stats")}</h2>
        <div className="statgrid">
          <div className="stat">
            <span className="dim">{t("stats.critChance")}</span>
            <span className="v">{statValue("critChance", Math.round(critChanceOf(stats) * 10) / 10, locale)}</span>
          </div>
          {SHOWN.map((stat) => (
            <div className="stat" key={stat}>
              <span className="dim">{t(`stats.${stat}`)}</span>
              <span className="v">{statValue(stat, stats[stat], locale)}</span>
            </div>
          ))}
        </div>
        <p className="faint ui" style={{ fontSize: "0.72rem" }}>
          {t("hero.statsHint")}
        </p>
      </section>

      {(view.powers.length > 0 || Object.keys(view.setCounts).length > 0) && (
        <section className="panel stack">
          <h2 className="label">{t("hero.powers")}</h2>
          {view.powers.map((power) => {
            const legendary = [...content.legendaries.values()].find((l) => l.power === power);
            const setBonus = [...content.sets.values()].flatMap((s) => s.bonuses).find((b) => b.power === power);
            return (
              <p key={power} className="r-text r-legendary">
                ✦ {tx(legendary?.powerText ?? setBonus?.text, locale)}
              </p>
            );
          })}
          {Object.entries(view.setCounts).map(([setId, count]) => {
            const set = content.sets.get(setId)!;
            return (
              <div key={setId} className="stack" style={{ gap: 2 }}>
                <strong className="r-text r-set">
                  {tx(set.name, locale)} ({count}/{set.pieces.length})
                </strong>
                {set.bonuses.map((bonus) => (
                  <span key={bonus.pieces} className={count >= bonus.pieces ? "r-text r-set ui" : "faint ui"} style={{ fontSize: "0.8rem" }}>
                    ({bonus.pieces}) {tx(bonus.text, locale)}
                  </span>
                ))}
              </div>
            );
          })}
        </section>
      )}

      {!hero.classId && (
        <section className="panel ornate stack">
          <h2>{t("hero.chooseClass")}</h2>
          <p className="dim">{hero.level >= CLASS_LEVEL ? t("hero.chooseClassText") : t("hero.classLocked", { level: CLASS_LEVEL })}</p>
          <div className="grid-cards">
            {CLASS_IDS.map((id) => {
              const c = content.classes.get(id)!;
              const skills = [...content.skills.values()].filter((s) => s.classId === id);
              return (
                <article key={id} className="panel flat stack">
                  <div className="row">
                    <Icon name={c.icon} width={32} height={32} style={{ color: "var(--gold)" }} />
                    <h3>{tx(c.name, locale)}</h3>
                  </div>
                  <p className="dim">{tx(c.description, locale)}</p>
                  <ul className="ui faint" style={{ fontSize: "0.76rem", margin: 0, paddingLeft: 18 }}>
                    {skills.map((s) => (
                      <li key={s.id}>
                        {tx(s.name, locale)} ({t("common.level", { level: s.unlockLevel })})
                      </li>
                    ))}
                  </ul>
                  <button className="btn primary" disabled={busy || hero.level < CLASS_LEVEL} onClick={() => void dispatch({ type: "class.choose", classId: id })}>
                    {t("hero.become", { name: tx(c.name, locale) })}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {heroClass && (
        <section className="panel stack">
          <div className="spread">
            <h2>{t("hero.talents")}</h2>
            <span className="chip gold">{t("hero.points", { points: derived.talentPoints })}</span>
          </div>
          <div className="stack">
            {heroClass.talents.map((talent) => {
              const rank = hero.talents[talent.id] ?? 0;
              return (
                <div key={talent.id} className="spread panel flat" style={{ padding: 12 }}>
                  <div className="stack" style={{ gap: 2, minWidth: 0, flex: 1 }}>
                    <strong>{tx(talent.name, locale)}</strong>
                    <span className="dim ui" style={{ fontSize: "0.78rem" }}>
                      {tx(talent.text, locale)}
                    </span>
                  </div>
                  <div className="row">
                    <span className="num">
                      {rank}/{talent.maxRank}
                    </span>
                    <button className="btn small" disabled={busy || derived.talentPoints <= 0 || rank >= talent.maxRank} onClick={() => void dispatch({ type: "talent.learn", talentId: talent.id })} aria-label={t("hero.learn", { name: tx(talent.name, locale) })}>
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <button className="btn ghost small" disabled={busy || Object.keys(hero.talents).length === 0 || hero.gold < talentResetCost(hero.level)} onClick={() => void dispatch({ type: "talent.reset" })}>
            {t("hero.resetTalents")} <span className="cost">{talentResetCost(hero.level)} ◉</span>
          </button>
        </section>
      )}

      {hero.level >= 20 && (
        <section className="panel ornate stack">
          <div className="spread">
            <h2>{t("hero.paragon")}</h2>
            <span className="chip gold">{t("hero.points", { points: derived.paragonPoints })}</span>
          </div>
          <p className="dim">{t("hero.paragonText")}</p>
          <div className="grid-cards">
            {PARAGON_STATS.map((stat) => (
              <button key={stat} className="btn" disabled={busy || derived.paragonPoints <= 0} onClick={() => void dispatch({ type: "paragon.spend", stat })}>
                {t(`stats.${stat}`)}
                <span className="cost">
                  +{statValue(stat, PARAGON_PER_POINT[stat], locale)} · {hero.paragonPoints[stat] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <ItemSheet item={selected?.item ?? null} equippedSlot={selected?.slot} onClose={() => setSelected(null)} />
    </>
  );
}
