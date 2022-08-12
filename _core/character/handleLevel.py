# Level cap are defined in this file
# levelcap is a dictionary with the following keys:
# levelcap['level'] = each level
#  each level has a list of exp required to reach the next level
#  levelcap[level]['exp'] = exp required to reach the next level
# levelcap[level]['stats']
# addRewardStat is a function that gives rewards for reaching the next level, it add random between 1 and 5 except for health and energy, and always 10 for health and 2 for energy
# levelcap[level]['stats']['health'] = health rewarded for reaching the next level
# levelcap[level]['stats']['energy'] = energy rewarded for reaching the next level
# levelcap[level]['stats']['strength'] = strength rewarded for reaching the next level
# levelcap[level]['stats']['defense'] = defense rewarded for reaching the next level
# levelcap[level]['stats']['speed'] = speed rewarded for reaching the next level
# levelcap[level]['stats']['luck'] = luck rewarded for reaching the next level
# level max is 20
# levelcap['max'] = max level

import random


def generateRewardStat():
    stats = {
        'health': 0,
        'energy': 0,
        'strength': 0,
        'defense': 0,
        'speed': 0,
        'luck': 0
    }
    stats['health'] += 5
    stats['energy'] += 2
    stats['strength'] += random.randint(1, 3)
    stats['defense'] += random.randint(1, 3)
    stats['speed'] += random.randint(1, 3)
    stats['luck'] += random.randint(-1, 5)
    return stats


levelcap = {
    1: {
        'exp': 0,
    },
    2: {
        'exp': 100,
    },
    3: {
        'exp': 200,
    },
    4: {
        'exp': 300,
    },
    5: {
        'exp': 400,
    },
    6: {
        'exp': 500,
    },
    7: {
        'exp': 600,
    },
    8: {
        'exp': 700,
    },
    9: {
        'exp': 800,
    },
    10: {
        'exp': 900,
    },
    11: {
        'exp': 1000,
    },
    12: {
        'exp': 1100,
    },
    13: {
        'exp': 1200,
    },
    14: {
        'exp': 1300,
    },
    15: {
        'exp': 1400,
    },
    16: {
        'exp': 1500,
    },
    17: {
        'exp': 1600,
    },
    18: {
        'exp': 1700,
    },
    19: {
        'exp': 1800,
    },
    20: {
        'exp': 1900,
    },
    'max': 20
}


# if the exp is greater than the exp required to reach the next level, add the reward stats to the player stats
def addRewardLevel(player):
    if player.exp > levelcap[player.level]['exp']:
        rewardStat = generateRewardStat()
        # print('DEBUG : rewards to be added ', rewardStat)
        for stat in player.stats:
            player.stats[str(stat)] += rewardStat[stat]
        player.level += 1
        player.exp = player.exp - levelcap[player.level]['exp']
        addRewardLevel(player)
    else:
        return False


def addExp(player, exp):
    player.exp += exp
    addRewardLevel(player)
    return player.exp


# perso = character.Character()
#
#  # test
#
# print(addExp(perso, 1200))
# print(perso.printResume())


def getExpOfNextLevel(player):
    level = player.level + 1
    return levelcap[level]['exp']
