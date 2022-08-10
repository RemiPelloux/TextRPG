# items are a list of item.
# item is a dictionary.
# item has: id, name, stats, price, description, type,level,upgrade level, equipable, sellable
# in items, there is categories of items.
# categories is: weapon, armor, accessory, potion, quest items, consumable items, special
# item type is: weapon, armor, accessory, potion, quest items, consumable items, special
#
import random

weapon_list = [
    {
        'id': '1',
        'name': 'Sword',
        'stats': {'attack': random.randint(1, 3), 'defense': 0, 'speed': 0, 'luck': random.randint(-1, 3)},
        'price': 10,
        'description': 'A simple sword',
        'type': 'weapon',
        'level': 1,
        'upgradeLevel': 0,
        'equipable': True,
        'sellable': True
    },
    {
        'id': '2',
        'name': 'Axe',
        'stats': {'attack': random.randint(4, 7), 'defense': 0, 'speed': 0, 'luck': random.randint(1, 5)},
        'price': 15,
        'description': 'A simple axe',
        'type': 'weapon',
        'level': 3,
        'upgradeLevel': 0,
        'equipable': True,
        'sellable': True
    },
    {
        'id': '3',
        'name': 'Sacred sword',
        'stats': {'attack': random.randint(7, 10), 'defense': 0, 'speed': 0, 'luck': random.randint(1, 8)},
        'price': 20,
        'description': 'A simple bow',
        'type': 'weapon',
        'level': 5,
        'upgradeLevel': 0,
        'equipable': True,
        'sellable': True
    },
    {
        'id': '4',
        'name': 'Staff',
        'stats': {'attack': random.randint(10, 15), 'defense': 0, 'speed': 0, 'luck': random.randint(1, 10)},
        'price': 25,
        'description': 'A simple staff',
        'type': 'weapon',
        'level': 7,
        'upgradeLevel': 0,
        'equipable': True,
        'sellable': True
    }
]

armor_list = [
    {
        'id': '1',
        'name': 'Leather armor',
        'stats': {'attack': 0, 'defense': random.randint(1, 3), 'speed': 0, 'luck': random.randint(-1, 3)},
        'price': 10,
        'description': 'A simple leather armor',
        'type': 'armor',
        'level': 1,
        'upgradeLevel': 0,
        'equipable': True,
        'sellable': True
    },
    {
        'id': '2',
        'name': 'Chainmail',
        'stats': {'attack': 0, 'defense': random.randint(4, 7), 'speed': 0, 'luck': random.randint(1, 5)},
        'price': 15,
        'description': 'A simple chainmail',
        'type': 'armor',
        'level': 3,
        'upgradeLevel': 0,
        'equipable': True,
        'sellable': True
    },
    {
        'id': '3',
        'name': 'Plate armor',
        'stats': {'attack': 0, 'defense': random.randint(7, 10), 'speed': 0, 'luck': random.randint(1, 8)},
        'price': 20,
        'description': 'A simple plate armor',
        'type': 'armor',
        'level': 5,
        'upgradeLevel': 0,
        'equipable': True,
        'sellable': True
    },
    {
        'id': '4',
        'name': 'Magic armor',
        'stats': {'attack': 0, 'defense': random.randint(10, 15), 'speed': 0, 'luck': random.randint(1, 10)},
        'price': 25,
        'description': 'A simple magic armor',
        'type': 'armor',
        'level': 7,
        'upgradeLevel': 0,
        'equipable': True,
        'sellable': True
    }
]

accessory_list = [
    {
        'id': '1',
        'name': 'Mysterious ring',
        'stats': {'attack': random.randint(0, 2), 'defense': random.randint(0, 2), 'speed': random.randint(0, 2), 'luck': random.randint(1, 3)},
        'price': 10,
        'description': 'This ring is mysterious, it give you some power',
        'type': 'accessory',
        'level': 1,
        'upgradeLevel': 0,
        'equipable': True,
        'sellable': True
    },
    {
        'id': '2',
        'name': 'Ring of power',
        'stats': {'attack': random.randint(1, 4), 'defense': random.randint(1, 4), 'speed': random.randint(1, 4), 'luck': random.randint(1, 4)},
        'price': 15,
        'description': 'The power of the ring',
        'type': 'accessory',
        'level': 3,
        'upgradeLevel': 0,
        'equipable': True,
        'sellable': True
    },


]

potion_list = [
    {
        'id': '1',
        'name': 'Potion',
        'stats': {'attack': 0, 'defense': 0, 'speed': 0, 'luck': 0},
        'price': 10,
        'description': 'A simple potion',
        'type': 'potion',
        'equipable': False,
        'sellable': True,
        'effect': {'health': 10}
    },
    {
        'id': '2',
        'name': 'Super Potion',
        'stats': {'attack': 0, 'defense': 0, 'speed': 0, 'luck': 0},
        'price': 15,
        'description': 'A simple super potion',
        'type': 'potion',
        'equipable': False,
        'sellable': True,
        'effect': {'health': 20}
    },
    {
        'id': '3',
        'name': 'Mega Potion',
        'stats': {'attack': 0, 'defense': 0, 'speed': 0, 'luck': 0},
        'price': 20,
        'description': 'A simple mega potion',
        'type': 'potion',
        'equipable': False,
        'sellable': True,
        'effect': {'health': 30}
    }
]

