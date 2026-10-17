"use client";

import type { Rarity } from "@textrpg/content";
import {
  type ClientItem,
  CUBE_SLOT_LEVELS,
  type CubePower,
  type Enchant,
  enchantCost,
  infuseCost,
  powerKey,
  reforgeCost,
  TRANSMUTE_NEXT,
  transmuteCost,
} from "@textrpg/engine";
import { useState } from "react";

import { baseOf, ItemRow, ItemTooltip, ProcLine } from "@/components/game/items";
import { Icon } from "@/components/ui/Icon";
import { useGame } from "@/lib/game";
import { useI18n } from "@/lib/i18n-client";
import { sfx } from "@/lib/sfx";
import { content, formatStat, itemName, legendName, rarityClass, tx } from "@/lib/text";

type Tab = "transmute" | "enchant" | "infuse" | "reforge" | "powers";
const TABS: Tab[] = ["transmute", "enchant", "infuse", "reforge", "powers"];

function Cost({ cost }: { cost: { gold: number; shards: number } }) {
  return (
    <span className="cost">
      {cost.gold > 0 ? `${cost.gold} ◉ · ` : ""}
      {cost.shards} ◆
    </span>
  );
}

/** Gear the cube accepts: equipment, never tools. */
function cubeable(item: ClientItem | undefined): item is ClientItem {
  if (!item) return false;
  const base = baseOf(item);
  return base.kind === "equipment" && base.slot !== "tool";
}

export default function Cube() {
  const { t } = useI18n();
  const { view } = useGame();
  const [tab, setTab] = useState<Tab>(view.cube.offer ? "enchant" : "transmute");
  const blocked = Boolean(view.dungeon);

  return (
    <>
      <div className="page-head">
        <span className="label">{t("cube.eyebrow")}</span>
        <h1>{t("cube.title")}</h1>
        <p className="dim">{t("cube.intro")}</p>
      </div>
      {blocked && <p className="chip blood">{t("errors.inDungeon")}</p>}
      <div className="tabs" role="tablist">
        {TABS.map((id) => (
          <button
            key={id}
            role="tab"
            className="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {t(`cube.tab.${id}`)}
          </button>
        ))}
      </div>
      {tab === "transmute" && <Transmute blocked={blocked} />}
      {tab === "enchant" && <EnchantTab blocked={blocked} />}
      {tab === "infuse" && <Infuse blocked={blocked} />}
      {tab === "reforge" && <Reforge blocked={blocked} />}
      {tab === "powers" && <Powers blocked={blocked} />}
    </>
  );
}

function useCanPay() {
  const { view } = useGame();
  return (cost: { gold: number; shards: number }) =>
    view.hero.gold >= cost.gold && view.hero.shards >= cost.shards;
}

