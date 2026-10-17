"""Turn game objects into display text. No input, no side effects."""

from __future__ import annotations

from textrpg.content.loader import Catalog
from textrpg.domain.character import Character
from textrpg.domain.item import ItemInstance
from textrpg.domain.quest import Quest
from textrpg.domain.stats import ATTRIBUTES
from textrpg.systems.leveling import LevelUp, exp_to_next_level


def banner(title: str, width: int = 40) -> str:
    line = "+" + "-" * (width - 2) + "+"
    return f"{line}\n|{title.center(width - 2)}|\n{line}"


def bar(current: int, maximum: int, width: int = 20) -> str:
    filled = round(width * current / maximum) if maximum else 0
    return "[" + "#" * filled + "." * (width - filled) + f"] {current}/{maximum}"


def format_bonuses(bonuses: dict[str, int]) -> str:
    parts = [f"{stat} {value:+d}" for stat, value in bonuses.items() if value]
    return ", ".join(parts) if parts else "no bonus"


def format_item(item: ItemInstance, catalog: Catalog) -> str:
    template = catalog.item(item.template_id)
    quantity = f" x{item.quantity}" if item.quantity > 1 else ""
    if template.equipable:
        details = format_bonuses(item.bonuses)
    elif template.effect:
        details = ", ".join(f"{k} +{v}" for k, v in template.effect.items())
    else:
        details = template.description
    return f"{template.name}{quantity} ({template.type.value}) - {details}"


def format_quest(quest: Quest) -> str:
    reward = f"{quest.reward.exp} exp, {quest.reward.money} gold"
    if quest.reward.item_id:
        reward += f", {quest.reward.item_id}"
    status = "DONE" if quest.is_complete else f"{quest.progress}/{quest.goal}"
    return f"{quest.title} [{status}] - reward: {reward}"


def format_character_sheet(character: Character, catalog: Catalog) -> str:
    s = character.stats
    needed = exp_to_next_level(character.level)
    exp = f"{character.exp}/{needed}" if needed is not None else "MAX LEVEL"
    lines = [
        f"Name    : {character.name}",
        f"Level   : {character.level}   (exp {exp})",
        f"Health  : {bar(s.health, s.max_health)}",
        f"Energy  : {bar(s.energy, s.max_energy)}",
        f"Money   : {character.inventory.money} gold",
        "",
        "Attributes (base + equipment):",
    ]
    for attribute in ATTRIBUTES:
        base = getattr(s, attribute)
        lines.append(f"  {attribute:<9}{character.effective(attribute):>4}   (base {base})")
    lines += ["", "Equipment:"]
    if character.equipment:
        lines += [
            f"  {slot.value:<9} {format_item(item, catalog)}"
            for slot, item in character.equipment.items()
        ]
    else:
        lines.append("  (nothing equipped)")
    lines += [
        "",
        f"Quests completed : {character.quests_completed}",
        f"Monsters killed  : {character.monsters_killed}",
    ]
    return "\n".join(lines)


def format_level_up(level_up: LevelUp) -> str:
    gains = ", ".join(f"{k} {v:+d}" for k, v in level_up.gains.items())
    lucky = " Lucky bonus!" if level_up.lucky else ""
    return f"*** Level up! You are now level {level_up.level}.{lucky} ({gains})"
