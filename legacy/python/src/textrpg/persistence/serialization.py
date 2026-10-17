"""Convert a Character to and from plain JSON-compatible dicts.

Bump SCHEMA_VERSION whenever the save format changes, and add a migration in `_MIGRATIONS`
so older saves keep loading.
"""

from __future__ import annotations

import datetime as dt
from collections.abc import Callable
from dataclasses import asdict
from typing import Any

from textrpg.domain.character import Character
from textrpg.domain.inventory import Inventory
from textrpg.domain.item import ItemInstance, Slot
from textrpg.domain.quest import ObjectiveKind, Quest, Reward
from textrpg.domain.stats import Stats

SCHEMA_VERSION = 1

# from_version -> function upgrading a save dict to from_version + 1
_MIGRATIONS: dict[int, Callable[[dict[str, Any]], dict[str, Any]]] = {}


class SaveFormatError(ValueError):
    """The save data is corrupt or from an unsupported version."""


def _item_to_dict(item: ItemInstance) -> dict[str, Any]:
    return asdict(item)


def _item_from_dict(data: dict[str, Any]) -> ItemInstance:
    return ItemInstance(**data)


def character_to_dict(character: Character) -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "name": character.name,
        "level": character.level,
        "exp": character.exp,
        "stats": asdict(character.stats),
        "inventory": {
            "money": character.inventory.money,
            "items": [_item_to_dict(i) for i in character.inventory.items],
        },
        "equipment": {slot.value: _item_to_dict(i) for slot, i in character.equipment.items()},
        "quests": [{**asdict(q), "kind": q.kind.value} for q in character.quests],
        "quests_completed": character.quests_completed,
        "monsters_killed": character.monsters_killed,
        "created_on": character.created_on.isoformat(),
        "last_rest_on": character.last_rest_on.isoformat() if character.last_rest_on else None,
    }


def _migrate(data: dict[str, Any]) -> dict[str, Any]:
    version = data.get("schema_version")
    if not isinstance(version, int):
        raise SaveFormatError("missing schema_version (save from TextRPG < 0.2 is not supported)")
    if version > SCHEMA_VERSION:
        raise SaveFormatError(f"save version {version} is newer than this game ({SCHEMA_VERSION})")
    while version < SCHEMA_VERSION:
        data = _MIGRATIONS[version](data)
        version += 1
    return data


def character_from_dict(data: dict[str, Any]) -> Character:
    data = _migrate(data)
    try:
        last_rest = data["last_rest_on"]
        return Character(
            name=data["name"],
            stats=Stats(**data["stats"]),
            level=data["level"],
            exp=data["exp"],
            inventory=Inventory(
                money=data["inventory"]["money"],
                items=[_item_from_dict(i) for i in data["inventory"]["items"]],
            ),
            equipment={Slot(s): _item_from_dict(i) for s, i in data["equipment"].items()},
            quests=[
                Quest(**{**q, "kind": ObjectiveKind(q["kind"]), "reward": Reward(**q["reward"])})
                for q in data["quests"]
            ],
            quests_completed=data["quests_completed"],
            monsters_killed=data["monsters_killed"],
            created_on=dt.date.fromisoformat(data["created_on"]),
            last_rest_on=dt.date.fromisoformat(last_rest) if last_rest else None,
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise SaveFormatError(f"corrupt save: {exc}") from exc
