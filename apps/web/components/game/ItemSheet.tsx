"use client";

import type { Slot } from "@textrpg/content";
import { type ClientItem, identifyCost } from "@textrpg/engine";
import Link from "next/link";

import { Sheet } from "@/components/ui/Sheet";
import { useGame } from "@/lib/game";
import { useI18n } from "@/lib/i18n-client";
import { sfx } from "@/lib/sfx";
import { itemName } from "@/lib/text";

import { baseOf, ItemTooltip } from "./items";

export function ItemSheet({
  item,
  onClose,
  equippedSlot,
}: {
  item: ClientItem | null;
  onClose: () => void;
  equippedSlot?: Slot;
}) {
  const { t, locale } = useI18n();
  const { view, dispatch, busy, heroId } = useGame();
  if (!item) return <Sheet open={false} onClose={onClose} label="" children={null} />;
  const base = baseOf(item);
  const isGear = base.kind === "equipment";
  const equipped = isGear && base.slot ? view.hero.equipment[base.slot] : undefined;
  const scrolls = view.hero.bag.find((i) => i.baseId === "identify_scroll")?.quantity ?? 0;
  const run = async (action: Parameters<typeof dispatch>[0], close = true) => {
    sfx.click();
    const ok = await dispatch(action);
    if (ok && close) onClose();
  };
  const usable =
    base.kind === "potion" ||
    base.kind === "elixir" ||
    (base.kind === "fish" && Boolean(base.effect?.healPct));

  return (
    <Sheet open onClose={onClose} label={itemName(item, locale, t)}>
      <div className="stack" style={{ gap: 16 }}>
        <ItemTooltip
          item={item}
          equipped={equippedSlot ? undefined : equipped}
          worn={Boolean(equippedSlot)}
          setCounts={view.setCounts}
          sigils={view.derived.sigils}
        />
        <div className="row">
          {isGear && !equippedSlot && (
            <button
              className="btn primary"
              disabled={busy}
              onClick={() => run({ type: "item.equip", uid: item.uid })}
            >
              {t("actions.equip")}
            </button>
          )}
          {equippedSlot && (
            <button
              className="btn"
              disabled={busy}
              onClick={() => run({ type: "item.unequip", slot: equippedSlot })}
            >
              {t("actions.unequip")}
            </button>
          )}
          {!item.identified && (
            <button
              className="btn primary"
              disabled={busy}
              onClick={() => run({ type: "item.identify", uid: item.uid }, false)}
            >
              {t("actions.identify")}
              <span className="cost">
                {scrolls > 0 ? t("items.withScroll") : `${identifyCost(item)} ◉`}
              </span>
            </button>
          )}
          {usable && (
            <button
              className="btn primary"
              disabled={busy || Boolean(view.combat)}
              onClick={() => run({ type: "item.use", uid: item.uid })}
            >
              {t(base.kind === "fish" ? "actions.eat" : "actions.use")}
            </button>
          )}
          {!equippedSlot && base.sellable && (
            <button
              className="btn"
              disabled={busy || item.locked}
              onClick={() => run({ type: "item.sell", uid: item.uid })}
            >
              {t("actions.sell")}
            </button>
          )}
          {!equippedSlot && isGear && (
            <button
              className="btn"
              disabled={busy || item.locked}
              onClick={() => run({ type: "forge.salvage", uid: item.uid })}
            >
              {t("actions.salvage")}
            </button>
          )}
          {isGear && (
            <button
              className="btn ghost small"
              disabled={busy}
              onClick={() => run({ type: "item.lock", uid: item.uid }, false)}
            >
              {t(item.locked ? "actions.unlock" : "actions.lock")}
            </button>
          )}
          {isGear && (
            <Link
              className="btn ghost small"
              href={`/play/${heroId}/forge?item=${item.uid}`}
              onClick={onClose}
            >
              {t("actions.toForge")}
            </Link>
          )}
        </div>
      </div>
    </Sheet>
  );
}
