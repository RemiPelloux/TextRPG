# Vision du jeu

> Reconstituée à partir des commentaires du code original (2022), principalement l'en-tête de
> `game.py`, `menu/mainMenu.py`, `menu/deep/trainMenu.py` et `_core/environment/ennemies.py`.
> Nom de travail d'origine : **FightingText**.

## Le pitch

Un RPG textuel **100 % au choix** (pas de commandes à taper, que des menus numérotés), où l'on
fait progresser un héros en gérant une ressource rare : **l'énergie**. Chaque action la consomme ;
on ne la récupère qu'en se reposant **une fois par jour**. On s'entraîne contre des ennemis
générés à la volée, on récupère du butin, on s'équipe, on accomplit des quêtes, on revient le
lendemain.

C'est un jeu de **sessions courtes et régulières** — l'esprit d'un idle/RPG de navigateur des
années 2000, dans un terminal.

## Les piliers

1. **Que des choix.** Chaque écran est un menu. Aucune syntaxe à apprendre.
2. **L'énergie rythme la journée.** Elle rend chaque décision significative (s'entraîner ? pêcher ? partir en donjon ?).
3. **Tout est aléatoire, mais à l'échelle du joueur.** Ennemis, butin, boutique : tirés au hasard et adaptés au niveau du héros.
4. **Le héros s'améliore de trois façons :** niveaux (stats), équipement (objets) et consommables (potions, buffs).
5. **On ne perd jamais sa partie.** Sauvegarde automatique en quittant.

## La boucle de jeu

```
            ┌──────────────── nouveau jour : repos (+énergie), boutique renouvelée ───────────────┐
            ▼                                                                                     │
   ┌─── Menu principal ───┐                                                                       │
   │ Train   Dungeon      │──► combat ──► butin (or, objets, items de quête) ──► exp ──► niveau ──┤
   │ Stats   Inventaire   │                                                                       │
   │ Équipement  Quêtes   │──► équiper / vendre / acheter / accomplir des quêtes ─────────────────┘
   │ Shop    Quit         │
   └──────────────────────┘
```

## Les fonctionnalités, telles que décrites à l'origine

| Domaine | Ce que tu voulais | État v0.2 |
|---|---|---|
| **Démarrage** | Pas de sauvegarde → nouvelle partie ; sinon choix charger / recommencer (avec confirmation) | ✅ |
| **Création** | Demander un nom, générer des stats aléatoires | ✅ (nom proposé par défaut) |
| **Sauvegarde** | Fichier JSON, sauvegarde auto en quittant | ✅ (+ après chaque action) |
| **Stats** | Or, santé, énergie, stats, ennemis vaincus, niveau, nom, quêtes accomplies | ✅ |
| **Niveaux** | Niveau max 20, +5 PV / +2 énergie / attributs aléatoires, bonus si chanceux | ✅ |
| **Inventaire** | Objets de quête, potions, armes, armures, accessoires | ✅ consultation |
| **Équipement** | 1 arme, 1 armure, 1 accessoire ; voir, équiper, déséquiper | 🟡 consultation seule |
| **Quêtes** | 3 quêtes max en parallèle, objectif + progression, récompense (objet, exp, or) | ✅ tableau de quêtes, suivi, récompenses |
| **Entraînement** | 4 difficultés (Easy, Medium, Hard, **Hell**), ennemis et butin selon la difficulté, coûte de l'énergie | 🟡 génération d'ennemis prête, combat à faire |
| **Ennemis** | Orc, démon, dragon, gobelin, squelette, zombie ; stats selon niveau + difficulté | ✅ génération |
| **Butin** | Équipement, potions, or ; 10–20 % de chance d'objet de quête si une quête est active | ⏳ |
| **Potions** | Soigner, rendre de l'énergie, **buffs temporaires** (« pour les X prochains combats ») | ⏳ |
| **Repos** | Une fois par jour, rend de l'énergie | ⏳ (le modèle stocke déjà `last_rest_on`) |
| **Boutique** | Objets aléatoires adaptés au niveau, **renouvelés chaque jour**, achat à l'unité, revente | ⏳ |
| **Forgeron** | (fichier `blacksmith.py` créé) amélioration d'objets — le champ `upgradeLevel` existait déjà | ⏳ |
| **Pêche** | (fichier `fishing.py`, objets canne + appât) | ⏳ (objets prêts dans le catalogue) |
| **Donjon** | (entrée de menu + `dungeon.py`) | ⏳ |

La suite est détaillée dans la [ROADMAP](ROADMAP.md).

## Ce qu'on garde, ce qu'on assume

- **Le texte du jeu reste en anglais**, comme à l'origine. Une traduction FR est prévue (roadmap v0.8).
- **Les formules d'origine sont conservées** (courbe d'exp, scaling des ennemis), même si l'équilibrage sera à revoir une fois le combat jouable : aux niveaux 1–2, les attributs des ennemis ne dépendent que de la difficulté (`level // 3 == 0`).
- **Zéro dépendance** à l'exécution : le jeu tourne avec un Python 3.11+ nu.
