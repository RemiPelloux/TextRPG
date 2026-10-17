import json

import pytest

from textrpg.persistence import SaveFormatError, SaveManager
from textrpg.persistence.serialization import character_from_dict, character_to_dict
from textrpg.systems import quests
from textrpg.systems.leveling import grant_exp


@pytest.fixture
def progressed_hero(hero, catalog, rng):
    grant_exp(hero, 450, rng)
    potion = catalog.item("potion")
    hero.inventory.add(potion.roll(rng, quantity=3), stackable=True)
    hero.inventory.add(catalog.item("chainmail").roll(rng), stackable=False)
    quest = quests.create_quest(catalog.quests["orc_hunt"], rng)
    quests.accept_quest(hero, quest)
    quests.record_kill(hero, "orc")
    return hero


def test_roundtrip_preserves_everything(progressed_hero):
    # Regression: the old loader ignored the save and created a new random character.
    assert character_from_dict(character_to_dict(progressed_hero)) == progressed_hero


def test_save_manager_writes_and_reloads(tmp_path, progressed_hero):
    saves = SaveManager(tmp_path)
    assert not saves.exists()
    saves.save(progressed_hero)
    assert saves.exists()
    assert saves.load() == progressed_hero
    assert not (tmp_path / "save.tmp").exists()


def test_save_reflects_later_changes(tmp_path, hero, rng):
    # Regression: the old `character.save` was a snapshot taken at creation time.
    saves = SaveManager(tmp_path)
    saves.save(hero)
    hero.inventory.money += 50
    grant_exp(hero, 100, rng)
    saves.save(hero)
    loaded = saves.load()
    assert loaded.inventory.money == hero.inventory.money
    assert loaded.level == 2


def test_legacy_save_is_rejected_cleanly(tmp_path):
    legacy = {"name": "YBFYWIRGNP", "level": 1, "stats": {"currenthealth": 100}}
    (tmp_path / "save.json").write_text(json.dumps(legacy))
    with pytest.raises(SaveFormatError, match="schema_version"):
        SaveManager(tmp_path).load()


def test_corrupt_save_raises_save_format_error(progressed_hero):
    data = character_to_dict(progressed_hero)
    del data["stats"]
    with pytest.raises(SaveFormatError):
        character_from_dict(data)


def test_future_save_version_is_rejected(progressed_hero):
    data = character_to_dict(progressed_hero)
    data["schema_version"] = 999
    with pytest.raises(SaveFormatError, match="newer"):
        character_from_dict(data)
