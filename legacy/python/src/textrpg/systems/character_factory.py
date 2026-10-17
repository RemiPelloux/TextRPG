"""Create a brand-new player character."""

from __future__ import annotations

import random

from textrpg.content.loader import Catalog
from textrpg.domain.character import Character
from textrpg.domain.inventory import Inventory
from textrpg.domain.stats import Stats

STARTING_MONEY = 1
STARTER_WEAPON = "sword"


def create_character(name: str, catalog: Catalog, rng: random.Random) -> Character:
    stats = Stats(
        strength=rng.randint(1, 3),
        defense=rng.randint(1, 3),
        speed=rng.randint(1, 3),
        luck=rng.randint(-1, 3),
    )
    weapon = catalog.item(STARTER_WEAPON)
    character = Character(name=name, stats=stats, inventory=Inventory(money=STARTING_MONEY))
    character.equipment[weapon.slot] = weapon.roll(rng)
    return character
