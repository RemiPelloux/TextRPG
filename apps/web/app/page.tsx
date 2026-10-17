import { getDb, listHeroes } from "@textrpg/db";
import Link from "next/link";

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
      <div className="embers" aria-hidden>
        {Array.from({ length: 16 }, (_, i) => (
          <i key={i} />
        ))}
      </div>
      <div className="title-card">
        <div className="stack" style={{ gap: 14, alignItems: "center" }}>
          <span className="seal big emblem" aria-hidden>
            <Icon name="GiSpellBook" />
          </span>
          <h1 className="logo">TextRPG</h1>
          <span className="flourish" aria-hidden />
          <p className="motto" aria-label={t("title.motto")}>
            <span>{t("title.motto1")}</span>
            <span>{t("title.motto2")}</span>
            <span>{t("title.motto3")}</span>
          </p>
        </div>

        {heroes.length > 0 && (
          <section className="panel ornate stack" aria-labelledby="continue">
            <h2 id="continue" className="label" style={{ fontSize: "0.7rem" }}>
              {t("title.continue")}
            </h2>
            {heroes.map((hero) => (
              <Link
                key={hero.id}
                href={`/play/${hero.id}`}
                className="btn block"
                style={{ justifyContent: "space-between" }}
              >
                <span>{hero.name}</span>
                <span className="cost">
                  {t("common.level", { level: hero.level })}
                  {hero.classId
                    ? ` · ${tx(content.classes.get(hero.classId as never)?.name, locale)}`
                    : ""}
                </span>
              </Link>
            ))}
          </section>
        )}

        {heroes.length < 3 && (
          <section className="panel stack" aria-labelledby="new-hero">
            <h2 id="new-hero" className="label" style={{ fontSize: "0.7rem" }}>
              {heroes.length ? t("title.newHero") : t("title.begin")}
            </h2>
            <NewHeroForm first={heroes.length === 0} />
          </section>
        )}

        <nav className="row" style={{ justifyContent: "center", gap: 18 }} aria-label="Menu">
          <Link href="/leaderboard">{t("nav.leaderboard")}</Link>
          <Link href="/account">
            {session && !session.guest ? t("account.mine") : t("account.signIn")}
          </Link>
          <LanguageSwitch />
        </nav>
        <p className="faint ui" style={{ fontSize: "0.7rem" }}>
          {t("title.footer")}
        </p>
      </div>
    </div>
  );
}
