# Audit du projet original (août 2022)

> Audit réalisé en octobre 2026 sur le dernier commit de la version originale :
> `5a2623f` — *« Working on enemies.py {~} enemies -> GenerateEnnemy - Generate Health OK »*.
> Le code original reste consultable dans l'historique git : `git show 5a2623f:<fichier>`.

## TL;DR

| | |
|---|---|
| **Taille** | ~1 350 lignes, dont environ la moitié de commentaires et de données |
| **Ce qui marchait** | Écran titre, création de personnage aléatoire, écran de stats, sauvegarde en quittant |
| **Ce qui ne marchait pas** | Le **chargement** (la sauvegarde était ignorée), la montée de niveau (crash), 5 menus sur 8 (crash), la recherche d'objets (renvoyait toujours une arme) |
| **Fichiers vides** | 8 (`combat.py`, `shop.py`, `dungeon.py`, `blacksmith.py`, `fishing.py`, `training.py`, `inventory.py`, `equipmentManagement.py`) |
| **Tests** | Aucun |
| **Verdict** | Une vision **claire et ambitieuse**, bien écrite dans les commentaires, mais une fondation trop fragile pour construire dessus. Chaque nouvelle feature tombait sur un bug d'une couche inférieure, d'où l'impression de ne jamais pouvoir finir. |

Le point le plus important : **ce n'est pas un manque de talent ni d'idées.** Les commentaires en
tête de `game.py` forment un vrai cahier des charges (voir [VISION.md](VISION.md)). Ce qui manquait,
c'est une architecture qui sépare les responsabilités et des tests qui disent « ça marche
encore ». Sans ça, chaque ajout cassait silencieusement autre chose.

---

## 1. Bugs bloquants

Tous ont été reproduits en exécutant le code original.

### 🔴 B1 — Le chargement d'une partie crée un nouveau personnage aléatoire
`_core/character/character.py:32` — `Character.__init__` accepte `name, stats, inventory, ...`
mais **n'utilise aucun de ces arguments** : il régénère toujours un nom et des stats aléatoires.

```
save name:   YBFYWIRGNP
loaded name: BIHOYBBSVJ     ← un tout autre personnage
```

Le message « Welcome back, YBFYWIRGNP! » s'affichait (lu directement depuis le JSON), mais le
personnage réellement joué était un inconnu. En quittant, la sauvegarde était écrasée par cet
inconnu. **Toute progression était perdue à chaque session.**

### 🔴 B2 — La sauvegarde est une photo prise à la création
`character.py:61` — `self.save = {...}` est construit une seule fois dans `__init__`. Les dicts
(`stats`, `inventory`…) y sont référencés, mais les entiers (`level`, `exp`, `money`,
`monsters_killed`, `quests_completed`) sont **copiés** : les gains ultérieurs n'auraient jamais
été sauvegardés, même si B1 avait été corrigé.

### 🔴 B3 — `search_item` renvoie toujours une arme
`_core/items.py:224` :
```python
if item_list == 'weapons' or 'weapon':   # toujours vrai : 'weapon' est une chaîne non vide
```
Résultat : `search_item('1', 'armor')` renvoie… l'épée. Et si l'id n'existe pas parmi les armes,
la fonction renvoie `None` et `print_item(None)` plante.

### 🔴 B4 — La montée de niveau plante systématiquement
`_core/character/handleLevel.py` cumule quatre problèmes :
- l. 113 : `player.luck` n'existe pas (la chance est dans `player.stats['luck']`) → `AttributeError` ;
- l. 118 : les gains utilisent la clé `health`, le personnage a `currenthealth`/`maxhealth` → `KeyError` ;
- l. 121 : l'exp est soustraite **après** l'incrément de niveau, donc avec le mauvais palier ;
- l. 143 : `getExpOfNextLevel` au niveau 20 lit `levelcap[21]` → `KeyError`.

### 🔴 B5 — 5 entrées du menu principal plantent
`menu/mainMenu.py:56-66` appelle `dungeonMenu`, `inventoryMenu`, `equipmentMenu`, `questsMenu`
et `shopMenu`, **qui n'existent nulle part** → `NameError`. Le menu « Train » appelle une
fonction vide (`pass`).

### 🟠 B6 — Les stats aléatoires des objets sont tirées une seule fois
`_core/items.py` : `random.randint(...)` est évalué **à l'import du module**. Toutes les épées
d'une session ont exactement les mêmes stats. Même problème pour les récompenses de quêtes
(`_core/quest.py:21`).

### 🟠 B7 — Les quêtes sont partagées par référence
`_core/quest.py:38` : `random.choice(quest_list)` renvoie le dict du catalogue lui-même.
Faire progresser une quête aurait modifié le modèle pour tout le monde (et deux slots auraient
pu pointer sur le même objet).

