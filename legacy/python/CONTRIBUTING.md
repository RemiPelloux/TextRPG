# Contribuer

## Mise en place

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
```

## Avant chaque commit

```bash
ruff format .
ruff check .
pytest
```

La CI (GitHub Actions) lance exactement ces trois commandes sur Python 3.11, 3.12 et 3.13.

## Conventions de code

- **Respecter les couches** décrites dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) : pas de `print`/`input` hors de `ui/`, pas de `random` global — toujours un `rng` en paramètre.
- **Typage** : annotations sur toutes les fonctions publiques ; `dataclass` plutôt que des dicts.
- **Python idiomatique** : attributs publics plutôt que getters/setters, `snake_case`.
- **Contenu** : tout ce qui est du game design (objets, ennemis, quêtes, chiffres d'équilibrage) va dans `data/*.toml` ou dans des constantes nommées en tête de module.
- Code et texte du jeu en anglais, documentation en français.

## Tests

- Toute règle de jeu ajoutée dans `systems/` arrive avec ses tests.
- Utiliser la fixture `rng` (graine fixe) pour des résultats déterministes.
- Pour tester un écran, utiliser `play()` de `tests/test_app.py` qui simule le clavier.
- Un bug corrigé = un test de régression qui l'aurait détecté.

## Commits

Format [Conventional Commits](https://www.conventionalcommits.org/fr/) :

```
feat(combat): add critical hits based on luck
fix(save): keep quest progress when reloading
docs(roadmap): detail dungeon room types
test(leveling): cover multi-level gains
refactor(ui): extract item comparison renderer
```

Un commit = un changement cohérent, avec un message qui dit **ce qui change**.

## Faire évoluer la sauvegarde

Voir la section *Sauvegarde* de [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) : incrémenter
`SCHEMA_VERSION`, écrire la migration, tester le chargement de l'ancien format.
