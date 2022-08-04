# you have a main menu.
# you have a train menu.
# you can train your character and level up but it decrease your energy.
# you can fight with random enemies scalled by your level.
# you can loot the enemy and get some items and money.

# you can fight.
# you can see your stats.
# in this stats screen, you can see amount of money, health, energy, stats, ennemies defeated, your level, your name, and amount of quests completed.
# you can see your inventory.
# in this inventory menu, you can see quest's items, potions, weapons, armor, and accessories.
# you can see your equipment.
# in this equipment menu, you can see, equip, and unequip items.
# you can see your quests.
# in this quests menu, you can see your quests and complete them.
# you can go to a shop.
# in this shop menu, you can see the items and buy them.
# you can buy only one item per time.
# you can sell your items.
# in this sell menu, you can see your items and sell them.
# item in the shop are random, scaled by the level of the character and refresh every day.
# you can quit the game, it will save your game automatically.
import os
import sys

from menu.deep.statsMenu import statsMenu
from menu.deep.trainMenu import trainMenu
from menu.newGame import saveGame


def run(character):
    choice = ''
    while choice != '8':
        os.system('cls' if os.name == 'nt' else 'clear')
        print("""
        ----------------------------------
        |                                  |
        |  Welcome to the main menu        |
        |                                  |
        ----------------------------------
        """)
        print("1. Train")
        print("2. Dungeon")
        print("3. Stats")
        print("4. Inventory")
        print("5. Equipment")
        print("6. Quests")
        print("7. Shop")
        print("8. Quit")
        choice = input('>| ')
        # clear the screen
        os.system('cls' if os.name == 'nt' else 'clear')
        if choice == '1':
            trainMenu(character)
        elif choice == '2':
            dungeonMenu(character)
        elif choice == '3':
            statsMenu(character)
        elif choice == '4':
            inventoryMenu(character)
        elif choice == '5':
            equipmentMenu(character)
        elif choice == '6':
            questsMenu(character)
        elif choice == '7':
            shopMenu(character)
    print("Are you sure you want to quit? (y/n)")
    choice = input('> ')
    if choice == 'y':
        # save the game
        print("Saving the game...")
        saveGame(character)
        print("Game saved")
        sys.exit()
    else:
        run(character)
