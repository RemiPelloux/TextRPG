import { getDb, listHeroes } from "@textrpg/db";
import Link from "next/link";

import { TitleScene } from "@/components/art/Scenes";
import { Icon } from "@/components/ui/Icon";
import { translator } from "@/lib/i18n";
import { currentLocale, currentSession } from "@/lib/session";
import { content, tx } from "@/lib/text";

import { LanguageSwitch } from "./LanguageSwitch";
import { NewHeroForm } from "./NewHeroForm";

export const dynamic = "force-dynamic";

export default async function Title() {
  const locale = await currentLocale();
  const t = translator(locale);
  const session = await currentSession();
  const heroes = session ? await listHeroes(getDb(), session.userId) : [];

  return (
    <div className="title-screen">
      <TitleScene />
      <div className="title-top" />

      <header className="title-card">
        <div className="emblem" aria-hidden>
          <svg className="ring" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" strokeWidth="0.8" />
            <circle
              cx="100"
              cy="100"
              r="88"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.4"
              strokeDasharray="2 6"
            />
            <path d="M100 0 l5 10 l-5 10 l-5 -10 z" fill="currentColor" />
          </svg>
          <Icon name="GiSpellBook" className="book" />
        </div>
        <h1 className="logo">TextRPG</h1>
        <div className="ornament" aria-hidden>
          <i />
        </div>
        <p className="motto" aria-label={t("title.motto")}>
          <span>{t("title.motto1")}</span>
          <span>{t("title.motto2")}</span>
          <span>{t("title.motto3")}</span>
        </p>
      </header>

      <div className="title-bottom">
        {heroes.length > 0 && (
          <section className="panel ornate stack" aria-labelledby="continue">
            <h2 id="continue" className="panel-title">
              <Icon name="GiCrossedSwords" width={18} height={18} /> {t("title.continue")}
            </h2>
            {heroes.map((hero) => (
              <Link key={hero.id} href={`/play/${hero.id}`} className="btn block">
                <span>{hero.name}</span>
                <span className="cost">
                  {t("common.level", { level: hero.level })}
                  {hero.classId
                    ? ` · ${tx(content.classes.get(hero.classId as never)?.name, locale)}`
                    : ""}
                </span>
                <span className="chev" aria-hidden>
                  ›
                </span>
              </Link>
            ))}
          </section>
        )}

        {heroes.length < 3 && (
          <section className="panel ornate stack" aria-labelledby="new-hero">
            <h2 id="new-hero" className="panel-title">
              <Icon name="GiSun" width={18} height={18} />
              {heroes.length ? t("title.newHero") : t("title.begin")}
            </h2>
            <NewHeroForm first={heroes.length === 0} />
          </section>
        )}

        <nav className="icon-links" aria-label="Menu">
          <Link href="/leaderboard">
            <span className="seal">
              <Icon name="GiTrophyCup" />
            </span>
            {t("nav.leaderboard")}
          </Link>
          <Link href="/account">
            <span className="seal">
              <Icon name="GiPerson" />
            </span>
            {session && !session.guest ? t("account.mine") : t("account.signIn")}
          </Link>
          <LanguageSwitch variant="icon" />
        </nav>
        <p className="faint" style={{ fontSize: "0.8rem", textAlign: "center" }}>
          {t("title.footer")}
        </p>
      </div>
    </div>
  );
}
