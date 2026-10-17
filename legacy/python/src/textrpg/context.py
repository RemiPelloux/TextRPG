"""Everything a screen needs to run, bundled so it can be passed around (and faked in tests)."""

from __future__ import annotations

import random
from dataclasses import dataclass

from textrpg.content.loader import Catalog
from textrpg.domain.character import Character
from textrpg.persistence.save_manager import SaveManager
from textrpg.ui.console import Console


@dataclass
class GameContext:
    console: Console
    catalog: Catalog
    rng: random.Random
    saves: SaveManager
    character: Character | None = None

    @property
    def player(self) -> Character:
        if self.character is None:
            raise RuntimeError("no character loaded")
        return self.character
