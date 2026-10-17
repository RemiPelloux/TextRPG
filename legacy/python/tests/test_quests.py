import pytest

from textrpg.systems import quests


def test_quest_log_is_limited_to_three(hero, catalog, rng):
    for template in catalog.quests.values():
        quests.accept_quest(hero, quests.create_quest(template, rng))
    hero.quests.append(hero.quests[0])  # fill the third slot
    assert quests.offer_quest(hero, catalog, rng) is None
    with pytest.raises(ValueError):
        quests.accept_quest(hero, quests.create_quest(catalog.quests["orc_hunt"], rng))


def test_offer_never_duplicates_an_active_quest(hero, catalog, rng):
    quests.accept_quest(hero, quests.create_quest(catalog.quests["orc_hunt"], rng))
    for _ in range(20):
        assert quests.offer_quest(hero, catalog, rng).template_id == "cull_the_wilds"


def test_kills_progress_only_matching_quests(hero, catalog, rng):
    orc_hunt = quests.create_quest(catalog.quests["orc_hunt"], rng)
    any_kill = quests.create_quest(catalog.quests["cull_the_wilds"], rng)
    quests.accept_quest(hero, orc_hunt)
    quests.accept_quest(hero, any_kill)

    quests.record_kill(hero, "goblin")
    assert (orc_hunt.progress, any_kill.progress) == (0, 1)
    quests.record_kill(hero, "orc")
    assert (orc_hunt.progress, any_kill.progress) == (1, 2)
    assert hero.monsters_killed == 2


def test_claiming_reward_pays_out_and_frees_the_slot(hero, catalog, rng):
    quest = quests.create_quest(catalog.quests["orc_hunt"], rng)
    quests.accept_quest(hero, quest)
    with pytest.raises(ValueError):
        quests.claim_reward(hero, quest, catalog, rng)

    for _ in range(quest.goal):
        quests.record_kill(hero, "orc")
    money_before = hero.inventory.money
    quests.claim_reward(hero, quest, catalog, rng)

    assert hero.quests == []
    assert hero.quests_completed == 1
    assert hero.inventory.money == money_before + quest.reward.money
    assert hero.inventory.count("orc_teeth") == 1
    assert hero.exp == quest.reward.exp
