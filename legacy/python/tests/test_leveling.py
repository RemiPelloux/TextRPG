import random

import pytest

from textrpg.systems.leveling import MAX_LEVEL, exp_to_next_level, grant_exp


def test_exp_curve_matches_original_table():
    assert exp_to_next_level(1) == 100
    assert exp_to_next_level(5) == 500
    assert exp_to_next_level(MAX_LEVEL) is None


def test_small_gain_does_not_level_up(hero, rng):
    assert grant_exp(hero, 99, rng) == []
    assert hero.level == 1
    assert hero.exp == 99


def test_level_up_applies_gains_and_keeps_remainder(hero, rng):
    before = hero.stats.max_health
    level_ups = grant_exp(hero, 130, rng)
    assert [lu.level for lu in level_ups] == [2]
    assert hero.level == 2
    assert hero.exp == 30
    assert hero.stats.max_health == before + 5


def test_big_gain_triggers_several_level_ups(hero, rng):
    # 100 + 200 + 300 = 600 exp to reach level 4.
    level_ups = grant_exp(hero, 600, rng)
    assert hero.level == 4
    assert hero.exp == 0
    assert len(level_ups) == 3


def test_level_is_capped(hero, rng):
    grant_exp(hero, 10**6, rng)
    assert hero.level == MAX_LEVEL
    assert hero.exp == 0
    assert grant_exp(hero, 500, rng) == []


def test_high_luck_always_triggers_bonus(hero):
    hero.stats.luck = 100
    (level_up,) = grant_exp(hero, 100, random.Random(5))
    assert level_up.lucky


def test_negative_exp_is_rejected(hero, rng):
    with pytest.raises(ValueError):
        grant_exp(hero, -1, rng)
