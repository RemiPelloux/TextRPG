"""Quest board rules: accepting quests, tracking progress, claiming rewards."""

from __future__ import annotations

import random

from textrpg.content.loader import Catalog
from textrpg.domain.character import Character
from textrpg.domain.quest import ObjectiveKind, Quest, QuestTemplate, Reward
from textrpg.systems.leveling import LevelUp, grant_exp

MAX_ACTIVE_QUESTS = 3


def create_quest(template: QuestTemplate, rng: random.Random) -> Quest:
    return Quest(
        template_id=template.id,
        title=template.title,
        kind=template.kind,
        goal=template.goal,
        target=template.target,
        reward=Reward(
            exp=rng.randint(*template.reward_exp),
            money=rng.randint(*template.reward_money),
            item_id=template.reward_item,
        ),
    )


def offer_quest(character: Character, catalog: Catalog, rng: random.Random) -> Quest | None:
    """Pick a random quest the character doesn't already have. None if the log is full."""
    if len(character.quests) >= MAX_ACTIVE_QUESTS:
        return None
    active = {q.template_id for q in character.quests}
    available = [t for t in catalog.quests.values() if t.id not in active]
    if not available:
        return None
    return create_quest(rng.choice(available), rng)


def accept_quest(character: Character, quest: Quest) -> None:
    if len(character.quests) >= MAX_ACTIVE_QUESTS:
        raise ValueError("quest log is full")
    character.quests.append(quest)


def record_kill(character: Character, enemy_kind: str) -> list[Quest]:
    """Count a kill toward matching quests. Returns quests that just became complete."""
    character.monsters_killed += 1
    newly_complete = []
    for quest in character.quests:
        if quest.kind is not ObjectiveKind.KILL or quest.is_complete:
            continue
        if quest.target in (None, enemy_kind):
            quest.advance()
            if quest.is_complete:
                newly_complete.append(quest)
    return newly_complete


def claim_reward(
    character: Character, quest: Quest, catalog: Catalog, rng: random.Random
) -> list[LevelUp]:
    if not quest.is_complete:
        raise ValueError(f"quest {quest.title!r} is not complete")
    character.quests.remove(quest)
    character.quests_completed += 1
    character.inventory.money += quest.reward.money
    if quest.reward.item_id:
        template = catalog.item(quest.reward.item_id)
        character.inventory.add(template.roll(rng), stackable=template.stackable)
    return grant_exp(character, quest.reward.exp, rng)
