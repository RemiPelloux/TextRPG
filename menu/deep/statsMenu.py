# a simple stats menu
# it shows the stats of the character
# you can go to the main menu
#


def statsMenu(character):
    # print the resume of the character
    print("Name : " + character.get_name())
    print("Level : " + str(character.get_level()))
    print("Exp : " + str(character.get_exp()) + " / " + str(character.get_exp_of_next_level()))
    print("Stats : " + str(character.printStats()))
    print("Money : " + str(character.get_money()))
    print("Inventory : " + str(character.printInventory()))
    print("Equipment : " + str(character.printEquipment()))
    print("Quests : " + str(character.printQuests()))
    print("Quests completed : " + str(character.get_quest_completed()))
    print("Monsters killed : " + str(character.get_monsters_killed()))

    # print("""
    #     -------------------------
    #     -------------------------
    #
    #     Name: {}
    #
    #     Level: {}
    #     Exp: {}
    #
    #     Stats: {}
    #
    #     Inventory: {}
    #
    #     Equipment: {}
    #
    #     Quests: {}
    #
    #     -------------------------
    #     -------------------------
    #     """.format(character.get_name(), character.get_level(), character.get_exp(), character.printStats(),
    #                character.printInventory(), character.printEquipment(), character.printQuests()))
    # wait for the user to press enter
    input("\n Press enter to go to the main menu...")
