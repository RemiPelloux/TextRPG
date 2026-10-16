"""End-to-end tests: drive the real game loop with scripted keyboard input."""

import io
import random

from textrpg.app import run
from textrpg.context import GameContext
from textrpg.persistence import SaveManager
from textrpg.ui.console import Console


def play(tmp_path, catalog, keys):
    """Run the game, typing `keys` one by one. Running out of keys acts like Ctrl+D."""
    script = iter(keys)
    output = io.StringIO()

    def keyboard(label):
        output.write(label)  # a real terminal echoes the prompt
        try:
            return next(script)
        except StopIteration:
            raise EOFError from None

    console = Console(input_fn=keyboard, output=output)
    ctx = GameContext(console, catalog, random.Random(0), SaveManager(tmp_path))
    run(ctx)
    return ctx, output.getvalue()


def test_new_game_then_quit_saves_the_character(tmp_path, catalog):
    _, out = play(tmp_path, catalog, ["Aria", "", "8", "y"])
    assert "Name    : Aria" in out
    assert SaveManager(tmp_path).load().name == "Aria"


def test_continue_loads_the_existing_save(tmp_path, catalog):
    play(tmp_path, catalog, ["Aria", "", "8", "y"])
    ctx, out = play(tmp_path, catalog, ["1", "", "3", "", "8", "y"])
    assert "Welcome back, Aria!" in out
    assert ctx.player.name == "Aria"


def test_invalid_choices_are_asked_again(tmp_path, catalog):
    _, out = play(tmp_path, catalog, ["Aria", "", "42", "banana", "8", "maybe", "y"])
    assert "Choose a number between 1 and 8." in out
    assert "Please answer y or n." in out


def test_declining_to_quit_returns_to_the_menu(tmp_path, catalog):
    _, out = play(tmp_path, catalog, ["Aria", "", "8", "n", "8", "y"])
    assert out.count("Are you sure you want to quit?") == 2


def test_accepting_a_quest_is_persisted(tmp_path, catalog):
    play(tmp_path, catalog, ["Aria", "", "6", "1", "y", "", "2", "8", "y"])
    assert len(SaveManager(tmp_path).load().quests) == 1


def test_eof_saves_and_exits(tmp_path, catalog):
    def eof(_label):
        raise EOFError

    console = Console(input_fn=eof, output=io.StringIO())
    saves = SaveManager(tmp_path)
    run(GameContext(console, catalog, random.Random(0), saves))
    assert not saves.exists()  # quit before a character existed: nothing to save


def test_running_out_of_input_still_saves(tmp_path, catalog):
    play(tmp_path, catalog, ["Aria", "", "6", "1", "y"])
    assert len(SaveManager(tmp_path).load().quests) == 1
