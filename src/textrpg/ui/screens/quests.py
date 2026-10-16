"""Quest log and quest board."""

from __future__ import annotations

from textrpg.context import GameContext
from textrpg.systems import quests
from textrpg.ui.render import banner, format_level_up, format_quest


def quests_screen(ctx: GameContext) -> None:
    console, player = ctx.console, ctx.player
    while True:
        console.clear()
        console.write(banner("Quests"))
        if player.quests:
            for quest in player.quests:
                console.write(f"  - {format_quest(quest)}")
        else:
            console.write("  No active quest.")
        console.write(f"\n  {len(player.quests)}/{quests.MAX_ACTIVE_QUESTS} active quests\n")

        completed = [q for q in player.quests if q.is_complete]
        options = ["Visit the quest board"]
        options += [f"Claim reward: {q.title}" for q in completed]
        options.append("Back")
        choice = console.choose(options)

        if choice == len(options) - 1:
            return
        if choice == 0:
            _quest_board(ctx)
        else:
            quest = completed[choice - 1]
            level_ups = quests.claim_reward(player, quest, ctx.catalog, ctx.rng)
            console.write(f"Quest complete: {quest.title}!")
            for level_up in level_ups:
                console.write(format_level_up(level_up))
            console.pause()


def _quest_board(ctx: GameContext) -> None:
    console, player = ctx.console, ctx.player
    offer = quests.offer_quest(player, ctx.catalog, ctx.rng)
    if offer is None:
        console.write("No quest available for you right now.")
        console.pause()
        return
    console.write(f"\nA notice reads: {format_quest(offer)}")
    if console.confirm("Accept this quest?"):
        quests.accept_quest(player, offer)
        console.write("Quest accepted.")
        console.pause()
