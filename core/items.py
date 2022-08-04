# items are a list of item.
# item is a dictionary.
# item has: id, name, stats, price, description, type
# in items, there is categories of items.
# categories is: weapon, armor, accessory, potion, quest items, consumable items, special
# item type is: weapon, armor, accessory, potion, quest items, consumable items, special
#

weapon_list = [
    {
        'id': '1',
        'name': 'Sword',
        'stats': {'attack': 10, 'defense': 0, 'speed': 0, 'luck': 0},
        'price': 10,
        'description': 'A simple sword',
        'type': 'weapon',
        'equipable': True,
        'sellable': True
    },
    {
        'id': '2',
        'name': 'Axe',
        'stats': {'attack': 15, 'defense': 0, 'speed': 0, 'luck': 0},
        'price': 15,
        'description': 'A simple axe',
        'type': 'weapon',
        'equipable': True,
        'sellable': True
    },
    {
        'id': '3',
        'name': 'Mace',
        'stats': {'attack': 20, 'defense': 0, 'speed': 0, 'luck': 0},
        'price': 20,
        'description': 'A simple mace',
        'type': 'weapon',
        'equipable': True,
        'sellable': True
    }
]

armor_list = [
    {
        'id': '1',
        'name': 'Leather Armor',
        'stats': {'attack': 0, 'defense': 10, 'speed': 0, 'luck': 0},
        'price': 10,
        'description': 'A simple leather armor',
        'type': 'armor',
        'equipable': True,
        'sellable': True
    },
    {
        'id': '2',
        'name': 'Chainmail',
        'stats': {'attack': 0, 'defense': 15, 'speed': 0, 'luck': 0},
        'price': 15,
        'description': 'A simple chainmail',
        'type': 'armor',
        'equipable': True,
        'sellable': True
    },
    {
        'id': '3',
        'name': 'Plate Armor',
        'stats': {'attack': 0, 'defense': 20, 'speed': 0, 'luck': 0},
        'price': 20,
        'description': 'A simple plate armor',
        'type': 'armor',
        'equipable': True,
        'sellable': True
    }
]

accessory_list = [
    {
        'id': '1',
        'name': 'Lucky Ring',
        'stats': {'attack': 0, 'defense': 1, 'speed': 1, 'luck': 5},
        'price': 10,
        'description': 'A simple helmet',
        'type': 'accessory',
        'equipable': True,
        'sellable': True
    },
    {
        'id': '2',
        'name': 'Shield',
        'stats': {'attack': 0, 'defense': 3, 'speed': 1, 'luck': 3},
        'price': 15,
        'description': 'A simple shield',
        'type': 'accessory',
        'equipable': True,
        'sellable': True
    },
    {
        'id': '3',
        'name': 'Helmet',
        'stats': {'attack': 0, 'defense': 5, 'speed': 1, 'luck': 1},
        'price': 20,
        'description': 'A simple helmet',
        'type': 'accessory',
        'equipable': True,
        'sellable': True
    }
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
        'name': 'Quest Item',
        'stats': {'attack': 0, 'defense': 0, 'speed': 0, 'luck': 0},
        'price': 10,
        'description': 'A simple quest item',
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
    if item_list == 'weapons':
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
        return None


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
    if item['type'] == 'weapon':
        print('\t\t {} - {}'.format(item['name'], item['description']))
        print('\t\t Attack: {}'.format(item['stats']['attack']))
        print('\t\t Defense: {}'.format(item['stats']['defense']))
        print('\t\t Speed: {}'.format(item['stats']['speed']))
        print('\t\t Luck: {}'.format(item['stats']['luck']))
        print('\t\t Price: {}'.format(item['price']))
    elif item['type'] == 'armor':
        print('\t\t {} - {}'.format(item['name'], item['description']))
        print('\t\t Attack: {}'.format(item['stats']['attack']))
        print('\t\t Defense: {}'.format(item['stats']['defense']))
        print('\t\t Speed: {}'.format(item['stats']['speed']))
        print('\t\t Luck: {}'.format(item['stats']['luck']))
        print('\t\t Price: {}'.format(item['price']))
    elif item['type'] == 'accessory':
        print('\t\t {} - {}'.format(item['name'], item['description']))
        print('\t\t Attack: {}'.format(item['stats']['attack']))
        print('\t\t Defense: {}'.format(item['stats']['defense']))
        print('\t\t Speed: {}'.format(item['stats']['speed']))
        print('\t\t Luck: {}'.format(item['stats']['luck']))
        print('\t\t Price: {}'.format(item['price']))
    elif item['type'] == 'potion':
        print('\t\t {} - {}'.format(item['name'], item['description']))
        print('\t\t Health: {}'.format(item['effect']['health']))
        print('\t\t Price: {}'.format(item['price']))
    elif item['type'] == 'quest item':
        print('\t\t {} - {}'.format(item['name'], item['description']))
        print('\t\t Price: {}'.format(item['price']))
    elif item['type'] == 'special item':
        print('\t\t {} - {}'.format(item['name'], item['description']))
        print('\t\t Price: {}'.format(item['price']))
    else:
        print('\t\t {} - {}'.format(item['name'], item['description']))
        print('\t\t Price: {}'.format(item['price']))

