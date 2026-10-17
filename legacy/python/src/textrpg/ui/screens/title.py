"""Title screen: load an existing game or create a new character."""

from __future__ import annotations

from textrpg import __version__
from textrpg.context import GameContext
from textrpg.domain.character import Character
from textrpg.persistence import SaveFormatError
from textrpg.systems.character_factory import create_character
from textrpg.systems.names import generate_name
from textrpg.ui.render import banner, format_character_sheet

INTRO = """
This is a text RPG.
This is mysterious.
This is dangerous.
"""

MAX_NAME_LENGTH = 20


def new_game(ctx: GameContext) -> Character:
    console = ctx.console
    console.clear()
    console.write(banner("New adventure"))
    suggestion = generate_name(ctx.rng)
    name = console.prompt(f"What is your name, hero? [{suggestion}] ") or suggestion
    name = name[:MAX_NAME_LENGTH]
    character = create_character(name, ctx.catalog, ctx.rng)
    ctx.saves.save(character)
    console.write(INTRO)
    console.write(format_character_sheet(character, ctx.catalog))
    console.pause()
    return character


def title_screen(ctx: GameContext) -> Character | None:
    """Return the character to play with, or None if the player chose to quit."""
    console = ctx.console
    console.clear()
    console.write(banner(f"TextRPG v{__version__}"))
    if not ctx.saves.exists():
        return new_game(ctx)

    while True:
        choice = console.choose(["Continue", "New game", "Quit"], title="A saved game was found.")
        if choice == 0:
            try:
                character = ctx.saves.load()
            except SaveFormatError as exc:
                console.write(f"Could not load the save: {exc}")
                continue
            console.write(f"Welcome back, {character.name}! You are level {character.level}.")
            console.pause()
            return character
        if choice == 1:
            if console.confirm("Starting a new game will erase your current save. Continue?"):
                return new_game(ctx)
            continue
        return None
