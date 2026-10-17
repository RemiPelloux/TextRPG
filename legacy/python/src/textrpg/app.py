"""Entry point: wire the dependencies together and run the game loop."""

from __future__ import annotations

import argparse
import random
from pathlib import Path

from textrpg import __version__
from textrpg.content import load_catalog
from textrpg.context import GameContext
from textrpg.persistence import SaveManager
from textrpg.ui.console import Console, QuitRequested
from textrpg.ui.screens.main_menu import main_menu
from textrpg.ui.screens.title import title_screen


def run(ctx: GameContext) -> None:
    try:
        ctx.character = title_screen(ctx)
        if ctx.character is None:
            return
        main_menu(ctx)
    except QuitRequested:
        ctx.console.write("")
    finally:
        if ctx.character is not None:
            ctx.saves.save(ctx.character)
            ctx.console.write("Game saved. See you soon, adventurer!")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="textrpg", description="A choice-driven text RPG.")
    parser.add_argument("--save-dir", type=Path, help="where to store the save file")
    parser.add_argument("--seed", type=int, help="random seed, for reproducible runs")
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    args = parser.parse_args(argv)

    run(
        GameContext(
            console=Console(),
            catalog=load_catalog(),
            rng=random.Random(args.seed),
            saves=SaveManager(args.save_dir),
        )
    )
