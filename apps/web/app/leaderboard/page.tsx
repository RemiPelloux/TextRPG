import { dailyLeaderboard, deepestHeroes, getDb, listHeroes, topHeroes } from "@textrpg/db";
import { boardCache } from "@textrpg/server";
import { dayIndex } from "@textrpg/engine";
import type { Metadata } from "next";
import Link from "next/link";

import { translator } from "@/lib/i18n";
import { currentLocale, currentSession } from "@/lib/session";
import { content, tx } from "@/lib/text";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Leaderboard" };

export default async function Leaderboard({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  const { board = "power" } = await searchParams;
  const locale = await currentLocale();
  const t = translator(locale);
  const db = getDb();
  const session = await currentSession();
  const mine = new Set(session ? (await listHeroes(db, session.userId)).map((h) => h.id) : []);
  const today = dayIndex(Date.now(), 0);
  const className = (id: string | null) =>
    id ? tx(content.classes.get(id as never)?.name, locale) : "—";

  const tabs = [
    { id: "power", label: t("leaderboard.power") },
    { id: "depth", label: t("leaderboard.depth") },
    { id: "daily", label: t("leaderboard.daily") },
  ];

  let table;
  if (board === "depth") {
    const rows = await boardCache.get("depth", () => deepestHeroes(db));
    table = (
      <table className="board">
        <thead>
          <tr>
            <th>#</th>
            <th>{t("leaderboard.hero")}</th>
            <th>{t("leaderboard.class")}</th>
            <th className="num">{t("leaderboard.floor")}</th>
            <th className="num">{t("leaderboard.level")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className={mine.has(r.id) ? "me" : ""}>
              <td className="num">{i + 1}</td>
              <td>{r.name}</td>
              <td>{className(r.classId)}</td>
              <td className="num">{r.deepestFloor}</td>
              <td className="num">{r.level}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  } else if (board === "daily") {
    const rows = await boardCache.get(`daily:${today}`, () => dailyLeaderboard(db, today));
    table = (
      <table className="board">
        <thead>
          <tr>
            <th>#</th>
            <th>{t("leaderboard.hero")}</th>
            <th className="num">{t("leaderboard.score")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.heroId} className={mine.has(r.heroId) ? "me" : ""}>
              <td className="num">{i + 1}</td>
              <td>{r.heroName}</td>
              <td className="num">{r.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  } else {
    const rows = await boardCache.get("power", () => topHeroes(db));
    table = (
      <table className="board">
        <thead>
          <tr>
            <th>#</th>
            <th>{t("leaderboard.hero")}</th>
            <th>{t("leaderboard.class")}</th>
            <th className="num">{t("leaderboard.level")}</th>
            <th className="num">{t("leaderboard.powerCol")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className={mine.has(r.id) ? "me" : ""}>
              <td className="num">{i + 1}</td>
              <td>{r.name}</td>
              <td>{className(r.classId)}</td>
              <td className="num">
                {r.level}
                {r.paragon ? ` · P${r.paragon}` : ""}
              </td>
              <td className="num">{r.power}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className="solo frame">
      <div className="page">
        <Link href="/" className="back ui">
          ← TextRPG
        </Link>
        <div className="page-head">
          <span className="label">{t("leaderboard.eyebrow")}</span>
          <h1>{t("leaderboard.title")}</h1>
        </div>
        <nav className="tabs">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={`/leaderboard?board=${tab.id}`}
              className="tab"
              aria-selected={board === tab.id}
              style={{ textDecoration: "none" }}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        <section className="panel">
          <div className="table-wrap">{table}</div>
        </section>
        <p className="faint ui" style={{ fontSize: "0.75rem" }}>
          {board === "daily" ? t("leaderboard.dailyHint") : t("leaderboard.hint")}
        </p>
      </div>
    </div>
  );
}
