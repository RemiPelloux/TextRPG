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
def search_item(item_list, itemId):
    itemId = str(itemId)
    for item in item_list:
        if item['id'] == itemId:
            return item
    return None

# print(search_item(weapon_list, '1'))

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
        print('{} - {}'.format(item['name'], item['description']))
        print('Attack: {}'.format(item['stats']['attack']))
        print('Defense: {}'.format(item['stats']['defense']))
        print('Speed: {}'.format(item['stats']['speed']))
        print('Luck: {}'.format(item['stats']['luck']))
        print('Price: {}'.format(item['price']))
    elif item['type'] == 'armor':
        print('{} - {}'.format(item['name'], item['description']))
        print('Attack: {}'.format(item['stats']['attack']))
        print('Defense: {}'.format(item['stats']['defense']))
        print('Speed: {}'.format(item['stats']['speed']))
        print('Luck: {}'.format(item['stats']['luck']))
        print('Price: {}'.format(item['price']))
    elif item['type'] == 'accessory':
        print('{} - {}'.format(item['name'], item['description']))
        print('Attack: {}'.format(item['stats']['attack']))
        print('Defense: {}'.format(item['stats']['defense']))
        print('Speed: {}'.format(item['stats']['speed']))
        print('Luck: {}'.format(item['stats']['luck']))
        print('Price: {}'.format(item['price']))
    elif item['type'] == 'potion':
        print('{} - {}'.format(item['name'], item['description']))
        print('Effect: {}'.format(item['effect']))
        print('Price: {}'.format(item['price']))
    elif item['type'] == 'quest item':
        print('{} - {}'.format(item['name'], item['description']))
        print('Price: {}'.format(item['price']))
    elif item['type'] == 'consumable':
        print('{} - {}'.format(item['name'], item['description']))
        print('Price: {}'.format(item['price']))
    elif item['type'] == 'special':
        print('{} - {}'.format(item['name'], item['description']))
        print('Price: {}'.format(item['price']))
    else:
        print('{} - {}'.format(item['name'], item['description']))
        print('Price: {}'.format(item['price']))
