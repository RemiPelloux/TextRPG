# this file is used to handle quest
# each quest has an id, objective, progress, and completion
# the quest is a dictionary.
# the quest has: id, objective, progress,goal, completion, reward
# reward can be: item, exp, money
# the quest id is the key of the quest in the character.quests dictionary
# the quest objective is the objective of the quest
# the quest progress is the progress of the quest
# the quest completion is the completion of the quest
# the quest reward is the reward of the quest

import random

quest_list = [
    {
        'id': '1',
        'objective': 'Kill 10 enemies',
        'progress': 0,
        'goal': 10,
        'completion': False,
        'reward': {'item': '', 'exp': random.randint(8, 30), 'money': random.randint(70, 130)}
    },
    {
        'id': '2',
        'objective': 'Kill 10 orcs',
        'progress': 0,
        'goal': 10,
        'completion': False,
        'reward': {'item': '1', 'exp': random.randint(8, 30), 'money': random.randint(70, 130)}
    },
]


# this function is used to add a quest to the character.quests dictionary
# pick a random quest from the quest_list
# add the quest to the character.quests dictionary to the first empty slot
def add_quest(character):
    quest = random.choice(quest_list)
    for key in character.quests:
        if character.quests[key] == {}:
            character.quests[key] = quest
            break
    return character.quests
