"use client";

import type { Slot, StatKey } from "@textrpg/content";
import { type ClientItem, itemStats, requiredLevel, sellValue } from "@textrpg/engine";

import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/lib/i18n-client";
import { content, formatStat, itemName, rarityClass, tx } from "@/lib/text";

export function baseOf(item: ClientItem) {
  return content.items.get(item.baseId)!;
}

export function ItemMedallion({ item, size }: { item: ClientItem; size?: number }) {
  const base = baseOf(item);
  return (
    <span className={`medallion ${rarityClass(item.rarity)}`} style={size ? ({ "--size": `${size}px` } as React.CSSProperties) : undefined}>
      <Icon name={base.icon} />
      {item.upgrade > 0 && <span className="up">+{item.upgrade}</span>}
      {item.quantity > 1 && <span className="qty">{item.quantity}</span>}
    </span>
  );
}

/** Stat differences if this item replaced what is worn in its slot. */
export function compareTo(item: ClientItem, equipped: ClientItem | undefined): Partial<Record<StatKey, number>> {
  const mine = itemStats(item, content);
  const theirs = equipped ? itemStats(equipped, content) : {};
  const keys = new Set([...Object.keys(mine), ...Object.keys(theirs)] as StatKey[]);
  const diff: Partial<Record<StatKey, number>> = {};
  for (const key of keys) {
    const d = Math.round(((mine[key] ?? 0) - (theirs[key] ?? 0)) * 10) / 10;
    if (d !== 0) diff[key] = d;
  }
  return diff;
}

/** Positive when the item looks like an upgrade (weighted sum of differences). */
export function upgradeScore(diff: Partial<Record<StatKey, number>>): number {
  const weights: Partial<Record<StatKey, number>> = { strength: 1.6, defense: 1, speed: 0.8, luck: 0.6, maxHealth: 0.15, damagePct: 0.9, critChance: 1.2, critDamage: 0.4 };
  return Object.entries(diff).reduce((sum, [k, v]) => sum + (weights[k as StatKey] ?? 0.3) * (v ?? 0), 0);
}

export function ItemRow({
  item,
  equipped,
  onSelect,
  extra,
}: {
  item: ClientItem;
  equipped?: ClientItem | undefined;
  onSelect: () => void;
  extra?: React.ReactNode;
}) {
  const { t, locale } = useI18n();
  const base = baseOf(item);
  const isGear = base.kind === "equipment";
  const score = isGear ? upgradeScore(compareTo(item, equipped)) : 0;
  return (
    <button type="button" className={`item-row ${rarityClass(item.rarity)}`} onClick={onSelect}>
      <ItemMedallion item={item} />
      <span className="stack" style={{ gap: 2, minWidth: 0 }}>
        <span className={`title ${item.identified ? "" : "unknown-name"}`}>{itemName(item, locale, t)}</span>
        <span className="sub">
          {isGear ? `${t(`slots.${base.slot}`)} · ${t(`rarity.${item.rarity}`)} · ilvl ${item.ilvl}` : t(`kinds.${base.kind}`)}
          {item.locked ? " · 🔒" : ""}
        </span>
      </span>
      <span className="ui" style={{ fontSize: "0.8rem", textAlign: "right" }}>
        {extra ??
          (isGear && score !== 0 ? (
            <span className={score > 0 ? "delta-up" : "delta-down"} aria-label={t(score > 0 ? "items.better" : "items.worse")}>
              {score > 0 ? "▲" : "▼"}
            </span>
          ) : null)}
      </span>
    </button>
  );
}