function Transmute({ blocked }: { blocked: boolean }) {
  const { t } = useI18n();
  const { view, dispatch, busy } = useGame();
  const canPay = useCanPay();
  const [picked, setPicked] = useState<string[]>([]);
  const items = view.hero.bag.filter(
    (i) => cubeable(i) && i.identified && !i.locked && TRANSMUTE_NEXT[i.rarity],
  );
  const chosen = picked
    .map((uid) => items.find((i) => i.uid === uid))
    .filter((i): i is ClientItem => Boolean(i));
  const rarity: Rarity | undefined = chosen[0]?.rarity;
  const visible = rarity ? items.filter((i) => i.rarity === rarity) : items;
  const cost = rarity ? transmuteCost(rarity, Math.max(...chosen.map((i) => i.ilvl))) : undefined;
  const toggle = (uid: string) =>
    setPicked((p) =>
      p.includes(uid) ? p.filter((u) => u !== uid) : p.length < 3 ? [...p, uid] : p,
    );

  return (
    <section className="stack">
      <p className="dim">{t("cube.transmuteText")}</p>
      <div className="panel ornate spread" style={{ alignItems: "center" }}>
        <span className="ui">
          {t("cube.picked", { count: chosen.length })}
          {rarity && (
            <span className={`r-text ${rarityClass(TRANSMUTE_NEXT[rarity]!)}`}>
              {" "}
              {t("cube.into", { rarity: t(`rarity.${TRANSMUTE_NEXT[rarity]}`) })}
            </span>
          )}
        </span>
        <button
          className="btn primary"
          disabled={busy || blocked || chosen.length !== 3 || !cost || !canPay(cost)}
          onClick={async () => {
            sfx.hit();
            const [a, b, c] = chosen;
            if (await dispatch({ type: "cube.transmute", uids: [a!.uid, b!.uid, c!.uid] }))
              setPicked([]);
          }}
        >
          {t("cube.transmuteGo")} {cost && <Cost cost={cost} />}
        </button>
      </div>
      {visible.length === 0 && <p className="faint">{t("cube.nothing")}</p>}
      <div className="stack" style={{ gap: 8 }}>
        {visible.map((item) => (
          <ItemRow
            key={item.uid}
            item={item}
            onSelect={() => toggle(item.uid)}
            extra={
              picked.includes(item.uid) ? (
                <span className="chip gold">{picked.indexOf(item.uid) + 1}</span>
              ) : null
            }
          />
        ))}
      </div>
    </section>
  );
}

function ownedGear(view: ReturnType<typeof useGame>["view"]): ClientItem[] {
  return [...Object.values(view.hero.equipment), ...view.hero.bag].filter(cubeable);
}

function EnchantOption({ option }: { option: Enchant }) {
  const { t, locale } = useI18n();
  if (option.proc) return <ProcLine proc={option.proc} enchant />;
  const def = option.affix ? content.affixes.find((a) => a.id === option.affix!.id) : undefined;
  return def ? (
    <div className="power enchant">✧ {formatStat(def.stat, option.affix!.value, t, locale)}</div>
  ) : null;
}

function EnchantTab({ blocked }: { blocked: boolean }) {
  const { t, locale } = useI18n();
  const { view, dispatch, busy } = useGame();
  const canPay = useCanPay();
  const [uid, setUid] = useState<string | null>(view.cube.offer?.uid ?? null);
  const gear = ownedGear(view).filter((i) => i.identified);
  const item = gear.find((i) => i.uid === uid);
  const offer = view.cube.offer;

  if (offer) {
    const target = ownedGear(view).find((i) => i.uid === offer.uid);
    return (
      <section className="stack">
        <h2>{t("cube.choose")}</h2>
        {target && <p className="ui">{itemName(target, locale, t)}</p>}
        <div className="grid-cards">
          {offer.options.map((option, index) => (
            <article key={index} className="panel ornate stack">
              <EnchantOption option={option} />
              <button
                className="btn primary"
                disabled={busy}
                onClick={() => {
                  sfx.loot("rare");
                  void dispatch({ type: "cube.enchantPick", index });
                }}
              >
                {t("cube.keep")}
              </button>
            </article>
          ))}
        </div>
      </section>
    );
  }
  if (item) {
    const cost = enchantCost(item);
    return (
      <section className="panel ornate stack" style={{ gap: 16 }}>
        <ItemTooltip item={item} sigils={view.derived.sigils} />
        <p className="dim">{t("cube.enchantText")}</p>
        <div className="row">
          <button
            className="btn primary"
            disabled={busy || blocked || !canPay(cost)}
            onClick={() => {
              sfx.click();
              void dispatch({ type: "cube.enchant", uid: item.uid });
            }}
          >
            {t("cube.enchantGo")} <Cost cost={cost} />
          </button>
          <button className="btn ghost small" onClick={() => setUid(null)}>
            {t("forge.choose")}
          </button>
        </div>
      </section>
    );
  }
  return (
    <section className="stack">
      <p className="dim">{t("cube.enchantText")}</p>
      <ItemList items={gear} onPick={setUid} />
    </section>
  );
}

