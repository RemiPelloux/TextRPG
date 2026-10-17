"""The player character."""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field

from textrpg.domain.inventory import Inventory
from textrpg.domain.item import ItemInstance, Slot
from textrpg.domain.quest import Quest
from textrpg.domain.stats import Stats


@dataclass
class Character:
    name: str
    stats: Stats
    level: int = 1
    exp: int = 0
    inventory: Inventory = field(default_factory=Inventory)
    # One item per slot at most; empty slots are simply absent.
    equipment: dict[Slot, ItemInstance] = field(default_factory=dict)
    quests: list[Quest] = field(default_factory=list)
    quests_completed: int = 0
    monsters_killed: int = 0
    created_on: dt.date = field(default_factory=dt.date.today)
    last_rest_on: dt.date | None = None

    def effective(self, attribute: str) -> int:
        """Base attribute plus every bonus granted by equipped items."""
        base = getattr(self.stats, attribute)
        return base + sum(item.bonuses.get(attribute, 0) for item in self.equipment.values())
