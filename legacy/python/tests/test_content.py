import random

from textrpg.domain.enemy import Difficulty
from textrpg.domain.item import ItemType, Slot


def test_catalog_loads_all_original_content(catalog):
    assert len(catalog.items) == 16
    assert {k.id for k in catalog.enemy_kinds} == {
        "orc",
        "goblin",
        "skeleton",
        "zombie",
        "demon",
        "dragon",
    }
    assert set(catalog.difficulties) == set(Difficulty)
    assert len(catalog.quests) == 2


def test_lookup_returns_the_requested_item_not_always_a_weapon(catalog):
    # Regression: the old `search_item` always searched the weapon list.
    assert catalog.item("leather_armor").type is ItemType.ARMOR
    assert catalog.item("leather_armor").slot is Slot.ARMOR


def test_each_copy_of_an_item_rolls_its_own_stats(catalog):
    # Regression: stats used to be rolled once at import, so every sword was identical.
    rng = random.Random(0)
    axe = catalog.item("damaged_warrior_axe")
    rolls = {axe.roll(rng).bonuses["strength"] for _ in range(50)}
    assert len(rolls) > 1
    assert all(3 <= r <= 7 for r in rolls)


def test_stackable_and_equipable_flags(catalog):
    assert catalog.item("potion").stackable
    assert not catalog.item("potion").equipable
    assert catalog.item("fishing_rod").slot is Slot.TOOL
