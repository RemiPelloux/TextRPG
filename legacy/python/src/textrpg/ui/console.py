"""Terminal input/output. Every screen talks to the player through a Console, so tests can
drive the game with scripted input instead of a real keyboard."""

from __future__ import annotations

import sys
from collections.abc import Callable, Sequence
from typing import TextIO


class QuitRequested(Exception):
    """The player closed the input stream (Ctrl+D / Ctrl+C)."""


class Console:
    def __init__(
        self,
        input_fn: Callable[[str], str] = input,
        output: TextIO | None = None,
        *,
        clear_screen: bool = True,
    ) -> None:
        self._input = input_fn
        self._out = output or sys.stdout
        self._clear_screen = clear_screen

    def write(self, text: str = "") -> None:
        print(text, file=self._out)

    def clear(self) -> None:
        if self._clear_screen and self._out.isatty():
            # ANSI "clear screen + move cursor home"; works on Linux, macOS and Windows 10+.
            self._out.write("\033[2J\033[H")
            self._out.flush()

    def prompt(self, label: str = "> ") -> str:
        try:
            return self._input(label).strip()
        except (EOFError, KeyboardInterrupt):
            raise QuitRequested from None

    def pause(self, message: str = "Press Enter to continue...") -> None:
        self.prompt(f"\n{message}")

    def confirm(self, question: str) -> bool:
        while True:
            answer = self.prompt(f"{question} (y/n) ").lower()
            if answer in ("y", "yes"):
                return True
            if answer in ("n", "no"):
                return False
            self.write("Please answer y or n.")

    def choose(self, options: Sequence[str], title: str | None = None) -> int:
        """Show a numbered menu and return the 0-based index of the chosen option."""
        if title:
            self.write(title)
        for number, option in enumerate(options, start=1):
            self.write(f"  {number}. {option}")
        while True:
            answer = self.prompt(">| ")
            if answer.isdigit() and 1 <= int(answer) <= len(options):
                return int(answer) - 1
            self.write(f"Choose a number between 1 and {len(options)}.")
