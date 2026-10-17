"""Enemies the player can fight."""

from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum

from textrpg.domain.stats import Stats


class Difficulty(IntEnum):
    EASY = 1
    MEDIUM = 2
    HARD = 3
    HELL = 4


@dataclass(frozen=True)
class EnemyKind:
    id: str
    name: str
    weight: int = 1


@dataclass
class Enemy:
    name: str
    kind: str
    level: int
    difficulty: Difficulty
    stats: Stats