### 🟠 B8 — Code de test exécuté à l'import
`_core/environment/ennemies.py:113-117` : une boucle de test génère et affiche 5 ennemis
dès que le module est importé.

### 🟡 B9 — Divers
- `os.system('cls')` en dur (`game.py:88`, `newGame.py:22,73`) : erreur `sh: cls: not found` sous Linux/macOS.
- Refuser de quitter rappelle `run(character)` récursivement (`mainMenu.py:76`) : la pile grossit à chaque fois.
- Une saisie invalide sur l'écran titre ferme le jeu (avec un message… mémorable 😄).
- `Skeleton` apparaît deux fois dans les types d'ennemis (2 chances sur 7).
- Les ids d'objets (`'1'`, `'2'`…) se répètent d'une catégorie à l'autre et ne sont pas uniques.
- `inventory` utilise les clés `armor`/`accessories`, `equipment` utilise `armor`/`accessory`, `search_item` attend encore d'autres noms.
- Les ids JSON deviennent des chaînes au rechargement (`1` → `"1"`), incohérent avec le code qui créait des clés entières.
- Les objets ont un bonus `attack`, le personnage une stat `strength` : jamais reliés.

## 2. Architecture et qualité

| Constat | Impact |
|---|---|
| Pas de séparation logique / affichage : les classes font des `print` et des `input` | Impossible à tester, impossible de changer d'interface |
| Données de jeu codées en dur dans le Python (`items.py` = 312 lignes de dicts) | Ajouter un objet = modifier du code ; risque d'erreur élevé |
| Dicts non typés partout (`character.stats['currenthealth']`) | Les fautes de frappe de clés deviennent des bugs à l'exécution (cf. B4) |
| Getters/setters Java-style (`get_name`, `set_stats`…) | Verbeux, pas idiomatique en Python |
| `random` global, non injecté | Impossible de reproduire un bug ou d'écrire un test déterministe |
| Chemins relatifs (`'save/save.json'`) | Le jeu ne marche que lancé depuis la racine du repo |
| Pas de `__init__.py`, imports `import _core`, `import menu` | Packaging impossible, fonctionne « par accident » |
| Deux arborescences `_core/` et `core/` (cette dernière ne contenant que des `.pyc`) | Vestige d'un renommage, confusant |

## 3. Hygiène du dépôt

- `__pycache__/*.pyc` et `.idea/` versionnés ; pas de `.gitignore`.
- `save/save.json` versionné (une partie personnelle dans le dépôt).
- Pas de `requirements`/`pyproject`, pas de version Python déclarée (l'IDE indiquait 3.9).
- README de deux lignes.
- 9 commits sur 17 portent un message dupliqué (« Working on enemies.py … ») : l'historique ne raconte pas ce qui a changé.

## 4. Points forts à conserver

- **La vision.** Le bloc de commentaires de `game.py` est un excellent game design document : boucle de jeu, énergie, repos quotidien, boutique qui se renouvelle, loot de quête… Tout a été repris dans [VISION.md](VISION.md).
- **Le scaling des ennemis** (`ennemies.py`) : les formules par difficulté étaient réfléchies et ont été conservées telles quelles.
- **Le contenu** : armes, armures, anneaux, potions et descriptions (« forged with moonstone ») ont été intégralement migrés dans `data/*.toml`.
- **La courbe d'expérience** et les gains de niveau (+5 PV, +2 énergie, 1–3 par attribut, bonus de chance) : conservés, et maintenant fonctionnels.

## 5. Ce qui a été fait (v0.2.0)

| Problème | Correction |
|---|---|
| B1, B2 | Sérialisation explicite `character_to_dict` / `character_from_dict`, test d'aller-retour complet |
| B3, ids dupliqués | Catalogue unique indexé par id textuel (`"sacred_sword"`) |
| B4 | `systems/leveling.py` réécrit, multi-niveaux, plafond au niveau 20, 7 tests |
| B5 | Menus Stats, Inventaire, Équipement, Quêtes fonctionnels ; Train/Dungeon/Shop affichent « bientôt » au lieu de planter |
| B6, B7 | Templates immuables + instances tirées à chaque drop (`ItemTemplate.roll`, `create_quest`) |
| B8, B9 | Plus aucun effet de bord à l'import, effacement d'écran ANSI portable, boucle sans récursion, saisies invalides redemandées |
| Archi | Couches `domain` / `systems` / `content` / `persistence` / `ui`, RNG injecté, console injectable |
| Hygiène | `pyproject.toml`, `.gitignore`, CI GitHub Actions (ruff + pytest sur 3.11–3.13), 32 tests |
| Sauvegarde | Format versionné (`schema_version`), écriture atomique, stockée dans `~/.textrpg/` |

> ⚠️ Les sauvegardes de la v0.1 ne sont pas reprises : elles ne contenaient de toute façon que
> le personnage de départ (cf. B1/B2). Le jeu les détecte et le dit clairement au lieu de planter.
