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
      <div className="title-card">
        <header className="cover">
          <span className="publisher">{t("title.publisher")}</span>
          <h1 className="logo">TextRPG</h1>
          <p className="subtitle">{t("title.subtitle")}</p>
          <Icon name="GiCrossedSwords" className="woodcut" aria-hidden />
          <span className="fleuron" aria-hidden>
            ❦
          </span>
          <p className="motto" aria-label={t("title.motto")}>
            <span>{t("title.motto1")}</span>
            <span>{t("title.motto2")}</span>
            <span>{t("title.motto3")}</span>
          </p>
        </header>

        {heroes.length > 0 && (
          <section className="panel ornate stack" aria-labelledby="continue">
            <h2 id="continue" className="label">
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
          <section className="panel stack ex-libris" aria-labelledby="new-hero">
            <h2 id="new-hero" className="label">
              {heroes.length ? t("title.newHero") : t("title.exlibris")}
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
