# a simple stats menu
# it shows the stats of the character
# you can go to the main menu
#


def statsMenu(character):
    # print the resume of the character
    print("""
        -------------------------
        -------------------------
        
        Name: {}
        
        Level: {}
        Exp: {}
        
        Stats: {}
        
        Inventory: {}
        
        Equipment: {}
        
        Quests: {}
        
        -------------------------
        -------------------------
        """.format(character.get_name(), character.get_level(), character.get_exp(), character.printStats(),
                   character.printInventory(), character.printEquipment(), character.printQuests()))
    # wait for the user to press enter
    input("\n Press enter to go to the main menu...")