quest_item_list = [
    {
        'id': '1',
        'name': 'Orc\'s teeth',
        'stats': {'attack': 0, 'defense': 0, 'speed': 0, 'luck': 0},
        'price': 10,
        'description': 'A simple orc\'s teeth',
        'type': 'quest item',
        'equipable': False,
        'sellable': False
    }
]

special_item_list = [
    {
        'id': '1',
        'name': 'Fish bait',
        'stats': {'attack': 0, 'defense': 0, 'speed': 0, 'luck': 0},
        'price': 10,
        'description': 'A simple fish bait, used to catch fish',
        'type': 'consumable',
        'equipable': False,
        'sellable': False
    },
    {
        'id': '2',
        'name': 'Rod',
        'stats': {'attack': 0, 'defense': 0, 'speed': 0, 'luck': 2},
        'price': 15,
        'description': 'A simple fishing rod, used to catch fish',
        'type': 'special',
        'equipable': True,
        'sellable': False
    }
]


# search for of any list of items searchable by id
# if item_list is weapon, search in weapon_list
# if item_list is armor, search in armor_list
# if item_list is accessory, search in accessory_list
# if item_list is potion, search in potion_list
# if item_list is quest item, search in quest_item_list
# if item_list is special item, search in special_item_list

def search_item(item_id, item_list):
    item_id = str(item_id)
    if item_list == 'weapons' or 'weapon':
        for weapon in weapon_list:
            if weapon['id'] == item_id:
                return weapon
    elif item_list == 'armor':
        for armor in armor_list:
            if armor['id'] == item_id:
                return armor
    elif item_list == 'accessory':
        for accessory in accessory_list:
            if accessory['id'] == item_id:
                return accessory
    elif item_list == 'potion':
        for potion in potion_list:
            if potion['id'] == item_id:
                return potion
    elif item_list == 'quest item':
        for quest_item in quest_item_list:
            if quest_item['id'] == item_id:
                return quest_item
    elif item_list == 'special item':
        for special_item in special_item_list:
            if special_item['id'] == item_id:
                return special_item
    else:
        return 'Vide'


# print(search_item('1', 'weapons'))

# pretty print of an item
# if it's a weapon, it will print the stats
# if it's an armor, it will print the stats
# if it's an accessory, it will print the stats
# if it's a potion, it will print the effect
# if it's a quest item, it will print the description
# if it's a consumable, it will print the description
# if it's a special item, it will print the description

def print_item(item):
    res = ''
    if item['type'] == 'weapon' or item['type'] == 'weapons':
        res += '\t Weapon: ' + item['name'] + '\n'
        res += '\t\t\t Attack: ' + str(item['stats']['attack']) + '\n'
        res += '\t\t\t Defense: ' + str(item['stats']['defense']) + '\n'
        res += '\t\t\t Speed: ' + str(item['stats']['speed']) + '\n'
        res += '\t\t\t Luck: ' + str(item['stats']['luck']) + '\n'
        res += '\t\t\t Price: ' + str(item['price']) + '\n'
        res += '\t\t\t Description: ' + item['description'] + '\n'
        return res
    elif item['type'] == 'armor' or item['type'] == 'armors':
        res += '\t Armor: ' + item['name'] + '\n'
        res += '\t\t\t Attack: ' + str(item['stats']['attack']) + '\n'
        res += '\t\t\t Defense: ' + str(item['stats']['defense']) + '\n'
        res += '\t\t\t Speed: ' + str(item['stats']['speed']) + '\n'
        res += '\t\t\t Luck: ' + str(item['stats']['luck']) + '\n'
        res += '\t\t\t Price: ' + str(item['price']) + '\n'
        res += '\t\t\t Description: ' + item['description'] + '\n'
        return res
    elif item['type'] == 'accessory' or item['type'] == 'accessories':
        res += '\t Accessory: ' + item['name'] + '\n'
        res += '\t\t\t Attack: ' + str(item['stats']['attack']) + '\n'
        res += '\t\t\t Defense: ' + str(item['stats']['defense']) + '\n'
        res += '\t\t\t Speed: ' + str(item['stats']['speed']) + '\n'
        res += '\t\t\t Luck: ' + str(item['stats']['luck']) + '\n'
        res += '\t\t\t Price: ' + str(item['price']) + '\n'
        res += '\t\t\t Description: ' + item['description'] + '\n'
        return res
    elif item['type'] == 'potion' or item['type'] == 'potions':
        res += '\t Potion: ' + item['name'] + '\n'
        res += '\t\t\t Effect: ' + str(item['effect']) + '\n'
        res += '\t\t\t Price: ' + str(item['price']) + '\n'
        res += '\t\t\t Description: ' + item['description'] + '\n'
        return res
    elif item['type'] == 'quest item' or item['type'] == 'quest items':
        res += '\t Quest item: ' + item['name'] + '\n'
        res += '\t\t\t Description: ' + item['description'] + '\n'
        return res
    elif item['type'] == 'consumable' or item['type'] == 'consumables':
        res += '\t Consumable: ' + item['name'] + '\n'
        res += '\t\t\t Description: ' + item['description'] + '\n'
        return res
    elif item['type'] == 'special item' or item['type'] == 'special items':
        res += '\t Special item: ' + item['name'] + '\n'
        res += '\t\t\t Description: ' + item['description'] + '\n'
        return res
    else:
        return 'Vide'
