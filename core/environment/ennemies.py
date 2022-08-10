# This class is used to generate the ennemies.
# A ennemy is a random enemy scaled by the level of the character and the difficulty.
# It has a name, health, energy, stats, and loot.
# The loot is generated randomly scaled by the level of the character.
# The ennemy can be an orc, a demon, a dragon, a goblin, a skeleton, a zombie, a skeleton

class Ennemy:
    # The constructor of the class
    def __init__(self, name, health, energy, stats, ennemyType, loot):
        self.name = name
        self.health = health
        self.energy = energy
        self.stats = stats
        self.type = ennemyType
        self.loot = loot
        self.isAlive = True

    # This method is used to generate the ennemies.
    # A ennemy is a random enemy scaled by the level of the character and the difficulty.
    # It has a name, health, energy, stats, and loot.
    # The loot is generated randomly scaled by the level of the character.
    # The ennemy can be an orc, a demon, a dragon, a goblin, a skeleton, a zombie, a skeleton