function ItemList({ items, onPick }: { items: ClientItem[]; onPick: (uid: string) => void }) {
  const { t } = useI18n();
  if (items.length === 0) return <p className="faint">{t("cube.nothing")}</p>;
  return (
    <div className="stack" style={{ gap: 8 }}>
      {items.map((item) => (
        <ItemRow key={item.uid} item={item} onSelect={() => onPick(item.uid)} />
      ))}
    </div>
  );
}

function Infuse({ blocked }: { blocked: boolean }) {
  const { t, locale } = useI18n();
  const { view, dispatch, busy } = useGame();
  const canPay = useCanPay();
  const [target, setTarget] = useState<string | null>(null);
  const [donor, setDonor] = useState<string | null>(null);
  const gear = ownedGear(view).filter((i) => i.rarity !== "set");
  const item = gear.find((i) => i.uid === target);
  const donors = view.hero.bag.filter(
    (i) => cubeable(i) && i.identified && i.sigil && !i.locked && i.uid !== target,
  );
  const giver = donors.find((i) => i.uid === donor);
  const cost = item ? infuseCost(item) : undefined;

  return (
    <section className="stack">
      <p className="dim">{t("cube.infuseText")}</p>
      <h3 className="label">{t("cube.target")}</h3>
      {item ? (
        <button type="button" className="btn ghost small" onClick={() => setTarget(null)}>
          {itemName(item, locale, t)} ✕
        </button>
      ) : (
        <ItemList items={gear} onPick={setTarget} />
      )}
      {item && (
        <>
          <h3 className="label">{t("cube.donor")}</h3>
          <div className="stack" style={{ gap: 8 }}>
            {donors.length === 0 && <p className="faint">{t("cube.nothing")}</p>}
            {donors.map((d) => {
              const sigil = content.sigils.get(d.sigil!);
              return (
                <ItemRow
                  key={d.uid}
                  item={d}
                  onSelect={() => setDonor(d.uid)}
                  extra={
                    <span style={{ color: sigil?.color }}>
                      {sigil && <Icon name={sigil.icon} />} {tx(sigil?.name, locale)}
                      {donor === d.uid ? " ✓" : ""}
                    </span>
                  }
                />
              );
            })}
          </div>
          <button
            className="btn primary"
            disabled={busy || blocked || !giver || !cost || !canPay(cost)}
            onClick={async () => {
              sfx.hit();
              if (await dispatch({ type: "cube.infuse", uid: item.uid, donorUid: giver!.uid }))
                setDonor(null);
            }}
          >
            {t("cube.infuseGo")} {cost && <Cost cost={cost} />}
          </button>
        </>
      )}
    </section>
  );
}

function Reforge({ blocked }: { blocked: boolean }) {
  const { t } = useI18n();
  const { view, dispatch, busy } = useGame();
  const canPay = useCanPay();
  const [uid, setUid] = useState<string | null>(null);
  const gear = ownedGear(view).filter(
    (i) => i.identified && ["rare", "legendary", "ancestral"].includes(i.rarity),
  );
  const item = gear.find((i) => i.uid === uid);
  if (!item)
    return (
      <section className="stack">
        <p className="dim">{t("cube.reforgeText")}</p>
        <ItemList items={gear} onPick={setUid} />
      </section>
    );
  const cost = reforgeCost(item);
  return (
    <section className="panel ornate stack" style={{ gap: 16 }}>
      <ItemTooltip item={item} sigils={view.derived.sigils} />
      <div className="row">
        <button
          className="btn primary"
          disabled={busy || blocked || !canPay(cost)}
          onClick={() => {
            sfx.hit();
            void dispatch({ type: "cube.reforge", uid: item.uid });
          }}
        >
          {t("cube.reforgeGo")} <Cost cost={cost} />
        </button>
        <button className="btn ghost small" onClick={() => setUid(null)}>
          {t("forge.choose")}
        </button>
      </div>
    </section>
  );
}

