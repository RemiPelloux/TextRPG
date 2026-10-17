import random
from statistics import mean

import pytest

from textrpg.domain.enemy import Difficulty
from textrpg.systems.enemy_factory import generate_enemy


def test_same_seed_gives_same_enemy(catalog):
    a = generate_enemy(5, Difficulty.MEDIUM, catalog, random.Random(7))
    b = generate_enemy(5, Difficulty.MEDIUM, catalog, random.Random(7))
    assert a == b


def test_enemy_starts_at_full_health(catalog, rng):
    enemy = generate_enemy(3, Difficulty.EASY, catalog, rng)
    assert enemy.stats.health == enemy.stats.max_health > 0
    assert enemy.name.endswith(next(k.name for k in catalog.enemy_kinds if k.id == enemy.kind))


@pytest.mark.parametrize("lower, higher", [(Difficulty.EASY, Difficulty.HELL)])
def test_harder_difficulty_means_tougher_enemies(catalog, lower, higher):
    rng = random.Random(0)

    def avg_health(d):
        return mean(generate_enemy(6, d, catalog, rng).stats.max_health for _ in range(200))

    assert avg_health(higher) > avg_health(lower) * 2


def test_level_must_be_positive(catalog, rng):
    with pytest.raises(ValueError):
        generate_enemy(0, Difficulty.EASY, catalog, rng)
