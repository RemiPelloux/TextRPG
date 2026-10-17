import random

import pytest

from textrpg.content import Catalog, load_catalog
from textrpg.domain.character import Character
from textrpg.systems.character_factory import create_character


@pytest.fixture
def rng() -> random.Random:
    return random.Random(1234)


@pytest.fixture
def catalog() -> Catalog:
    return load_catalog()


@pytest.fixture
def hero(catalog: Catalog, rng: random.Random) -> Character:
    return create_character("Tester", catalog, rng)
