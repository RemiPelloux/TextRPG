"""Experience and level-up rules.

Going from level N to N+1 costs `EXP_PER_LEVEL * N` exp (100, 200, 300, ...), up to MAX_LEVEL.
Each level-up grants fixed health/energy plus random attribute gains; a luck roll can add a
bonus on top of every attribute.
"""

from __future__ import annotations

import random
from dataclasses import dataclass

from textrpg.domain.character import Character

MAX_LEVEL = 20
EXP_PER_LEVEL = 100

HEALTH_PER_LEVEL = 5
ENERGY_PER_LEVEL = 2
ATTRIBUTE_GAIN = (1, 3)
LUCK_GAIN = (-1, 5)
LUCKY_BONUS = (1, 2)


@dataclass(frozen=True)
class LevelUp:
    level: int
    gains: dict[str, int]
    lucky: bool


def exp_to_next_level(level: int) -> int | None:
    """Exp needed to leave `level`, or None at the level cap."""
    if level >= MAX_LEVEL:
        return None
    return EXP_PER_LEVEL * level


def roll_gains(luck: int, rng: random.Random) -> tuple[dict[str, int], bool]:
    gains = {
        "max_health": HEALTH_PER_LEVEL,
        "max_energy": ENERGY_PER_LEVEL,
        "strength": rng.randint(*ATTRIBUTE_GAIN),
        "defense": rng.randint(*ATTRIBUTE_GAIN),
        "speed": rng.randint(*ATTRIBUTE_GAIN),
        "luck": rng.randint(*LUCK_GAIN),
    }
    # `luck` is a percentage chance of a bonus on every attribute.
    lucky = rng.randint(1, 100) <= luck
    if lucky:
        bonus = rng.randint(*LUCKY_BONUS)
        for attribute in ("strength", "defense", "speed", "luck"):
            gains[attribute] += bonus
    return gains, lucky


def _apply(character: Character, gains: dict[str, int]) -> None:
    stats = character.stats
    for attribute, amount in gains.items():
        setattr(stats, attribute, getattr(stats, attribute) + amount)
    # Leveling up also refills what was gained.
    stats.health += gains["max_health"]
    stats.energy += gains["max_energy"]


def grant_exp(character: Character, amount: int, rng: random.Random) -> list[LevelUp]:
    """Add exp and apply every level-up it triggers (possibly several at once)."""
    if amount < 0:
        raise ValueError("exp amount must be positive")
    character.exp += amount
    level_ups: list[LevelUp] = []
    while (needed := exp_to_next_level(character.level)) is not None and character.exp >= needed:
        character.exp -= needed
        character.level += 1
        gains, lucky = roll_gains(character.stats.luck, rng)
        _apply(character, gains)
        level_ups.append(LevelUp(character.level, gains, lucky))
    if character.level >= MAX_LEVEL:
        character.exp = 0
    return level_ups
