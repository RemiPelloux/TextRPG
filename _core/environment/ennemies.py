# This class is used to generate the ennemies.
# A ennemy is a random enemy scaled by the level of the character and the difficulty.
# It has a name, health, energy, stats, and loot.
# The loot is generated randomly scaled by the level of the character.
# The ennemy can be an orc, a demon, a dragon, a goblin, a skeleton, a zombie, a skeleton
import random
import string


class Ennemy:
    # The constructor of the class
    def __init__(self, level, difficulty):
        # The ennemy can be an orc, a demon, a dragon, a goblin, a skeleton, a zombie, a skeleton
        self.type = self.generateType()
        # The name of the ennemy is random
        self.name = self.generateName(self.type)
        # The health of the ennemy is random scaled by the level of the character
        self.health = self.generateHealth(level, difficulty)
        # The stats of the ennemy is random scaled by the level of the character
        self.stats = self.generateStats(level, difficulty)
        # The loot of the ennemy is random scaled by the level of the character
        self.loot = self.generateLoot(level, difficulty)
        # The ennemy is created

    # This method is used to generate the ennemies.
    # A ennemy is a random enemy scaled by the level of the character and the difficulty.
    # It has a name, health, energy, stats, and loot.
    # The loot is generated randomly scaled by the level of the character.
    # The ennemy can be an orc, a demon, a dragon, a goblin, a skeleton, a zombie, a skeleton

    # This method generates the type of the ennemy, if choice is not specified generate a random number
    def generateType(self, choice=None):
        choice = random.randint(1, 7)
        if choice == 1:
            self.type = 'Orc'
        elif choice == 2:
            self.type = 'Demon'
        elif choice == 3:
            self.type = 'Dragon'
        elif choice == 4:
            self.type = 'Goblin'
        elif choice == 5:
            self.type = 'Skeleton'
        elif choice == 6:
            self.type = 'Zombie'
        elif choice == 7:
            self.type = 'Skeleton'
        return self.type

    def generateName(self, ennemyType):
        self.name = ''.join(random.choice(string.ascii_uppercase) for _ in range(random.randint(5, 10))) + ' The '
        if ennemyType == 'Orc':
            self.name += 'Orc'
        elif ennemyType == 'Demon':
            self.name += 'Demon'
        elif ennemyType == 'Dragon':
            self.name += 'Dragon'
        elif ennemyType == 'Goblin':
            self.name += 'Goblin'
        elif ennemyType == 'Skeleton':
            self.name += 'Skeleton'
        elif ennemyType == 'Zombie':
            self.name += 'Zombie'
        elif ennemyType == 'Skeleton':
            self.name += 'Skeleton'
        return self.name

    # Generate the health of the ennemy scaled by the level of the character and the difficulty
    def generateHealth(self, level, difficulty):
        if difficulty == 1:
            difficultyFactor = random.randint(2, 3)
        elif difficulty == 2:
            difficultyFactor = random.randint(3, 5)
        elif difficulty == 3:
            difficultyFactor = random.randint(6, 9)
        elif difficulty == 4:
            difficultyFactor = random.randint(9, 13)
        else:
            difficultyFactor = 1
        self.health = level * (difficultyFactor * random.randint(9, 15))
        return self.health

    def generateStats(self, level, difficulty):
        pass

    def generateLoot(self, level, difficulty):
        pass


# # test
# tab = []
# for i in range(200):
#     ennemy = Ennemy(11, 2)
#     tab.append(ennemy.health)
#     print('\n')
#
# tab.sort()
# # print the average of the tab
# print(sum(tab) / len(tab))
