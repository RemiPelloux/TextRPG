"use client";

import type { Reel } from "@textrpg/engine";
import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useGame } from "@/lib/game";
import { useI18n } from "@/lib/i18n-client";
import { sfx } from "@/lib/sfx";
import { content, rarityClass, tx } from "@/lib/text";

/** The line is in the water: read the fish and answer with the right move. */
export function FishingOverlay() {
  const { t, locale } = useI18n();
  const { view, dispatch, busy, subscribe } = useGame();
  const [catchId, setCatchId] = useState<string | null>(null);
  const [escaped, setEscaped] = useState(false);
  const [slip, setSlip] = useState(0);

  useEffect(
    () =>
      subscribe((batch) => {
        for (const event of batch.events) {
          if (event.type === "fishCaught") {
            setCatchId(event.fishId);
            sfx.loot(content.fish.find((f) => f.id === event.fishId)?.rarity ?? "common");
          }
          if (event.type === "fishEscaped") setEscaped(true);
          if (event.type === "fishSlip") setSlip((n) => n + 1);
          if (event.type === "fishBite") sfx.splash();
        }
      }),
    [subscribe],
  );

  const fishing = view.fishing;
  const caught = catchId ? content.fish.find((f) => f.id === catchId) : undefined;
  const open = Boolean(fishing || caught || escaped);
  const close = () => {
    setCatchId(null);
    setEscaped(false);
  };
  const reel = (move: Reel) => {
    sfx.click();
    void dispatch({ type: "fish.reel", move });
  };
  const bait = view.hero.bag.find((i) => i.baseId === "fish_bait")?.quantity ?? 0;

  return (
    <Sheet open={open} onClose={fishing ? () => {} : close} label={t("fishing.title")}>
      <div className="stack" style={{ gap: 14 }}>
        <h2>{t("fishing.title")}</h2>
        {fishing && (
          <>
            <div className={`water ${fishing.hint === "slack" ? "wild" : ""}`} key={slip}>
              <span className="ripple" />
              <span className="ripple" />
              <span className="ripple" />
            </div>
            <p className="display" style={{ fontSize: "1rem", textAlign: "center" }} aria-live="polite">
              {t(`fishing.hint.${fishing.hint}`)}
            </p>
            <div className="spread label">
              <span>{t("fishing.round", { round: fishing.round + 1, rounds: fishing.rounds })}</span>
              {fishing.slips > 0 && <span className="delta-down">{t("fishing.slips", { slips: fishing.slips })}</span>}
            </div>
            <div className="grid-cards" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              {(["pull", "steady", "slack"] as Reel[]).map((move) => (
                <button key={move} className="btn" disabled={busy} onClick={() => reel(move)}>
                  {t(`fishing.move.${move}`)}
                </button>
              ))}
            </div>
            <p className="faint ui" style={{ fontSize: "0.75rem" }}>
              {t("fishing.help")}
            </p>
          </>
        )}
        {!fishing && caught && (
          <div className={`stack ${rarityClass(caught.rarity)}`} style={{ alignItems: "center", textAlign: "center" }}>
            <span className={`medallion ${rarityClass(caught.rarity)}`} style={{ "--size": "80px" } as React.CSSProperties}>
              <Icon name={caught.icon} />
            </span>
            <h3 className="r-text">{tx(caught.name, locale)}</h3>
            <p className="flavor">« {tx(caught.lore, locale)} »</p>
          </div>
        )}
        {!fishing && escaped && !caught && <p className="dim">{t("fishing.escaped")}</p>}
        {!fishing && (
          <div className="row">
            <button
              className="btn primary"
              disabled={busy || bait <= 0 || view.hero.energy < 1}
              onClick={() => {
                close();
                void dispatch({ type: "fish.cast" });
              }}
            >
              {t("fishing.again")} <span className="cost">⚡1 · {t("fishing.bait", { count: bait })}</span>
            </button>
            <button className="btn ghost" onClick={close}>
              {t("common.close")}
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
