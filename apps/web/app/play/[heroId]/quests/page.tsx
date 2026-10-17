"use client";

import { MAX_BOARD_QUESTS, type QuestInstance } from "@textrpg/engine";

import { Bar } from "@/components/ui/Bar";
import { Icon } from "@/components/ui/Icon";
import { useGame } from "@/lib/game";
import { useI18n } from "@/lib/i18n-client";
import { content, tx } from "@/lib/text";

function Reward({ quest }: { quest: QuestInstance }) {
  const { t, locale } = useI18n();
  const r = quest.reward;
  return (
    <div className="row ui num" style={{ gap: 10, fontSize: "0.78rem" }}>
      {r.exp > 0 && <span>+{r.exp} {t("common.exp")}</span>}
      {r.gold > 0 && <span className="r-text r-rare">+{r.gold} ◉</span>}
      {r.shards > 0 && <span className="r-text r-magic">+{r.shards} ◆</span>}
      {r.itemId && <span className="chip gold">{tx(content.items.get(r.itemId)?.name, locale)}</span>}
      {r.rarity && <span className={`chip r-text r-${r.rarity}`}>{t("quests.rewardRarity", { rarity: t(`rarity.${r.rarity}`) })}</span>}
    </div>
  );
}

function QuestCard({ quest, offer }: { quest: QuestInstance; offer?: boolean }) {
  const { t, locale } = useI18n();
  const { view, dispatch, busy } = useGame();
  const template = content.quests.get(quest.templateId)!;
  const giver = content.npcs.get(template.giver);
  const done = quest.progress >= quest.goal;
  const boardCount = view.quests.filter((q) => q.type === "board").length;
  return (
    <article className={`panel quest ${template.type === "story" ? "ornate" : ""}`}>
      <div className="spread">
        <span className="giver">
          {giver && <Icon name={giver.icon} width={14} height={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />}
          {tx(giver?.name, locale)} · {t(`quests.type.${template.type}`)}
        </span>
        {done && !offer && <span className="chip venom">{t("quests.ready")}</span>}
      </div>
      <h3>{tx(template.title, locale)}</h3>
      <p className="quote">{tx(template.text, locale)}</p>
      {!offer && (
        <div className="stack" style={{ gap: 4 }}>
          <Bar value={quest.progress} max={quest.goal} kind="exp" label={t("quests.progressLabel")} />
          <span className="label">{t("quests.progress", { progress: quest.progress, goal: quest.goal })}</span>
        </div>
      )}
      <Reward quest={quest} />
      <div className="row">
        {offer ? (
          <button className="btn primary small" disabled={busy || boardCount >= MAX_BOARD_QUESTS} onClick={() => void dispatch({ type: "quest.accept", uid: quest.uid })}>
            {t("quests.accept")}
          </button>
        ) : (
          <>
            <button className="btn primary small" disabled={busy || !done} onClick={() => void dispatch({ type: "quest.turnIn", uid: quest.uid })}>
              {t("quests.turnIn")}
            </button>
            {template.type !== "story" && (
              <button className="btn ghost small" disabled={busy} onClick={() => void dispatch({ type: "quest.abandon", uid: quest.uid })}>
                {t("quests.abandon")}
              </button>
            )}
          </>
        )}
      </div>
    </article>
  );
}

export default function Quests() {
  const { t, locale } = useI18n();
  const { view } = useGame();
  const story = view.quests.filter((q) => q.type === "story");
  const daily = view.quests.filter((q) => q.type === "daily");
  const board = view.quests.filter((q) => q.type === "board");
  const nextStory = view.story.nextId ? content.quests.get(view.story.nextId) : undefined;

  return (
    <>
      <div className="page-head">
        <span className="label">{t("quests.eyebrow")}</span>
        <h1>{t("quests.title")}</h1>
        <p className="dim">{t("quests.chapter", { chapter: view.story.chapter, total: [...content.quests.values()].filter((q) => q.type === "story").length })}</p>
      </div>

      <section className="stack">
        <h2 className="label">{t("quests.story")}</h2>
        {story.map((q) => (
          <QuestCard key={q.uid} quest={q} />
        ))}
        {story.length === 0 && nextStory && (
          <div className="panel stack">
            <h3>{tx(nextStory.title, locale)}</h3>
            <p className="dim">{t("quests.lockedLevel", { level: nextStory.minLevel })}</p>
          </div>
        )}
        {story.length === 0 && !nextStory && <p className="dim">{t("quests.actDone")}</p>}
      </section>

      <section className="stack">
        <h2 className="label">{t("quests.daily")}</h2>
        {daily.length === 0 && <p className="dim">{t("quests.dailyDone")}</p>}
        <div className="grid-cards">
          {daily.map((q) => (
            <QuestCard key={q.uid} quest={q} />
          ))}
        </div>
      </section>

      <section className="stack">
        <h2 className="label">
          {t("quests.active")} ({board.length}/{MAX_BOARD_QUESTS})
        </h2>
        <div className="grid-cards">
          {board.map((q) => (
            <QuestCard key={q.uid} quest={q} />
          ))}
        </div>
      </section>

      <section className="stack">
        <h2 className="label">{t("quests.board")}</h2>
        {view.board.offers.length === 0 && <p className="dim">{t("quests.boardEmpty")}</p>}
        <div className="grid-cards">
          {view.board.offers.map((q) => (
            <QuestCard key={q.uid} quest={q} offer />
          ))}
        </div>
      </section>
    </>
  );
}
