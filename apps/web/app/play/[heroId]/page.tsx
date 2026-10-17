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

  const today = [
    {
      href: `${base}/quests`,
      icon: "GiScrollQuill",
      tone: "var(--gold)",
      text: ready
        ? t("camp.questsReady", { count: ready })
        : t("camp.questsActive", { count: view.quests.length }),
      on: true,
    },
    {
      href: `${base}/hunt`,
      icon: "GiEvilMoon",
      tone: "var(--r-legendary)",
      text: derived.weeklyAvailable ? t("camp.weeklyOpen") : t("camp.weeklyDone"),
      on: derived.weeklyAvailable,
    },
    {
      href: `${base}/hunt#challenge`,
      icon: "GiTrophyCup",
      tone: "var(--gold-bright)",
      text: derived.challengeAvailable ? t("camp.challengeOpen") : t("camp.challengeDone"),
      on: derived.challengeAvailable,
    },
    {
      href: `${base}/market`,
      icon: "GiTwoCoins",
      tone: "var(--r-rare)",
      text: t("camp.marketWares", { count: view.market.offers.filter((o) => !o.sold).length }),
      on: true,
    },
  ];
  const places = [
    {
      href: `${base}/market`,
      icon: "GiTwoCoins",
      title: t("nav.market"),
      text: t("camp.marketText"),
    },
    { href: `${base}/forge`, icon: "GiAnvil", title: t("nav.forge"), text: t("camp.forgeText") },
    { href: `${base}/cube`, icon: "GiCube", title: t("camp.cube"), text: t("camp.cubeText") },
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
  ];

  return (
    <>
      <div className="page-head">
        <span className="label">{t("camp.eyebrow")}</span>
        <h1>{t("camp.title")}</h1>
        <p className="dim">{t(derived.night ? "camp.night" : "camp.day", { v: view.time.day })}</p>
      </div>

      <section className="panel ornate scene">
        <figure className="plate" style={{ margin: 0 }}>
          <Icon name="GiCampfire" className={`flame ${derived.canRest ? "" : "out"}`} />
        </figure>
        <div className="stack" style={{ gap: 10, minWidth: 0 }}>
          <h2>{t("camp.fire")}</h2>
          <p className="dim">{derived.canRest ? t("camp.restReady") : t("camp.restDone")}</p>
          <div className="actions">
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
          {derived.bloodMoon && (
            <div className="moon-note">
              <Icon name="GiEvilMoon" width={20} height={20} />
              <span>
                <strong>{t("camp.bloodMoon")}</strong> · {t("camp.bloodMoonText")}
              </span>
            </div>
          )}
        </div>
      </section>

      {storyTemplate && (
        <Link href={`${base}/quests`} className="panel story">
          <span className="seal">
            <Icon name="GiQuillInk" />
          </span>
          <span className="stack" style={{ gap: 6, minWidth: 0 }}>
            <span className="label" style={{ color: "var(--rubric)" }}>
              {t("camp.story", { chapter: view.story.chapter + 1 })}
            </span>
            <span className="display story-title">{tx(storyTemplate.title, locale)}</span>
            {story ? (
              <>
                <span className="progress" aria-hidden>
                  <span
                    style={{ width: `${Math.min(100, (100 * story.progress) / story.goal)}%` }}
                  />
                </span>
                <span className="faint ui" style={{ fontSize: "0.75rem" }}>
                  {t("quests.progress", { progress: story.progress, goal: story.goal })}
                </span>
              </>
            ) : (
              <span className="dim">
                {t("quests.lockedLevel", { level: storyTemplate.minLevel })}
              </span>
            )}
          </span>
          <span className="chev" aria-hidden>
            ›
          </span>
        </Link>
      )}

      <section className="stack">
        <h2 className="label">{t("camp.today")}</h2>
        <nav className="panel list">
          {today.map((entry) => (
            <Link key={entry.text} href={entry.href} className="list-row">
              <span
                className="seal"
                style={
                  { "--tone": entry.on ? entry.tone : "var(--ink-500)" } as React.CSSProperties
                }
              >
                <Icon name={entry.icon} />
              </span>
              <span className={entry.on ? "" : "faint"}>{entry.text}</span>
              <span className="chev" aria-hidden>
                ›
              </span>
            </Link>
          ))}
        </nav>
      </section>

      <section className="stack">
        <h2 className="label">{t("camp.places")}</h2>
        <div className="tiles">
          <div className="panel place">
            <span className="seal" style={{ "--tone": "var(--frost)" } as React.CSSProperties}>
              <Icon name="GiFishingPole" />
            </span>
            <h3>{t("fishing.spot")}</h3>
            <p>{derived.canFish ? t("fishing.ready", { bait }) : t("fishing.needRod")}</p>
            <button
              className="btn small"
              disabled={
                busy || !derived.canFish || bait < 1 || hero.energy < 1 || Boolean(view.dungeon)
              }
              onClick={() => void dispatch({ type: "fish.cast" })}
            >
              {t("fishing.cast")} <span className="cost">⚡1</span>
            </button>
          </div>
          {places.map((place) => (
            <Link key={place.href} href={place.href} className="panel place">
              <span className="seal">
                <Icon name={place.icon} />
              </span>
              <h3>{place.title}</h3>
              <p>{place.text}</p>
            </Link>
          ))}
        </div>
        <Link href={`${base}/settings`} className="settings-link ui">
          <Icon name="GiCog" width={16} height={16} /> {t("nav.settings")} ·{" "}
          <span className="faint">{t("camp.settingsText")}</span>
        </Link>
      </section>

      {derived.alchemistLevel > 0 && (
        <section className="stack">
          <div className="spread">
            <h2 className="label" style={{ flex: 1 }}>
              {t("camp.alchemy")}
            </h2>
            <span className="chip frost">{t("camp.fishOwned", { count: fishCount })}</span>
          </div>
          <div className="panel list">
            {RECIPES.filter((r) => r.level <= derived.alchemistLevel).map((recipe) => {
              const item = content.items.get(recipe.id)!;
              return (
                <div key={recipe.id} className="list-row wrap">
                  <span className="medallion" style={{ "--size": "40px" } as React.CSSProperties}>
                    <Icon name={item.icon} />
                  </span>
                  <span className="stack" style={{ gap: 2, minWidth: 0 }}>
                    <span className="title">{tx(item.name, locale)}</span>
                    <span className="sub ui" style={{ fontSize: "0.78rem" }}>
                      {t(recipe.rareFish ? "camp.recipeRare" : "camp.recipe", {
                        fish: recipe.fish,
                        shards: recipe.shards,
                      })}
                    </span>
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
        <div className="panel list">
          {[...content.buildings.values()].map((building) => {
            const level = hero.buildings[building.id];
            const next = building.levels[level + 1];
            return (
              <div key={building.id} className="list-row wrap">
                <span className="seal">
                  <Icon name={building.icon} />
                </span>
                <span className="stack" style={{ gap: 4, minWidth: 0 }}>
                  <span className="row" style={{ gap: 10 }}>
                    <span className="title">{tx(building.name, locale)}</span>
                    <span
                      className="pips"
                      role="img"
                      aria-label={t("camp.buildingLevel", {
                        level: level + 1,
                        max: building.levels.length,
                      })}
                    >
                      {building.levels.map((_, i) => (
                        <i key={i} className={i <= level ? "on" : ""} />
                      ))}
                    </span>
                  </span>
                  <span className="sub">{tx(building.text, locale)}</span>
                </span>
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
