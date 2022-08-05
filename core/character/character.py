# a character is a player.
# you have a name
# you have stats
# stats are: health, energy, strength, defense, speed, luck
# you have inventory
# inventory is: quest items, potions, weapons, armor, accessories, money
# you have equipment
# equipment is: weapons, armor, accessories equiped
# you have quests
# quests are: quests you have completed, quests you have not completed
# you have shop
# shop is: items you can buy, items you can sell
# you have save
# save is: your stats, inventory, equipment, quests, shop
# make a character class
# make a character class that has a name, stats, inventory, equipment, quests, shop, save
import datetime
import random
import string
from core import items


def generate_name():
    # generate a random name
    return ''.join(random.choice(string.ascii_uppercase) for _ in range(random.randint(5, 10)))


class Character:
    def __init__(self, name=None, stats=None, inventory=None, equipment=None, quests=None, shop=None, level=1, exp=0):
        # generate a random name
        self.name = generate_name()
        # stats are: health, energy, strength, defense, speed, luck
        self.stats = {'currenthealth': 100, 'maxhealth': 100, 'energy': 20, 'strength': random.randint(1, 3),
                      'defense': random.randint(1, 3), 'speed': random.randint(1, 3),
                      'luck': random.randint(-1, 3)}
        # inventory is filled by item id and amount, and if the item is equipped or not if it's a weapon, armor or accessory
        self.inventory = {'quest items': {}, 'potions': {}, 'weapons': {1: {'id': 1, 'isEquipped': True}},
                          'armor': {}, 'accessories': {}}
        self.money = 1
        # level and exp are used to calculate the next level
        self.level = 1
        self.exp = 0
        # equipment is filled by item id and amount for each type of slot available
        # You can have only one weapon, armor, accessory
        # by default you have only one sword
        self.equipment = {'weapon': {1: {'id': 1, 'isEquipped': True}}, 'armor': {}, 'accessory': {}}
        # quests are filled by quest id and objective, progress, and completion
        # you can have only 3 quests at the same time
        self.quests = {'1': {}, '2': {}, '3': {}}
        # shop is filled by item id and amount
        # shop is filled by item id
        self.shop = {'buy': []}
        # number of quests completed
        self.quests_completed = 0
        # monster killed
        self.monsters_killed = 0
        # save is: level, exp, your stats, inventory, equipment, quests, shop, quests completed, monsters killed, the current date
        self.save = {'name': self.name, 'level': self.level, 'exp': self.exp, 'stats': self.stats,
                     'inventory': self.inventory, 'money': self.money,
                     'equipment': self.equipment, 'quests': self.quests, 'shop': self.shop,
                     'quests_completed': self.quests_completed, 'monsters_killed': self.monsters_killed,
                     'date': datetime.datetime.now().strftime('%m/%d/%Y')
                     }

    def set_name(self, name):
        self.name = name

    def set_stats(self, stats):
        self.stats = stats

    def set_quests(self, quests):
        self.quests = quests

    def set_shop(self, shop):
        self.shop = shop

    def set_save(self, save):
        self.save = save

    def get_name(self):
        return self.name

    def get_stats(self):
        return self.stats

    def get_quests(self):
        return self.quests

    def get_shop(self):
        return self.shop

    def get_save(self):
        return self.save

    def get_inventory(self):
        return self.inventory

    def get_equipment(self):
        return self.equipment

    def get_level(self):
        return self.level

    def get_exp(self):
        return self.exp

    def get_money(self):
        return self.money

    def add_money(self, money):
        self.money += money

    def get_quest_completed(self):
        return self.quests_completed

    def add_quest_completed(self):
        self.quests_completed += 1

    def get_monsters_killed(self):
        return self.monsters_killed

    def add_monster_killed(self, amount):
        self.monsters_killed += amount

    def printResume(self):
        print('Name: ' + self.name)
        print('Level: ' + str(self.level))
        print('Exp: ' + str(self.exp))
        print('Stats: ' + str(self.stats))
        print('Inventory: ' + str(self.inventory))
        print('Equipment: ' + str(self.equipment))
        print('Quests: ' + str(self.quests))

    # pretty print the character's stats
    def printStats(self):
        res = '\n'
        res += '\t current health: ' + str(self.stats['currenthealth']) + '\n'
        res += '\t max health: ' + str(self.stats['maxhealth']) + '\n'
        res += '\t energy: ' + str(self.stats['energy']) + '\n'
        res += '\t strength: ' + str(self.stats['strength']) + '\n'
        res += '\t defense: ' + str(self.stats['defense']) + '\n'
        res += '\t speed: ' + str(self.stats['speed']) + '\n'
        res += '\t luck: ' + str(self.stats['luck']) + '\n'
        return res

    # pretty print the character's inventory
    # for each item in each category, print the item with print_item
    def printInventory(self):
        for category in self.inventory:
            res = '\n'
            res += '\t' + category + '\n'
            return self.inventory

    # pretty print the character's equipment
    def printEquipment(self):
        res = '\n'
        res += '\t weapon: ' + str(self.equipment['weapon']) + '\n'
        res += '\t armor: ' + str(self.equipment['armor']) + '\n'
        res += '\t accessory: ' + str(self.equipment['accessory']) + '\n'
        return res

    # pretty print the character's quests
    def printQuests(self):
        res = '\n'
        res += '\t quests: ' + str(self.quests) + '\n'
        return res
