"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { Bar } from "@/components/ui/Bar";
import { Icon } from "@/components/ui/Icon";
import { useGame } from "@/lib/game";
import { useI18n } from "@/lib/i18n-client";
import { sfx } from "@/lib/sfx";
import { content, rarityClass, tx } from "@/lib/text";

import { CombatOverlay } from "./CombatOverlay";
import { FishingOverlay } from "./FishingOverlay";

interface NavItem {
  href: string;
  icon: string;
  label: string;
  badge?: number;
  mobile: boolean;
}

function useNav(): NavItem[] {
  const { t } = useI18n();
  const { heroId, view } = useGame();
  const base = `/play/${heroId}`;
  const ready = view.quests.filter((q) => q.progress >= q.goal).length;
  const unknown = view.hero.bag.filter((i) => !i.identified).length;
  return [
    { href: `${base}`, icon: "GiCampfire", label: t("nav.camp"), badge: view.derived.canRest ? 1 : 0, mobile: true },
    { href: `${base}/hunt`, icon: "GiCrossedSwords", label: t("nav.hunt"), mobile: true },
    { href: `${base}/depths`, icon: "GiCaveEntrance", label: t("nav.depths"), mobile: true },
    { href: `${base}/hero`, icon: "GiVisoredHelm", label: t("nav.hero"), badge: view.derived.talentPoints + view.derived.paragonPoints + (view.hero.level >= 5 && !view.hero.classId ? 1 : 0), mobile: true },
    { href: `${base}/bag`, icon: "GiKnapsack", label: t("nav.bag"), badge: unknown, mobile: true },
    { href: `${base}/quests`, icon: "GiScrollQuill", label: t("nav.quests"), badge: ready, mobile: true },
    { href: `${base}/market`, icon: "GiTwoCoins", label: t("nav.market"), mobile: false },
    { href: `${base}/forge`, icon: "GiAnvil", label: t("nav.forge"), mobile: false },
    { href: `${base}/codex`, icon: "GiSpellBook", label: t("nav.codex"), mobile: false },
    { href: `/leaderboard`, icon: "GiLaurelsTrophy", label: t("nav.leaderboard"), mobile: false },
    { href: `${base}/settings`, icon: "GiCog", label: t("nav.settings"), mobile: false },
  ];
}

function NavLinks({ items, className }: { items: NavItem[]; className: string }) {
  const pathname = usePathname();
  return (
    <nav className={className} aria-label="Navigation">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className="navlink" aria-current={pathname === item.href ? "page" : undefined} onClick={() => sfx.click()}>
          <Icon name={item.icon} />
          <span>{item.label}</span>
          {item.badge ? <span className="badge num">{item.badge}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

function TopBar() {
  const { t } = useI18n();
  const { view, heroId } = useGame();
  const { hero, stats, derived } = view;
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href={`/play/${heroId}/hero`} className="stack" style={{ gap: 0, textDecoration: "none", color: "inherit" }}>
          <span className="display" style={{ fontSize: "0.95rem" }}>
            {hero.name}
          </span>
          <span className="label">
            {t("common.level", { level: hero.level })}
            {hero.paragon ? ` · P${hero.paragon}` : ""}
          </span>
        </Link>
        <div className="vitals">
          <div className="vital">
            <Icon name="GiHearts" style={{ color: "var(--blood-text)" }} width={16} height={16} />
            <Bar value={hero.health} max={stats.maxHealth} label={t("common.health")} text={`${hero.health}/${stats.maxHealth}`} />
          </div>
          <div className="vital">
            <Icon name="GiLightningTrio" style={{ color: "var(--mana-text)" }} width={16} height={16} />
            <Bar value={hero.energy} max={stats.maxEnergy} kind="energy" label={t("common.energy")} text={`${hero.energy}/${stats.maxEnergy}`} />
          </div>
          <div className="spread">
            <Bar value={hero.exp} max={derived.expToNext} kind="exp" label={t("common.exp")} />
            <span className="purse">
              <span className="r-text r-rare">{hero.gold} ◉</span>
              <span className="r-text r-magic">{hero.shards} ◆</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function LogColumn() {
  const { t } = useI18n();
  const { chronicle } = useGame();
  return (
    <aside className="log-col panel flat" aria-label={t("chronicle.title")}>
      <span className="label">{t("chronicle.title")}</span>
      <div className="chronicle" style={{ maxHeight: "70dvh" }}>
        {chronicle.length === 0 && <p className="line sys">{t("chronicle.empty")}</p>}
        {chronicle.map((line) => (
          <p key={line.id} className={`line ${line.tone} ${line.rarity ? rarityClass(line.rarity as never) : ""}`}>
            {line.text}
          </p>
        ))}
      </div>
    </aside>
  );
}

function Celebrations() {
  const { t, locale } = useI18n();
  const { celebrations, dismissCelebration, sceneOpen } = useGame();
  const current = celebrations[0];
  useEffect(() => {
    if (current && !sceneOpen && (current.kind === "levelUp" || current.kind === "paragon")) sfx.levelUp();
  }, [current, sceneOpen]);
  if (!current || sceneOpen) return null;
  let body: ReactNode;
  if (current.kind === "levelUp") {
    body = (
      <>
        <span className="label">{t("celebrate.levelUp")}</span>
        <div className="big">{t("common.level", { level: current.level })}</div>
        <div className="row ui" style={{ justifyContent: "center", gap: 14 }}>
          {Object.entries(current.gains).map(([stat, value]) => (
            <span key={stat} className={value >= 0 ? "delta-up" : "delta-down"}>
              {value >= 0 ? "+" : ""}
              {value} {t(`stats.${stat}`)}
            </span>
          ))}
        </div>
        <p className="dim">{t("celebrate.refilled")}</p>
      </>
    );
  } else if (current.kind === "paragon") {
    body = (
      <>
        <span className="label">{t("celebrate.paragon")}</span>
        <div className="big">P{current.paragon}</div>
        <p className="dim">{t("celebrate.paragonHint")}</p>
      </>
    );
  } else if (current.kind === "class") {
    body = (
      <>
        <div className="big">{t("celebrate.class")}</div>
        <p className="dim">{t("celebrate.classHint")}</p>
      </>
    );
  } else {
    const quest = content.quests.get(current.templateId);
    if (!quest?.outro) {
      dismissCelebration();
      return null;
    }
    body = (
      <>
        <span className="label">{tx(content.npcs.get(quest.giver)?.name, locale)}</span>
        <h2 className="r-text r-rare">{tx(quest.title, locale)}</h2>
        <p className="quote" style={{ textAlign: "left", maxWidth: 520 }}>
          {tx(quest.outro, locale)}
        </p>
      </>
    );
  }
  return (
    <div className="celebrate" role="dialog" aria-modal="true" onClick={dismissCelebration}>
      <div className="stack" style={{ gap: 14, alignItems: "center" }}>
        {body}
        <button className="btn primary" onClick={dismissCelebration} autoFocus>
          {t("common.continue")}
        </button>
      </div>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { online, view } = useGame();
  const items = useNav();
  return (
    <div className="shell">
      <TopBar />
      <div className="main">
        <div className="side">
          <NavLinks items={items} className="sidenav" />
          {view.derived.bloodMoon && <div className="chip blood">{t("camp.bloodMoon")}</div>}
        </div>
        <main className="page">{children}</main>
        <LogColumn />
      </div>
      <NavLinks items={items.filter((i) => i.mobile)} className="bottomnav" />
      {!online && <div className="offline-banner">{t("errors.offlineBanner")}</div>}
      <CombatOverlay />
      <FishingOverlay />
      <Celebrations />
    </div>
  );
}
