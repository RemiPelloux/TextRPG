# a simple stats menu
# it shows the stats of the character
# you can go to the main menu
#


def statsMenu(character):
    # print the resume of the character
    print("\t Name " + character.get_name())
    print("\t Level " + str(character.get_level()))
    print("\t Exp " + str(character.get_exp()))
    print("\t Stats " + str(character.get_stats()))
    print("\t Inventory " + str(character.printInventory()))
    print("\t Equipment " + str(character.printEquipment()))
    print("\t Quests " + str(character.printQuests()))
    print("\t Quests completed " + str(character.get_quests_completed()))
    print("\t Monsters killed " + str(character.get_monsters_killed()))
    print("\t Date " + character.get_date())

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
