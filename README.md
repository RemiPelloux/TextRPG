# TextRPG

[![CI](https://github.com/RemiPelloux/TextRPG/actions/workflows/ci.yml/badge.svg)](https://github.com/RemiPelloux/TextRPG/actions/workflows/ci.yml)
![Python](https://img.shields.io/badge/python-3.11%2B-blue)

Un RPG textuel **au choix**, dans le terminal : crée ton héros, entraîne-toi contre des ennemis
générés à la volée, récupère du butin, accomplis des quêtes, monte jusqu'au niveau 20.

```
+--------------------------------------+
|            Aria - level 4            |
+--------------------------------------+
  1. Train
  2. Dungeon
  3. Stats
  4. Inventory
  5. Equipment
  6. Quests
  7. Shop
  8. Quit
>| 3

Name    : Aria
Level   : 4   (exp 120/400)
Health  : [####################] 115/115
Energy  : [##############......] 18/26
Attributes (base + equipment):
  strength   14   (base 9)
  ...
```

> **État : v0.2 « Renaissance ».** La fondation est en place (personnage, niveaux, quêtes,
> sauvegarde, génération d'ennemis). Le combat arrive en v0.3 — voir la [roadmap](docs/ROADMAP.md).

## Jouer

Python **3.11+**, aucune dépendance.

```bash
git clone https://github.com/RemiPelloux/TextRPG.git
cd TextRPG
pip install -e .
textrpg                 # ou : python -m textrpg
```

Options :

| Option | Effet |
|---|---|
| `--save-dir DOSSIER` | Où ranger la sauvegarde (défaut : `~/.textrpg/`, ou `$TEXTRPG_SAVE_DIR`) |
| `--seed 42` | Graine aléatoire fixe : la même partie à chaque fois |
| `--version` | Affiche la version |

La partie est sauvegardée après chaque action et en quittant (y compris avec Ctrl+C / Ctrl+D).

## Développer

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest                 # 32 tests
ruff check . && ruff format .
```

Ajouter un objet, un ennemi ou une quête ne demande **aucun code** : tout le contenu est dans
[`src/textrpg/data/`](src/textrpg/data/) en TOML.

## Structure

```
src/textrpg/
├── domain/        modèle pur (personnage, stats, objets, ennemis, quêtes)
├── systems/       règles du jeu (niveaux, génération d'ennemis, quêtes)
├── content/       chargement et validation du contenu
├── data/          contenu du jeu en TOML (objets, ennemis, quêtes)
├── persistence/   sauvegarde versionnée
└── ui/            terminal : console, rendu, écrans
tests/             tests unitaires et parties complètes simulées
docs/              audit, vision, architecture, roadmap
```

## Documentation

| Document | Contenu |
|---|---|
| [docs/VISION.md](docs/VISION.md) | Le jeu tel qu'imaginé à l'origine, et ce qui est déjà fait |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Les couches, les règles, comment ajouter du contenu ou un écran |
| [docs/ROADMAP.md](docs/ROADMAP.md) | De la v0.3 *First Blood* à la v1.0 *Legend* |
| [docs/AUDIT.md](docs/AUDIT.md) | L'audit du code de 2022 et ce qui a été corrigé |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Conventions de code, de commits et de tests |
| [CHANGELOG.md](CHANGELOG.md) | Historique des versions |
