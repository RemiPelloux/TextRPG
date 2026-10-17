"use client";

import { RECIPES } from "@textrpg/engine";
import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import { useGame } from "@/lib/game";
import { useCountdown } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n-client";
import { sfx } from "@/lib/sfx";
import { content, duration, tx } from "@/lib/text";

export default function Camp() {
  const { t, locale } = useI18n();
  const { view, dispatch, busy, heroId } = useGame();
  const { hero, derived, stats } = view;
  const nextTick = useCountdown(derived.nextTickIn);
  const story = view.quests.find((q) => q.type === "story");
  const storyTemplate = story
    ? content.quests.get(story.templateId)
    : view.story.nextId
      ? content.quests.get(view.story.nextId)
      : undefined;
  const ready = view.quests.filter((q) => q.progress >= q.goal).length;
  const streak = view.counters.restStreak;
  const base = `/play/${heroId}`;
  const bait = hero.bag.find((i) => i.baseId === "fish_bait")?.quantity ?? 0;
  const fishCount = hero.bag
    .filter((i) => content.items.get(i.baseId)?.kind === "fish")
    .reduce((n, i) => n + i.quantity, 0);

  return (
    <>
      <div className="page-head">
        <span className="label">{t("camp.eyebrow")}</span>
        <h1>{t("camp.title")}</h1>
        <p className="dim">{t(derived.night ? "camp.night" : "camp.day", { v: view.time.day })}</p>
      </div>

      {derived.bloodMoon && (
        <div className="panel ornate" style={{ borderColor: "var(--blood)" }}>
          <div className="row">
            <Icon name="GiEvilMoon" width={36} height={36} style={{ color: "var(--blood-text)" }} />
            <div className="stack" style={{ gap: 2 }}>
              <strong className="display r-text r-ancestral">{t("camp.bloodMoon")}</strong>
              <span className="dim">{t("camp.bloodMoonText")}</span>
            </div>
          </div>
        </div>
      )}

      <section className="panel ornate">
        <div className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
          <Icon name="GiCampfire" className={`flame ${derived.canRest ? "" : "out"}`} />
          <div className="stack" style={{ gap: 8, minWidth: 0, flex: 1 }}>
            <h2>{t("camp.fire")}</h2>
            <p className="dim">{derived.canRest ? t("camp.restReady") : t("camp.restDone")}</p>
            <div className="row">
              <button
                className="btn ember"
                disabled={busy || !derived.canRest || Boolean(view.dungeon)}
                onClick={() => {
                  sfx.heal();
                  void dispatch({ type: "rest" });
                }}
              >
                {t("camp.rest")}
              </button>
              <span className="chip ember">{t("camp.streak", { days: streak })}</span>
            </div>
            <p className="faint ui" style={{ fontSize: "0.75rem" }}>
              {hero.energy >= stats.maxEnergy
                ? t("camp.energyFull")
                : t("camp.nextEnergy", { time: duration(nextTick, locale) })}
            </p>
          </div>
        </div>
      </section>

      {storyTemplate && (
        <Link
          href={`${base}/quests`}
          className="panel stack"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <span className="label">{t("camp.story", { chapter: view.story.chapter + 1 })}</span>
          <h2>{tx(storyTemplate.title, locale)}</h2>
          {story ? (
            <p className="dim">
              {t("quests.progress", { progress: story.progress, goal: story.goal })}
            </p>
          ) : (
            <p className="dim">{t("quests.lockedLevel", { level: storyTemplate.minLevel })}</p>
          )}
        </Link>
      )}

      <section className="stack">
        <h2 className="label">{t("camp.today")}</h2>
        <div className="grid-cards">
          <Link href={`${base}/quests`} className="panel flat tile">
            <Icon name="GiScrollQuill" width={28} height={28} style={{ color: "var(--gold)" }} />
            <span>
              {ready
                ? t("camp.questsReady", { count: ready })
                : t("camp.questsActive", { count: view.quests.length })}
            </span>
          </Link>
          <Link href={`${base}/hunt`} className="panel flat tile">
            <Icon
              name="GiEvilMoon"
              width={28}
              height={28}
              style={{ color: derived.weeklyAvailable ? "var(--r-legendary)" : "var(--ink-500)" }}
            />
            <span>{derived.weeklyAvailable ? t("camp.weeklyOpen") : t("camp.weeklyDone")}</span>
          </Link>
          <Link href={`${base}/hunt#challenge`} className="panel flat tile">
            <Icon
              name="GiTrophyCup"
              width={28}
              height={28}
              style={{
                color: derived.challengeAvailable ? "var(--gold-bright)" : "var(--ink-500)",
              }}
            />
            <span>
              {derived.challengeAvailable ? t("camp.challengeOpen") : t("camp.challengeDone")}
            </span>
          </Link>
          <Link href={`${base}/market`} className="panel flat tile">
            <Icon name="GiTwoCoins" width={28} height={28} style={{ color: "var(--r-rare)" }} />
            <span>
              {t("camp.marketWares", { count: view.market.offers.filter((o) => !o.sold).length })}
            </span>
          </Link>
        </div>
      </section>

      <section className="stack">
        <h2 className="label">{t("camp.places")}</h2>
        <div className="grid-cards">
          <div className="panel stack">
            <div className="row">
              <Icon name="GiFishingPole" width={28} height={28} style={{ color: "var(--frost)" }} />
              <h3>{t("fishing.spot")}</h3>
            </div>
            <p className="dim">
              {derived.canFish ? t("fishing.ready", { bait }) : t("fishing.needRod")}
            </p>
            <button
              className="btn"
              disabled={
                busy || !derived.canFish || bait < 1 || hero.energy < 1 || Boolean(view.dungeon)
              }
              onClick={() => void dispatch({ type: "fish.cast" })}
            >
              {t("fishing.cast")} <span className="cost">⚡1</span>
            </button>
          </div>
          {[
            {
              href: `${base}/market`,
              icon: "GiTwoCoins",
              title: t("nav.market"),
              text: t("camp.marketText"),
            },
            {
              href: `${base}/forge`,
              icon: "GiAnvil",
              title: t("nav.forge"),
              text: t("camp.forgeText"),
            },
            {
              href: `${base}/cube`,
              icon: "GiCube",
              title: t("camp.cube"),
              text: t("camp.cubeText"),
            },
            {
              href: `${base}/codex`,
              icon: "GiSpellBook",
              title: t("nav.codex"),
              text: t("camp.codexText"),
            },
            {
              href: `/leaderboard`,
              icon: "GiLaurelsTrophy",
              title: t("nav.leaderboard"),
              text: t("camp.leaderboardText"),
            },
            {
              href: `${base}/settings`,
              icon: "GiCog",
              title: t("nav.settings"),
              text: t("camp.settingsText"),
            },
          ].map((place) => (
            <Link
              key={place.href}
              href={place.href}
              className="panel stack"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="row">
                <Icon name={place.icon} width={28} height={28} style={{ color: "var(--gold)" }} />
                <h3>{place.title}</h3>
              </div>
              <p className="dim">{place.text}</p>
            </Link>
          ))}
        </div>
      </section>

      {derived.alchemistLevel > 0 && (
        <section className="panel stack">
          <div className="spread">
            <h2>{t("camp.alchemy")}</h2>
            <span className="chip frost">{t("camp.fishOwned", { count: fishCount })}</span>
          </div>
          <div className="grid-cards">
            {RECIPES.filter((r) => r.level <= derived.alchemistLevel).map((recipe) => {
              const item = content.items.get(recipe.id)!;
              return (
                <div key={recipe.id} className="panel flat stack">
                  <div className="row">
                    <span className="medallion" style={{ "--size": "40px" } as React.CSSProperties}>
                      <Icon name={item.icon} />
                    </span>
                    <strong>{tx(item.name, locale)}</strong>
                  </div>
                  <span className="dim ui" style={{ fontSize: "0.78rem" }}>
                    {t(recipe.rareFish ? "camp.recipeRare" : "camp.recipe", {
                      fish: recipe.fish,
                      shards: recipe.shards,
                    })}
                  </span>
                  <button
                    className="btn small"
                    disabled={busy || hero.shards < recipe.shards}
                    onClick={() => void dispatch({ type: "alchemy.brew", recipeId: recipe.id })}
                  >
                    {t("camp.brew")}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="stack">
        <h2 className="label">{t("camp.buildings")}</h2>
        <div className="grid-cards">
          {[...content.buildings.values()].map((building) => {
            const level = hero.buildings[building.id];
            const next = building.levels[level + 1];
            return (
              <div key={building.id} className="panel stack">
                <div className="spread">
                  <div className="row">
                    <Icon
                      name={building.icon}
                      width={26}
                      height={26}
                      style={{ color: "var(--gold)" }}
                    />
                    <h3>{tx(building.name, locale)}</h3>
                  </div>
                  <span className="chip gold">
                    {t("camp.buildingLevel", { level: level + 1, max: building.levels.length })}
                  </span>
                </div>
                <p className="dim">{tx(building.text, locale)}</p>
                {next ? (
                  <button
                    className="btn small"
                    disabled={
                      busy ||
                      hero.gold < next.gold ||
                      hero.shards < next.shards ||
                      Boolean(view.dungeon)
                    }
                    onClick={() =>
                      void dispatch({ type: "building.upgrade", buildingId: building.id })
                    }
                  >
                    {t("camp.upgrade")}
                    <span className="cost">
                      {next.gold} ◉{next.shards ? ` · ${next.shards} ◆` : ""}
                    </span>
                  </button>
                ) : (
                  <span className="label">{t("camp.maxed")}</span>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
