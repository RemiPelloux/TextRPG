"""Generate random enemies scaled by the player's level and the chosen difficulty."""

from __future__ import annotations

import random

from textrpg.content.loader import Catalog
from textrpg.domain.enemy import Difficulty, Enemy
from textrpg.domain.stats import Stats
from textrpg.systems.names import generate_name


def generate_enemy(
    level: int, difficulty: Difficulty, catalog: Catalog, rng: random.Random
) -> Enemy:
    if level < 1:
        raise ValueError("level must be >= 1")
    kinds = catalog.enemy_kinds
    kind = rng.choices(kinds, weights=[k.weight for k in kinds])[0]
    tier = catalog.difficulties[difficulty]

    health = level * rng.randint(*tier.health_factor) * rng.randint(9, 15)
    stat_factor = rng.randint(*tier.stat_factor)

    def attribute() -> int:
        return stat_factor + rng.randint(1, 3) * (level // 3) * stat_factor

    stats = Stats(
        max_health=health,
        health=health,
        max_energy=(energy := rng.randint(10, 20) + level // 2 * 3),
        energy=energy,
        strength=attribute(),
        defense=attribute(),
        speed=attribute(),
        luck=attribute(),
    )
    return Enemy(
        name=f"{generate_name(rng)} the {kind.name}",
        kind=kind.id,
        level=level,
        difficulty=difficulty,
        stats=stats,
    )
