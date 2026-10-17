"""Character and enemy statistics."""

from __future__ import annotations

from dataclasses import dataclass

# Attributes that equipment can boost and that drive combat formulas.
ATTRIBUTES: tuple[str, ...] = ("strength", "defense", "speed", "luck")


@dataclass
class Stats:
    max_health: int = 100
    health: int = 100
    max_energy: int = 20
    energy: int = 20
    strength: int = 1
    defense: int = 1
    speed: int = 1
    luck: int = 0

    @property
    def is_alive(self) -> bool:
        return self.health > 0

    def heal(self, amount: int) -> int:
        """Restore health without exceeding the maximum. Returns the amount actually healed."""
        before = self.health
        self.health = min(self.max_health, self.health + amount)
        return self.health - before

    def restore_energy(self, amount: int) -> int:
        before = self.energy
        self.energy = min(self.max_energy, self.energy + amount)
        return self.energy - before

    def spend_energy(self, amount: int) -> bool:
        """Spend energy if enough is available. Returns False (and spends nothing) otherwise."""
        if amount > self.energy:
            return False
        self.energy -= amount
        return True
