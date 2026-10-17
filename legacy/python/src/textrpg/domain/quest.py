"""Quests: templates from the content catalog and the active instances a player carries."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class ObjectiveKind(StrEnum):
    KILL = "kill"


@dataclass(frozen=True)
class QuestTemplate:
    id: str
    title: str
    kind: ObjectiveKind
    goal: int
    # Enemy kind to kill (e.g. "orc"); None means any enemy counts.
    target: str | None
    reward_exp: tuple[int, int]
    reward_money: tuple[int, int]
    reward_item: str | None = None


@dataclass
class Reward:
    exp: int = 0
    money: int = 0
    item_id: str | None = None


@dataclass
class Quest:
    template_id: str
    title: str
    kind: ObjectiveKind
    goal: int
    target: str | None
    reward: Reward
    progress: int = 0

    @property
    def is_complete(self) -> bool:
        return self.progress >= self.goal

    def advance(self, amount: int = 1) -> None:
        self.progress = min(self.goal, self.progress + amount)
