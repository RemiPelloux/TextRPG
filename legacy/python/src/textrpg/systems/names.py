"""Random fantasy-ish name generation."""

from __future__ import annotations

import random

_ONSETS = ("b", "br", "d", "dr", "g", "gr", "k", "kr", "l", "m", "n", "r", "s", "th", "v", "z")
_VOWELS = ("a", "e", "i", "o", "u", "ae", "ia", "or")
_CODAS = ("", "", "n", "r", "th", "x", "k", "l", "s")


def generate_name(rng: random.Random, syllables: tuple[int, int] = (2, 3)) -> str:
    parts = [
        rng.choice(_ONSETS) + rng.choice(_VOWELS) + rng.choice(_CODAS)
        for _ in range(rng.randint(*syllables))
    ]
    return "".join(parts).capitalize()