function PowerCard({ power, children }: { power: CubePower; children?: React.ReactNode }) {
  const { t, locale } = useI18n();
  const legendary = power.legendaryId ? content.legendaries.get(power.legendaryId) : undefined;
  const name = legendary
    ? tx(legendary.name, locale)
    : power.legend
      ? legendName(power.legend, locale, t)
      : power.key;
  return (
    <article className="panel stack r-legendary" style={{ gap: 6 }}>
      <div className="row">
        <Icon name={content.items.get(power.baseId)?.icon ?? "GiCube"} />
        <strong className="r-text r-legendary">{name}</strong>
      </div>
      {legendary && <div className="power">✦ {tx(legendary.powerText, locale)}</div>}
      {power.procs?.map((proc, i) => (
        <ProcLine key={i} proc={proc} />
      ))}
      {children}
    </article>
  );
}

function Powers({ blocked }: { blocked: boolean }) {
  const { t } = useI18n();
  const { view, dispatch, busy } = useGame();
  const [confirm, setConfirm] = useState<string | null>(null);
  const { powers, slots } = view.cube;
  const known = new Set(powers.map((p) => p.key));
  const extractable = view.hero.bag.filter((i) => {
    const key = i.identified ? powerKey(i) : undefined;
    return key && !i.locked && !known.has(key);
  });
  const free = slots.findIndex((k, i) => k === null && i < view.derived.cubeSlots);

  return (
    <section className="stack">
      <p className="dim">{t("cube.powersText")}</p>
      <div className="grid-cards">
        {CUBE_SLOT_LEVELS.map((level, i) => {
          const power = powers.find((p) => p.key === slots[i]);
          const open = i < view.derived.cubeSlots;
          return (
            <div key={level} className="stack" style={{ gap: 6 }}>
              <span className="label">{t("cube.slot", { n: i + 1 })}</span>
              {!open ? (
                <div className="panel flat faint">🔒 {t("cube.slotLocked", { level })}</div>
              ) : power ? (
                <PowerCard power={power}>
                  <button
                    className="btn ghost small"
                    disabled={busy || blocked}
                    onClick={() => void dispatch({ type: "cube.slot", slot: i, key: null })}
                  >
                    {t("cube.remove")}
                  </button>
                </PowerCard>
              ) : (
                <div className="panel flat faint">{t("cube.empty")}</div>
              )}
            </div>
          );
        })}
      </div>

      <h3 className="label">{t("cube.library")}</h3>
      {powers.length === 0 && <p className="faint">{t("cube.nothing")}</p>}
      <div className="grid-cards">
        {powers
          .filter((p) => !slots.includes(p.key))
          .map((power) => (
            <PowerCard key={power.key} power={power}>
              <button
                className="btn small"
                disabled={busy || blocked || free < 0}
                onClick={() => {
                  sfx.click();
                  void dispatch({ type: "cube.slot", slot: free, key: power.key });
                }}
              >
                {t("cube.place")}
              </button>
            </PowerCard>
          ))}
      </div>

      <h3 className="label">{t("cube.extractable")}</h3>
      {extractable.length === 0 && <p className="faint">{t("cube.nothing")}</p>}
      <div className="stack" style={{ gap: 8 }}>
        {extractable.map((item) =>
          confirm === item.uid ? (
            <div key={item.uid} className="panel ornate stack">
              <ItemTooltip item={item} />
              <div className="row">
                <button
                  className="btn danger"
                  disabled={busy || blocked}
                  onClick={() => {
                    sfx.loot("legendary");
                    void dispatch({ type: "cube.extract", uid: item.uid });
                  }}
                >
                  {t("cube.extract")}
                </button>
                <button className="btn ghost small" onClick={() => setConfirm(null)}>
                  {t("forge.choose")}
                </button>
              </div>
            </div>
          ) : (
            <ItemRow
              key={item.uid}
              item={item}
              onSelect={() => setConfirm(item.uid)}
              extra={<span className="chip">{t("cube.extract")}</span>}
            />
          ),
        )}
      </div>
    </section>
  );
}
