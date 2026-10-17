"use client";

import { type ClientItem, rerollCost, upgradeCost } from "@textrpg/engine";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { baseOf, ItemRow, ItemTooltip } from "@/components/game/items";
import { useGame } from "@/lib/game";
import { useI18n } from "@/lib/i18n-client";
import { sfx } from "@/lib/sfx";
import { content, formatStat, tx } from "@/lib/text";

function ForgeInner() {
  const { t, locale } = useI18n();
  const { view, dispatch, busy } = useGame();
  const params = useSearchParams();
  const [selectedUid, setSelectedUid] = useState<string | null>(params.get("item"));
  const gear: ClientItem[] = [...Object.values(view.hero.equipment), ...view.hero.bag].filter(
    (i): i is ClientItem => Boolean(i) && baseOf(i!).kind === "equipment",
  );
  const item = gear.find((i) => i.uid === selectedUid);
  const blocked = Boolean(view.dungeon);

  return (
    <>
      <div className="page-head">
        <span className="label">{t("forge.eyebrow")}</span>
        <h1>{t("forge.title")}</h1>
        <p className="dim">{t("forge.intro", { max: view.derived.forgeMax })}</p>
      </div>
      {blocked && <p className="chip blood">{t("errors.inDungeon")}</p>}

      {item ? (
        <section className="panel ornate stack" style={{ gap: 16 }}>
          <ItemTooltip item={item} setCounts={view.setCounts} />
          <hr className="divider" />
          {(() => {
            const cost = upgradeCost(item);
            const maxed = item.upgrade >= view.derived.forgeMax;
            return (
              <div className="stack">
                <h3>{t("forge.upgrade", { level: item.upgrade + 1 })}</h3>
                <p className="dim">
                  {maxed
                    ? t("forge.limit")
                    : cost.failChance > 0
                      ? t("forge.risk", { pct: Math.round(cost.failChance * 100) })
                      : t("forge.safe")}
                </p>
                <button
                  className="btn primary"
                  disabled={
                    busy ||
                    blocked ||
                    maxed ||
                    view.hero.gold < cost.gold ||
                    view.hero.shards < cost.shards
                  }
                  onClick={() => {
                    sfx.hit();
                    void dispatch({ type: "forge.upgrade", uid: item.uid });
                  }}
                >
                  {t("forge.strike")}{" "}
                  <span className="cost">
                    {cost.gold} ◉ · {cost.shards} ◆
                  </span>
                </button>
              </div>
            );
          })()}
          {item.identified &&
            ["rare", "legendary", "set", "ancestral"].includes(item.rarity) &&
            item.affixes.length > 0 && (
              <div className="stack">
                <h3>{t("forge.reroll")}</h3>
                <p className="dim">{t("forge.rerollText")}</p>
                {item.affixes.map((affix, index) => {
                  const def = content.affixes.find((a) => a.id === affix.id)!;
                  const cost = rerollCost(item);
                  return (
                    <div
                      key={`${affix.id}-${index}`}
                      className="spread panel flat"
                      style={{ padding: 10 }}
                    >
                      <span className="ui">
                        {formatStat(def.stat, affix.value, t, locale)}{" "}
                        <span className="faint">({t("forge.tier", { tier: affix.tier + 1 })})</span>
                      </span>
                      <button
                        className="btn small"
                        disabled={
                          busy ||
                          blocked ||
                          view.hero.gold < cost.gold ||
                          view.hero.shards < cost.shards
                        }
                        onClick={() =>
                          void dispatch({ type: "forge.reroll", uid: item.uid, affixIndex: index })
                        }
                      >
                        {t("forge.rerollOne")}{" "}
                        <span className="cost">
                          {cost.gold} ◉ · {cost.shards} ◆
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          <button className="btn ghost small" onClick={() => setSelectedUid(null)}>
            {t("forge.choose")}
          </button>
        </section>
      ) : (
        <section className="stack">
          <h2 className="label">{t("forge.pick")}</h2>
          <div className="stack" style={{ gap: 8 }}>
            {gear.map((g) => (
              <ItemRow
                key={g.uid}
                item={g}
                onSelect={() => setSelectedUid(g.uid)}
                extra={g.upgrade ? <span className="r-text r-rare num">+{g.upgrade}</span> : null}
              />
            ))}
          </div>
          <p className="faint ui" style={{ fontSize: "0.75rem" }}>
            {t("forge.salvageHint", { building: tx(content.buildings.get("forge")?.name, locale) })}
          </p>
        </section>
      )}
    </>
  );
}

export default function Forge() {
  return (
    <Suspense>
      <ForgeInner />
    </Suspense>
  );
}
