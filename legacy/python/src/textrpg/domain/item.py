"""Items: immutable templates from the content catalog, and rolled instances owned by players.

A template (e.g. "Sword") defines stat *ranges*; each time an item drops or is bought, a new
instance is rolled from it, so two swords can have different stats.
"""

from __future__ import annotations

import random
import uuid
from collections.abc import Mapping
from dataclasses import dataclass, field
from enum import StrEnum


class ItemType(StrEnum):
    WEAPON = "weapon"
    ARMOR = "armor"
    ACCESSORY = "accessory"
    POTION = "potion"
    QUEST = "quest"
    CONSUMABLE = "consumable"
    TOOL = "tool"


class Slot(StrEnum):
    WEAPON = "weapon"
    ARMOR = "armor"
    ACCESSORY = "accessory"
    TOOL = "tool"


_SLOT_BY_TYPE: dict[ItemType, Slot] = {
    ItemType.WEAPON: Slot.WEAPON,
    ItemType.ARMOR: Slot.ARMOR,
    ItemType.ACCESSORY: Slot.ACCESSORY,
    ItemType.TOOL: Slot.TOOL,
}

_STACKABLE_TYPES = frozenset({ItemType.POTION, ItemType.QUEST, ItemType.CONSUMABLE})


@dataclass(frozen=True)
class ItemTemplate:
    id: str
    name: str
    type: ItemType
    description: str
    price: int
    level: int = 1
    sellable: bool = True
    stat_ranges: Mapping[str, tuple[int, int]] = field(default_factory=dict)
    effect: Mapping[str, int] = field(default_factory=dict)

    @property
    def slot(self) -> Slot | None:
        return _SLOT_BY_TYPE.get(self.type)

    @property
    def equipable(self) -> bool:
        return self.slot is not None

    @property
    def stackable(self) -> bool:
        return self.type in _STACKABLE_TYPES

    def roll(self, rng: random.Random, quantity: int = 1) -> ItemInstance:
        bonuses = {stat: rng.randint(low, high) for stat, (low, high) in self.stat_ranges.items()}
        return ItemInstance(template_id=self.id, bonuses=bonuses, quantity=quantity)


def _new_uid() -> str:
    return uuid.uuid4().hex[:12]


@dataclass
class ItemInstance:
    template_id: str
    bonuses: dict[str, int] = field(default_factory=dict)
    quantity: int = 1
    upgrade_level: int = 0
    uid: str = field(default_factory=_new_uid)
