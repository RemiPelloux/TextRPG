"use client";

import { type ClientItem, RARITY_ORDER } from "@textrpg/engine";
import { useMemo, useState } from "react";

import { baseOf, ItemRow } from "@/components/game/items";
import { ItemSheet } from "@/components/game/ItemSheet";
import { useGame } from "@/lib/game";
import { useI18n } from "@/lib/i18n-client";

type Filter = "all" | "gear" | "consumables" | "quest" | "unknown";

export default function Bag() {
  const { t } = useI18n();
  const { view, dispatch, busy } = useGame();
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<ClientItem | null>(null);
  const bag = view.hero.bag;

  const items = useMemo(() => {
    const kind = (i: ClientItem) => baseOf(i).kind;
    const filtered = bag.filter((i) => {
      if (filter === "gear") return kind(i) === "equipment";
      if (filter === "consumables") return ["potion", "elixir", "scroll", "bait", "fish"].includes(kind(i));
      if (filter === "quest") return kind(i) === "quest";
      if (filter === "unknown") return !i.identified;
      return true;
    });
    return [...filtered].sort(
      (a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || b.ilvl - a.ilvl || a.baseId.localeCompare(b.baseId),
    );
  }, [bag, filter]);

  const unknown = bag.filter((i) => !i.identified).length;
  const junk = bag.filter((i) => (i.rarity === "common" || i.rarity === "magic") && baseOf(i).kind === "equipment" && !i.locked).length;
  const current = selected ? bag.find((i) => i.uid === selected.uid) ?? null : null;
  const filters: Filter[] = ["all", "gear", "consumables", "quest", "unknown"];

  return (
    <>
      <div className="page-head">
        <span className="label">{t("bag.eyebrow")}</span>
        <div className="spread">
          <h1>{t("bag.title")}</h1>
          <span className={`chip ${bag.length >= view.derived.bagCapacity ? "blood" : ""}`}>
            {bag.length}/{view.derived.bagCapacity}
          </span>
        </div>
      </div>

      <div className="row">
        <button className="btn primary small" disabled={busy || unknown === 0 || Boolean(view.combat)} onClick={() => void dispatch({ type: "item.identifyAll" })}>
          {t("bag.identifyAll")} <span className="cost">{unknown}</span>
        </button>
        <button className="btn small" disabled={busy || junk === 0 || Boolean(view.combat)} onClick={() => void dispatch({ type: "item.sellJunk" })}>
          {t("bag.sellJunk")} <span className="cost">{junk}</span>
        </button>
      </div>

      <div className="tabs" role="tablist">
        {filters.map((f) => (
          <button key={f} role="tab" className="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>
            {t(`bag.filter.${f}`)}
          </button>
        ))}
      </div>

      <div className="stack" style={{ gap: 8 }}>
        {items.length === 0 && <p className="dim">{t("bag.empty")}</p>}
        {items.map((item) => {
          const base = baseOf(item);
          return <ItemRow key={item.uid} item={item} equipped={base.slot ? view.hero.equipment[base.slot] : undefined} onSelect={() => setSelected(item)} />;
        })}
      </div>

      <ItemSheet item={current} onClose={() => setSelected(null)} />
    </>
  );
}
