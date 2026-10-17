# Architecture

## Vue d'ensemble

```
src/textrpg/
├── app.py              Point d'entrée : lit les arguments, assemble les dépendances, lance la boucle
├── context.py          GameContext : console + catalogue + rng + sauvegardes + personnage
│
├── domain/             LE MODÈLE — dataclasses pures, ni I/O ni hasard
│   ├── stats.py          Stats (PV, énergie, force, défense, vitesse, chance)
│   ├── item.py           ItemTemplate (catalogue) / ItemInstance (objet possédé), ItemType, Slot
│   ├── inventory.py      Inventaire : objets + or, empilement des consommables
│   ├── character.py      Le héros : stats, niveau, équipement, quêtes, compteurs
│   ├── enemy.py          Enemy, EnemyKind, Difficulty (EASY → HELL)
│   └── quest.py          QuestTemplate / Quest / Reward
│
├── systems/            LES RÈGLES — fonctions qui transforment le modèle (rng injecté)
│   ├── leveling.py       Courbe d'exp, montées de niveau, bonus de chance
│   ├── character_factory.py  Création d'un héros
│   ├── enemy_factory.py  Génération d'ennemis selon niveau × difficulté
│   ├── quests.py         Proposer / accepter / progresser / réclamer
│   └── names.py          Générateur de noms
│
├── content/            LE CHARGEMENT DU CONTENU
│   └── loader.py         Lit data/*.toml → Catalog validé (ids uniques, références existantes)
├── data/               LE CONTENU — éditable sans toucher au code
│   ├── items.toml
│   ├── enemies.toml      (types d'ennemis + paliers de difficulté)
│   └── quests.toml
│
├── persistence/        LA SAUVEGARDE
│   ├── serialization.py  Character ⇄ dict JSON, versionné, migrations
│   └── save_manager.py   Lecture / écriture atomique sur disque
│
└── ui/                 L'INTERFACE TERMINAL — le seul endroit qui affiche ou lit le clavier
    ├── console.py        Console injectable : write / prompt / choose / confirm / clear
    ├── render.py         Mise en forme (fiche perso, barres de vie, objets, quêtes)
    └── screens/          Un module par écran : title, main_menu, character, quests
```

## La règle des dépendances

```
          ui  ──────────►  systems  ──────────►  domain
           │                  │                    ▲
           │                  ▼                    │
           └──────────►  content / persistence ────┘
```

- **`domain` ne dépend de rien.** Aucun `print`, aucun `input`, aucun `random` global.
- **`systems` ne fait jamais d'I/O.** Les fonctions reçoivent un `rng: random.Random` et renvoient des résultats (ex. `grant_exp` renvoie la liste des `LevelUp`) que l'UI choisit d'afficher.
- **Seul `ui` parle au joueur.** Changer d'interface (Rich, Textual, web, bot Discord) ne demande de réécrire que cette couche.

C'est exactement ce qui manquait à la v0.1 : la logique et l'affichage étaient mélangés, donc
impossible à tester et chaque changement cassait autre chose.

## Templates vs instances

Le catalogue (`data/*.toml`) contient des **modèles immuables** avec des *plages* de stats :

```toml
[[item]]
id = "sacred_sword"
stats = { strength = [5, 10], speed = [1, 3], luck = [1, 8] }
```

Chaque fois qu'un objet tombe ou s'achète, on **tire une instance** (`template.roll(rng)`) qui
porte ses propres bonus et un `uid`. Deux Sacred Swords peuvent donc être différentes — c'est la
base d'un système de loot intéressant. Même principe pour les quêtes (`create_quest`).

## Le hasard est injecté

Tout tirage passe par un `random.Random` transmis en paramètre :

- en jeu : `random.Random()` (ou `--seed 42` pour rejouer exactement la même partie) ;
- en test : `random.Random(1234)` → résultats déterministes.

## Sauvegarde

- Emplacement : `~/.textrpg/save.json` (surchargeable avec `--save-dir` ou la variable `TEXTRPG_SAVE_DIR`).
- Écriture **atomique** (fichier temporaire puis `replace`) : un crash ne corrompt jamais la sauvegarde.
- Sauvegarde après **chaque action** du menu principal, et en quittant (y compris Ctrl+D / Ctrl+C).
- Champ `schema_version`. Pour faire évoluer le format :
  1. incrémenter `SCHEMA_VERSION` dans `persistence/serialization.py` ;
  2. ajouter dans `_MIGRATIONS` une fonction `{ancienne_version: upgrade(dict) -> dict}` ;
  3. ajouter un test qui charge une sauvegarde de l'ancien format.

## Recettes

### Ajouter un objet
Ajouter un bloc `[[item]]` dans `data/items.toml`. C'est tout. Le loader vérifie que l'id est unique.

### Ajouter un type d'ennemi
Ajouter un bloc `[[kind]]` dans `data/enemies.toml` avec un `weight` (fréquence relative).

### Ajouter une quête
Ajouter un bloc `[[quest]]` dans `data/quests.toml`. `target` doit être un id d'ennemi existant
et `reward_item` un id d'objet existant — sinon le jeu refuse de démarrer avec une erreur claire.

### Ajouter un écran
1. Créer `ui/screens/mon_ecran.py` avec une fonction `mon_ecran(ctx: GameContext) -> None`.
2. Mettre la logique dans `systems/` (testable), garder l'écran pour l'affichage et les choix.
3. Brancher l'écran dans `MENU` de `ui/screens/main_menu.py`.
4. Ajouter un test de bout en bout dans `tests/test_app.py` (voir `play()`).

## Tests

| Fichier | Couvre |
|---|---|
| `test_content.py` | Chargement du catalogue, tirage des objets |
| `test_leveling.py` | Courbe d'exp, multi-niveaux, plafond, bonus de chance |
| `test_enemies.py` | Déterminisme, scaling par difficulté |
| `test_quests.py` | Limite de 3, progression ciblée, récompenses |
| `test_persistence.py` | Aller-retour complet, sauvegardes corrompues/anciennes/futures |
| `test_app.py` | Parties complètes pilotées au clavier simulé |

Les tests marqués « Regression » correspondent aux bugs de l'[AUDIT](AUDIT.md).
