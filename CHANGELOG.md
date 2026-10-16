# Changelog

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versionnage [SemVer](https://semver.org/lang/fr/).

## [0.2.0] — 2026-10-16 — *Renaissance*

Refonte complète de la structure. Détails et justification dans [docs/AUDIT.md](docs/AUDIT.md).

### Ajouté
- Package installable `textrpg` (`pyproject.toml`, commande `textrpg`, `python -m textrpg`).
- Options `--save-dir`, `--seed`, `--version`.
- Contenu du jeu en TOML (`data/items.toml`, `enemies.toml`, `quests.toml`), validé au démarrage.
- Écrans Inventaire, Équipement et Quêtes (tableau de quêtes, suivi, récompenses).
- Choix du nom à la création, avec suggestion aléatoire.
- Sauvegarde versionnée et atomique dans `~/.textrpg/`, après chaque action.
- 32 tests (unitaires + parties simulées), CI GitHub Actions, ruff.
- Documentation : vision, architecture, roadmap, audit, guide de contribution.

### Corrigé
- Le chargement d'une partie créait un nouveau personnage aléatoire.
- La sauvegarde ne reflétait pas la progression (photo prise à la création).
- La recherche d'objet renvoyait toujours une arme.
- La montée de niveau plantait (`AttributeError`, `KeyError`) et le niveau 20 était inatteignable.
- Cinq entrées du menu principal plantaient (`NameError`).
- Les stats des objets et les récompenses de quêtes étaient tirées une seule fois par session.
- Effacement d'écran cassé hors Windows ; récursion en refusant de quitter ; saisie invalide qui fermait le jeu.

### Supprimé
- Fichiers vides, `__pycache__`, configuration IDE et sauvegarde personnelle du dépôt.
- Les sauvegardes v0.1 ne sont pas reprises (elles ne contenaient que le personnage de départ).

## [0.1.0] — 2022-08 — *FightingText*

Prototype original : création de personnage, écran de stats, catalogue d'objets, génération d'ennemis.
