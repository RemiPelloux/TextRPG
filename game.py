# this is a RPG text game.
# if there are not save files, it will launch the new game screen.
# in the new game screen, it will ask you for a name and generate random stats.
# You can save your character and load it later.
# if there are save files, it will ask you if you want to load a game or start a new one.
# the save will be in a json file.
# You can save your game and load it later.
# the game is only with choices.
# You will have multiple choices to choose from.
# You can use your energy to do some actions.
# You can train your character and level up but it decrease your energy.
# you can fight with random enemies scalled by your level.
# You can loot the enemy and get some items and money.
# You can loot equipment, potions and money.
# Equipment is used to increase your stats.
# You can have weapons, armor, and accessories.
# Potions are used to increase your energy.
# Potions are used to fill you health.
# Potion can buff stats temporarily. ie for the next x fights you will have more health.
# you can rest and increase your energy only 1 time per day.
# you have a main menu.
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

import sys
import os
import json
import random
import time
import datetime
import core
import menu
from menu.newGame import NewGame, checkSaveFilesExist, loadGame
from menu.mainMenu import run


def handleFirstScreen():
    if checkSaveFilesExist():
        print("We have found save files. Do you want to load a game or start a new one?")
        print('1. Load a game')
        print('2. Start a new game')
        choice = input('>| ')
        if choice == '1':
            # load game return character
            return loadGame()
        elif choice == '2':
            # are you sure?
            print("Are you sure you want to start a new game? (y/n) it will delete all your save files.")
            choice = input('> ')
            if choice == 'y':
                # start a new game
                return NewGame().get_character()
            else:
                print("hmm okay !")
                sys.exit()
        else:
            print('GO TO HELL')
            sys.exit()
    else:
        return NewGame().get_character()


if __name__ == '__main__':
    # welcome message in ascii
    print("""
    -------------------------
    -------------------------
    WELCOME TO FightingText
    -------------------------
    -------------------------
    """)
    # wait for the user to press enter
    # input("\n Press enter to continue...")
    # clear the screen
    os.system('cls')
    character = handleFirstScreen()
    print(character.printResume())
    # load main menu
    menu.mainMenu.run(character)