export function ItemTooltip({ item, equipped, setCounts }: { item: ClientItem; equipped?: ClientItem | undefined; setCounts?: Record<string, number> }) {
  const { t, locale } = useI18n();
  const base = baseOf(item);
  const stats = itemStats(item, content);
  const diff = base.kind === "equipment" ? compareTo(item, equipped) : {};
  const legendary = item.legendaryId ? content.legendaries.get(item.legendaryId) : undefined;
  const setEntry = item.setPieceId ? content.setPieces.get(item.setPieceId) : undefined;
  const flavor = legendary?.flavor ?? base.flavor;
  return (
    <div className={`tooltip ${rarityClass(item.rarity)}`}>
      <div className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
        <ItemMedallion item={item} size={64} />
        <div className="stack" style={{ gap: 2, minWidth: 0 }}>
          <span className={`name ${item.identified ? "" : "unknown-name"}`}>
            {itemName(item, locale, t)}
            {item.upgrade > 0 ? ` +${item.upgrade}` : ""}
          </span>
          <span className="label">
            {base.kind === "equipment" ? `${t(`slots.${base.slot}`)} · ${t(`rarity.${item.rarity}`)} · ilvl ${item.ilvl}` : t(`kinds.${base.kind}`)}
          </span>
        </div>
      </div>
      {Object.keys(stats).length > 0 && (
        <div className="stats">
          {(Object.entries(stats) as [StatKey, number][]).map(([stat, value]) => (
            <div className="line" key={stat}>
              <span>{formatStat(stat, value, t, locale)}</span>
              {diff[stat] !== undefined && (
                <span className={diff[stat]! > 0 ? "delta-up" : "delta-down"}>
                  {diff[stat]! > 0 ? "▲" : "▼"} {Math.abs(diff[stat]!)}
                </span>
              )}
            </div>
          ))}
          {(Object.entries(diff) as [StatKey, number][])
            .filter(([stat]) => stats[stat] === undefined)
            .map(([stat, value]) => (
              <div className="line faint" key={stat}>
                <span>{t(`stats.${stat}`)}</span>
                <span className="delta-down">▼ {Math.abs(value)}</span>
              </div>
            ))}
          {!item.identified && item.hiddenAffixes
            ? Array.from({ length: item.hiddenAffixes }, (_, i) => (
                <div className="line hidden-affix" key={`h${i}`}>
                  ??? ???
                </div>
              ))
            : null}
        </div>
      )}
      {base.effect?.healPct ? <div className="ui">{t("items.heals", { pct: Math.round(base.effect.healPct * 100) })}</div> : null}
      {base.effect?.energy ? <div className="ui">{t("items.energy", { amount: base.effect.energy })}</div> : null}
      {base.buff ? <div className="ui">{t("items.buff", { stat: formatStat(base.buff.stat, base.buff.value, t, locale), fights: base.buff.fights })}</div> : null}
      {legendary && item.identified && <div className="power">✦ {tx(legendary.powerText, locale)}</div>}
      {!item.identified && ["legendary", "ancestral", "set"].includes(item.rarity) && <div className="power faint">✦ ???</div>}
      {setEntry && item.identified && (
        <div className="stack" style={{ gap: 2 }}>
          <span className="ui r-text r-set" style={{ fontWeight: 600 }}>
            {tx(setEntry.set.name, locale)} ({setCounts?.[setEntry.set.id] ?? 0}/{setEntry.set.pieces.length})
          </span>
          {setEntry.set.bonuses.map((bonus) => (
            <span key={bonus.pieces} className={`setline ${(setCounts?.[setEntry.set.id] ?? 0) >= bonus.pieces ? "on" : ""}`}>
              ({bonus.pieces}) {tx(bonus.text, locale)}
            </span>
          ))}
        </div>
      )}
      {flavor && <p className="flavor">« {tx(flavor, locale)} »</p>}
      <div className="spread label">
        {base.kind === "equipment" ? <span>{t("items.requires", { level: requiredLevel(item, { content }) })}</span> : <span />}
        {base.sellable && <span>{t("items.sellsFor", { gold: sellValue(item, content) })}</span>}
      </div>
    </div>
  );
}

export function slotOrder(): Slot[] {
  return ["helm", "amulet", "weapon", "armor", "gloves", "ring", "boots", "tool"];
}
