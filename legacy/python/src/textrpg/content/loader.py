"""Load the game content (items, enemies, quests) from the TOML files in `textrpg/data`."""

from __future__ import annotations

import tomllib
from dataclasses import dataclass
from functools import cache
from importlib import resources
from typing import Any

from textrpg.domain.enemy import Difficulty, EnemyKind
from textrpg.domain.item import ItemTemplate, ItemType
from textrpg.domain.quest import ObjectiveKind, QuestTemplate


class ContentError(ValueError):
    """Raised when a data file is malformed or references something unknown."""


@dataclass(frozen=True)
class DifficultyTier:
    difficulty: Difficulty
    label: str
    health_factor: tuple[int, int]
    stat_factor: tuple[int, int]


@dataclass(frozen=True)
class Catalog:
    items: dict[str, ItemTemplate]
    enemy_kinds: tuple[EnemyKind, ...]
    difficulties: dict[Difficulty, DifficultyTier]
    quests: dict[str, QuestTemplate]

    def item(self, item_id: str) -> ItemTemplate:
        try:
            return self.items[item_id]
        except KeyError:
            raise ContentError(f"unknown item id {item_id!r}") from None


def _range(value: Any, where: str) -> tuple[int, int]:
    low, high = value
    if low > high:
        raise ContentError(f"{where}: range [{low}, {high}] is inverted")
    return int(low), int(high)


def _read(name: str) -> dict[str, Any]:
    return tomllib.loads(resources.files("textrpg.data").joinpath(name).read_text("utf-8"))


def _parse_items(raw: dict[str, Any]) -> dict[str, ItemTemplate]:
    items: dict[str, ItemTemplate] = {}
    for entry in raw.get("item", []):
        item_id = entry["id"]
        if item_id in items:
            raise ContentError(f"duplicate item id {item_id!r}")
        items[item_id] = ItemTemplate(
            id=item_id,
            name=entry["name"],
            type=ItemType(entry["type"]),
            description=entry["description"],
            price=entry["price"],
            level=entry.get("level", 1),
            sellable=entry.get("sellable", True),
            stat_ranges={
                stat: _range(bounds, f"item {item_id}.{stat}")
                for stat, bounds in entry.get("stats", {}).items()
            },
            effect=dict(entry.get("effect", {})),
        )
    return items


def _parse_enemies(
    raw: dict[str, Any],
) -> tuple[tuple[EnemyKind, ...], dict[Difficulty, DifficultyTier]]:
    kinds = tuple(EnemyKind(k["id"], k["name"], k.get("weight", 1)) for k in raw["kind"])
    tiers = {}
    for key, tier in raw["difficulty"].items():
        difficulty = Difficulty(tier["level"])
        tiers[difficulty] = DifficultyTier(
            difficulty=difficulty,
            label=tier["label"],
            health_factor=_range(tier["health_factor"], f"difficulty {key}.health_factor"),
            stat_factor=_range(tier["stat_factor"], f"difficulty {key}.stat_factor"),
        )
    missing = set(Difficulty) - tiers.keys()
    if missing:
        raise ContentError(f"missing difficulty tiers: {sorted(d.name for d in missing)}")
    return kinds, tiers


def _parse_quests(raw: dict[str, Any]) -> dict[str, QuestTemplate]:
    return {
        q["id"]: QuestTemplate(
            id=q["id"],
            title=q["title"],
            kind=ObjectiveKind(q["kind"]),
            goal=q["goal"],
            target=q.get("target"),
            reward_exp=_range(q["reward_exp"], f"quest {q['id']}.reward_exp"),
            reward_money=_range(q["reward_money"], f"quest {q['id']}.reward_money"),
            reward_item=q.get("reward_item"),
        )
        for q in raw.get("quest", [])
    }


def _validate(catalog: Catalog) -> None:
    kind_ids = {k.id for k in catalog.enemy_kinds}
    for quest in catalog.quests.values():
        if quest.target is not None and quest.target not in kind_ids:
            raise ContentError(f"quest {quest.id}: unknown enemy kind {quest.target!r}")
        if quest.reward_item is not None:
            catalog.item(quest.reward_item)


@cache
def load_catalog() -> Catalog:
    kinds, tiers = _parse_enemies(_read("enemies.toml"))
    catalog = Catalog(
        items=_parse_items(_read("items.toml")),
        enemy_kinds=kinds,
        difficulties=tiers,
        quests=_parse_quests(_read("quests.toml")),
    )
    _validate(catalog)
    return catalog
