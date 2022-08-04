# this is a RPG text game.
# if there are not save files, it will launch the new game screen.
# if there are save files, it will ask you if you want to load a game or start a new one.
# if you choose to load a game, it will load your game and go to the main menu.
# if you choose to start a new game, it will launch the new game and go to the main menu.
# the save will be in a json file called save.json.
# in the new game screen, it will ask you for a name and generate random stats.
import json
import os
import core.character.character as characterCreation


def loadGame():
    savedata = load_json('save/save.json')
    # load character
    print("Loading character...")
    #  name=None, stats=None, inventory=None, equipment=None, quests=None, shop=None, save=None, level=1, exp=0
    character = characterCreation.Character(savedata['name'], savedata['stats'], savedata['inventory'],
                                            savedata['equipment'], savedata['quests'], savedata['shop'],
                                            savedata['level'], savedata['exp'])
    # clear screen
    os.system("cls")
    print("Welcome back, " + savedata['name'] + "!")
    #  print current level
    print("You are currently on level " + str(character.level) + ".")
    return character


def load_json(file):
    with open(file, 'r') as f:
        return json.load(f)


def saveGame(character):
    thingsToSave = character.save
    with open('save/save.json', 'w') as f:
        json.dump(thingsToSave, f)


def checkSaveFilesExist():
    if os.path.isfile('save/save.json'):
        return True
    else:
        return False


def printWelcomeMessage():
    print("""
    -------------------------
    -------------------------
     this is a RPG text game.
     this is mysterious.
     this is dangerous.
    -------------------------
    -------------------------
    """)


class NewGame:
    def __init__(self):
        # create a new character
        self.character = characterCreation.Character()
        # print the resume of the character
        self.character.printResume()
        # save the character
        thingsToSave = self.character.save
        with open('save/save.json', 'w') as f:
            json.dump(thingsToSave, f)
        # wait for the user to press enter
        input("\n Press enter to continue...")
        # print the welcome message
        # clear the screen
        os.system('cls')
        printWelcomeMessage()
        # print the main menu

    def get_character(self):
        return self.character

# test
# test = NewGame()
