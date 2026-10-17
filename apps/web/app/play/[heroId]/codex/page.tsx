"use client";

import { DIFFICULTY_IDS } from "@textrpg/content";
import { PITY_STEP } from "@textrpg/engine";
import { useState } from "react";

import { Bar } from "@/components/ui/Bar";
import { Icon } from "@/components/ui/Icon";
import { useGame } from "@/lib/game";
import { useI18n } from "@/lib/i18n-client";
import { content, tx } from "@/lib/text";

type Tab = "bestiary" | "legendaries" | "sets" | "fish" | "achievements" | "odds";

export default function Codex() {
  const { t, locale } = useI18n();
  const { view } = useGame();
  const [tab, setTab] = useState<Tab>("bestiary");
  const tabs: Tab[] = ["bestiary", "legendaries", "sets", "fish", "achievements", "odds"];
  const bosses = [...content.bosses.values()];

  return (
    <>
      <div className="page-head">
        <span className="label">{t("codex.eyebrow")}</span>
        <h1>{t("codex.title")}</h1>
      </div>
      <div className="tabs" role="tablist">
        {tabs.map((id) => (
          <button key={id} role="tab" className="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {t(`codex.tab.${id}`)}
          </button>
        ))}
      </div>

      {tab === "bestiary" && (
        <div className="grid-cards">
          {content.enemyKinds.map((kind) => {
            const kills = view.codex.kills[kind.id] ?? 0;
            return (
              <article key={kind.id} className="panel stack" style={{ opacity: kills ? 1 : 0.6 }}>
                <div className="row">
                  <Icon name={kind.icon} width={34} height={34} style={{ color: kills ? "var(--parchment)" : "var(--ink-500)" }} />
                  <div className="stack" style={{ gap: 0 }}>
                    <h3>{kills ? tx(kind.name, locale) : "???"}</h3>
                    <span className="label">{t("codex.kills", { count: kills })}</span>
                  </div>
                </div>
                <p className="flavor">{kills ? tx(kind.lore, locale) : t("codex.unknownLore")}</p>
              </article>
            );
          })}
          {bosses.map((boss) => (
            <article key={boss.id} className="panel ornate stack">
              <div className="row">
                <Icon name={boss.icon} width={34} height={34} style={{ color: "var(--r-legendary)" }} />
                <div className="stack" style={{ gap: 0 }}>
                  <h3 className="r-text r-legendary">{tx(boss.name, locale)}</h3>
                  <span className="label">{tx(boss.title, locale)}</span>
                </div>
              </div>
              <p className="flavor">{tx(boss.lore, locale)}</p>
            </article>
          ))}
        </div>
      )}

      {tab === "legendaries" && (
        <>
          <p className="dim">{t("codex.found", { found: view.codex.legendaries.length, total: content.legendaries.size })}</p>
          <div className="grid-cards">
            {[...content.legendaries.values()].map((l) => {
              const found = view.codex.legendaries.includes(l.id);
              const base = content.items.get(l.baseId)!;
              return (
                <article key={l.id} className="panel stack r-legendary" style={{ opacity: found ? 1 : 0.55 }}>
                  <div className="row" style={{ flexWrap: "nowrap" }}>
                    <span className={`medallion ${found ? "r-legendary" : ""}`}>
                      <Icon name={base.icon} />
                    </span>
                    <h3 className={found ? "r-text" : "faint"}>{found ? tx(l.name, locale) : "???"}</h3>
                  </div>
                  <p className={found ? "r-text" : "faint"} style={{ fontSize: "0.88rem" }}>
                    ✦ {found ? tx(l.powerText, locale) : t("codex.unknownPower")}
                  </p>
                  {found && <p className="flavor">« {tx(l.flavor, locale)} »</p>}
                </article>
              );
            })}
          </div>
        </>
      )}

      {tab === "sets" && (
        <div className="stack">
          {[...content.sets.values()].map((set) => (
            <article key={set.id} className="panel stack r-set">
              <h2 className="r-text">{tx(set.name, locale)}</h2>
              <div className="row">
                {set.pieces.map((piece) => {
                  const found = view.codex.setPieces.includes(piece.id);
                  return (
                    <span key={piece.id} className={`chip ${found ? "venom" : ""}`}>
                      {found ? tx(piece.name, locale) : "???"}
                    </span>
                  );
                })}
              </div>
              {set.bonuses.map((b) => (
                <span key={b.pieces} className="ui dim" style={{ fontSize: "0.8rem" }}>
                  ({b.pieces}) {tx(b.text, locale)}
                </span>
              ))}
            </article>
          ))}
        </div>
      )}

      {tab === "fish" && (
        <div className="grid-cards">
          {content.fish.map((fish) => {
            const caught = view.codex.fish.includes(fish.id);
            return (
              <article key={fish.id} className={`panel stack r-${fish.rarity}`} style={{ opacity: caught ? 1 : 0.55 }}>
                <div className="row">
                  <span className={`medallion ${caught ? `r-${fish.rarity}` : ""}`}>
                    <Icon name={fish.icon} />
                  </span>
                  <div className="stack" style={{ gap: 0 }}>
                    <h3 className={caught ? "r-text" : "faint"}>{caught ? tx(fish.name, locale) : "???"}</h3>
                    <span className="label">
                      {t(`rarity.${fish.rarity}`)}
                      {fish.months.length ? ` · ${t("codex.seasonal")}` : ""}
                    </span>
                  </div>
                </div>
                {caught && <p className="flavor">{tx(fish.lore, locale)}</p>}
              </article>
            );
          })}
        </div>
      )}

      {tab === "achievements" && (
        <div className="stack" style={{ gap: 8 }}>
          <p className="dim">{t("codex.achieved", { done: view.achievements.length, total: content.achievements.length })}</p>
          {content.achievements.map((a) => {
            const done = view.achievements.includes(a.id);
            const value = Math.min(a.gte, view.counters[a.counter] ?? 0);
            return (
              <div key={a.id} className="panel flat row" style={{ flexWrap: "nowrap", opacity: done ? 1 : 0.75 }}>
                <Icon name={a.icon} width={30} height={30} style={{ color: done ? "var(--gold-bright)" : "var(--ink-500)", flex: "none" }} />
                <div className="stack" style={{ gap: 4, flex: 1, minWidth: 0 }}>
                  <div className="spread">
                    <strong className={done ? "r-text r-rare" : ""}>{tx(a.name, locale)}</strong>
                    <span className="label num">
                      {value}/{a.gte}
                    </span>
                  </div>
                  <span className="dim ui" style={{ fontSize: "0.78rem" }}>
                    {tx(a.text, locale)}
                  </span>
                  {!done && <Bar value={value} max={a.gte} kind="exp" label={tx(a.name, locale)} />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "odds" && (
        <section className="panel stack">
          <h2>{t("codex.oddsTitle")}</h2>
          <p className="dim">{t("codex.oddsText")}</p>
          <div className="table-wrap">
            <table className="board">
              <thead>
                <tr>
                  <th>{t("codex.difficulty")}</th>
                  <th className="num">{t("codex.drop")}</th>
                  <th className="num r-text r-magic">{t("rarity.magic")}</th>
                  <th className="num r-text r-rare">{t("rarity.rare")}</th>
                  <th className="num r-text r-legendary">{t("rarity.legendary")}</th>
                </tr>
              </thead>
              <tbody>
                {DIFFICULTY_IDS.map((id) => {
                  const d = content.difficulties.get(id)!;
                  return (
                    <tr key={id}>
                      <td>{tx(d.name, locale)}</td>
                      <td className="num">{Math.round(d.dropChance * 100)} %</td>
                      <td className="num">{Math.round(d.rarity.magic * 100)} %</td>
                      <td className="num">{Math.round(d.rarity.rare * 100)} %</td>
                      <td className="num">{(d.rarity.legendary * 100).toFixed(1)} %</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="ui" style={{ fontSize: "0.82rem" }}>
            {t("codex.pity", { pity: view.pity, bonus: ((view.pity * PITY_STEP) * 100).toFixed(1) })}
          </p>
        </section>
      )}
    </>
  );
}
