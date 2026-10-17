"""Main menu: the hub every action starts from."""

from __future__ import annotations

from collections.abc import Callable

from textrpg.context import GameContext
from textrpg.ui.render import banner
from textrpg.ui.screens.character import equipment_screen, inventory_screen, stats_screen
from textrpg.ui.screens.quests import quests_screen


def _coming_soon(feature: str, milestone: str) -> Callable[[GameContext], None]:
    def screen(ctx: GameContext) -> None:
        ctx.console.write(banner(feature))
        ctx.console.write(f"Not implemented yet - planned for {milestone} (docs/ROADMAP.md).")
        ctx.console.pause()

    return screen


MENU: list[tuple[str, Callable[[GameContext], None]]] = [
    ("Train", _coming_soon("Train", "v0.3 'First Blood'")),
    ("Dungeon", _coming_soon("Dungeon", "v0.5 'Into the Depths'")),
    ("Stats", stats_screen),
    ("Inventory", inventory_screen),
    ("Equipment", equipment_screen),
    ("Quests", quests_screen),
    ("Shop", _coming_soon("Shop", "v0.4 'Loot & Gold'")),
]


def main_menu(ctx: GameContext) -> None:
    """Loop until the player confirms they want to quit. Saves after every action."""
    console = ctx.console
    labels = [label for label, _ in MENU] + ["Quit"]
    while True:
        console.clear()
        console.write(banner(f"{ctx.player.name} - level {ctx.player.level}"))
        choice = console.choose(labels)
        if choice == len(MENU):
            if console.confirm("Are you sure you want to quit?"):
                return
            continue
        console.clear()
        MENU[choice][1](ctx)
        ctx.saves.save(ctx.player)
