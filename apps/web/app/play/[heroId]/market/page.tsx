"use client";

import { STOCK } from "@textrpg/engine";
import { useState } from "react";

import { baseOf, ItemRow, ItemTooltip } from "@/components/game/items";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useGame } from "@/lib/game";
import { useI18n } from "@/lib/i18n-client";
import { content, itemName, tx } from "@/lib/text";

export default function Market() {
  const { t, locale } = useI18n();
  const { view, dispatch, busy } = useGame();
  const [selected, setSelected] = useState<string | null>(null);
  const offer = view.market.offers.find((o) => o.uid === selected);
  const gold = view.hero.gold;
  const blocked = Boolean(view.dungeon);

  return (
    <>
      <div className="page-head">
        <span className="label">{t("market.eyebrow")}</span>
        <h1>{t("market.title")}</h1>
        <p className="dim">{t("market.intro")}</p>
      </div>
      {blocked && <p className="chip blood">{t("errors.inDungeon")}</p>}

      <section className="stack">
        <h2 className="label">{t("market.wares")}</h2>
        <div className="stack" style={{ gap: 8 }}>
          {view.market.offers.map((o) => {
            const base = baseOf(o.item);
            return (
              <div key={o.uid} style={{ opacity: o.sold ? 0.4 : 1 }}>
                <ItemRow
                  item={o.item}
                  equipped={base.slot ? view.hero.equipment[base.slot] : undefined}
                  onSelect={() => !o.sold && setSelected(o.uid)}
                  extra={
                    o.sold ? (
                      <span className="label">{t("market.sold")}</span>
                    ) : (
                      <span className={gold >= o.price ? "r-text r-rare num" : "delta-down num"}>
                        {o.price} ◉
                      </span>
                    )
                  }
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="stack">
        <h2 className="label">{t("market.stock")}</h2>
        <div className="grid-cards">
          {STOCK.filter((s) => s.minLevel <= view.hero.level).map((entry) => {
            const item = content.items.get(entry.itemId)!;
            const owned = view.hero.bag.find((i) => i.baseId === entry.itemId)?.quantity ?? 0;
            const rodOwned =
              entry.itemId === "fishing_rod" && (owned > 0 || view.hero.equipment.tool);
            return (
              <div key={entry.itemId} className="panel flat stack">
                <div className="row" style={{ flexWrap: "nowrap" }}>
                  <span className="medallion" style={{ "--size": "42px" } as React.CSSProperties}>
                    <Icon name={item.icon} />
                  </span>
                  <div className="stack" style={{ gap: 0, minWidth: 0 }}>
                    <strong>{tx(item.name, locale)}</strong>
                    <span className="faint ui" style={{ fontSize: "0.72rem" }}>
                      {t("market.owned", { count: owned })}
                    </span>
                  </div>
                </div>
                {item.flavor && (
                  <p className="dim" style={{ fontSize: "0.85rem" }}>
                    {tx(item.flavor, locale)}
                  </p>
                )}
                <button
                  className="btn small"
                  disabled={busy || blocked || gold < item.price || Boolean(rodOwned)}
                  onClick={() => void dispatch({ type: "market.buyStock", itemId: entry.itemId })}
                >
                  {rodOwned ? t("market.ownedRod") : t("market.buy")}{" "}
                  <span className="cost">{item.price} ◉</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <Sheet
        open={Boolean(offer)}
        onClose={() => setSelected(null)}
        label={offer ? itemName(offer.item, locale, t) : ""}
      >
        {offer && (
          <div className="stack" style={{ gap: 16 }}>
            <ItemTooltip
              item={offer.item}
              equipped={
                baseOf(offer.item).slot ? view.hero.equipment[baseOf(offer.item).slot!] : undefined
              }
              setCounts={view.setCounts}
              sigils={view.derived.sigils}
            />
            <button
              className="btn primary"
              disabled={busy || blocked || gold < offer.price}
              onClick={async () => {
                if (await dispatch({ type: "market.buy", offerUid: offer.uid })) setSelected(null);
              }}
            >
              {t("market.buy")} <span className="cost">{offer.price} ◉</span>
            </button>
          </div>
        )}
      </Sheet>
    </>
  );
}
