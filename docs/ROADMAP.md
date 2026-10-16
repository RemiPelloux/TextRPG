# Roadmap

> De la fondation propre (v0.2) à un vrai jeu publié (v1.0), et au-delà.
> Chaque version est **jouable de bout en bout** : on ajoute une couche, on la teste, on la livre.

```
 v0.2 ✅      v0.3          v0.4          v0.5           v0.6          v0.7          v0.8         v1.0
Renaissance ─ First Blood ─ Loot & Gold ─ Into the ───── Living ────── Hero's ─────── Polish ───── LEGEND
 fondation    combat        économie      Depths         World         Path          & Juice      release
              + énergie     + forgeron    donjons        quêtes v2     classes       TUI, FR      PyPI
                                          + pêche        + temps       + skills      équilibrage  New Game+
```

## Principes

1. **Une version = une boucle jouable.** Jamais de « grosse refonte » qui bloque le jeu pendant des mois — c'est ce qui avait tué la v0.1.
2. **La logique d'abord, l'écran ensuite.** Chaque feature commence dans `systems/` avec ses tests, puis reçoit son écran.
3. **Le contenu est de la donnée.** Si on peut l'écrire en TOML, on l'écrit en TOML.
4. **Petits commits, messages clairs.** `feat(combat): add critical hits from luck` plutôt que « Working on enemies.py » ×9.

---

## ✅ v0.2 — *Renaissance* (fait)

La fondation : architecture en couches, contenu en TOML, sauvegarde fiable et versionnée,
32 tests, CI. Détails dans l'[AUDIT](AUDIT.md).

---

## ⚔️ v0.3 — *First Blood* : le combat
**Objectif : la boucle cœur est jouable — on s'entraîne, on se bat, on gagne de l'exp, on monte de niveau.**
C'est **la** version qui transforme le projet en jeu. À attaquer en premier.

- [ ] `systems/combat.py` — combat au tour par tour, pur et testable :
  - initiative par **vitesse** (le plus rapide frappe en premier ; écart de vitesse ≥ 2× → double attaque) ;
  - dégâts : `max(1, force_effective × rand(0.85, 1.15) − défense_cible / 2)` ;
  - **critique** : chance = `chance %` (plafonnée à 50 %), dégâts × 1.5 ;
  - **esquive** : `(vitesse_défenseur − vitesse_attaquant) × 2 %`, plafonnée à 30 % ;
  - actions : Attaquer / Potion / Fuir (réussite selon la vitesse).
  - Renvoie un journal d'événements (`CombatLog`) que l'UI raconte : *« Grakthor the Orc swings… CRITICAL! 23 damage »*.
- [ ] Écran **Train** : choix de la difficulté (Easy / Medium / Hard / Hell), coût en énergie croissant (2 / 3 / 5 / 8).
- [ ] Récompenses : exp et or selon niveau × difficulté ; `quests.record_kill` branché (les quêtes avancent enfin !).
- [ ] **Défaite** : retour à 1 PV, perte de 10 % de l'or. Pas de mort définitive hors donjon.
- [ ] **Repos** (1×/jour, via `last_rest_on`) : PV et énergie au max.
- [ ] Boire une potion depuis l'inventaire et en combat.
- [ ] Script `tools/simulate.py` : 10 000 combats simulés par niveau/difficulté → taux de victoire. Indispensable pour équilibrer sans y passer ses soirées.

**Critère de sortie :** une partie de 15 minutes de *Train* d'un niveau 1 jusqu'au niveau 5, sans bug, avec un taux de victoire Easy ≈ 90 %, Hell ≈ 10 % au même niveau.

---

## 💰 v0.4 — *Loot & Gold* : l'économie
**Objectif : chaque combat peut rapporter quelque chose d'excitant.**

- [ ] `systems/loot.py` (le `generateLoot` qui n'a jamais été écrit) : tables de butin par difficulté, objets du niveau ±2 du joueur, **10–20 % d'objet de quête** si une quête le demande.
- [ ] **Raretés** : Common / Uncommon / Rare / Epic / Legendary, couleur et multiplicateur de stats ; préfixes et suffixes générés (*« Sacred Half-sword of the Moon **of Swiftness** »*).
- [ ] **Équiper / déséquiper** avec comparaison avant/après (`strength 12 → 17 (+5)`).
- [ ] **Boutique** : 6 objets aléatoires adaptés au niveau, **renouvelée chaque jour réel**, achat à l'unité, revente à 40 % du prix.
- [ ] **Forgeron** : améliorer un objet (`upgrade_level` +1 → +10 % de bonus), coût croissant, risque d'échec à partir de +5.
- [ ] Inventaire limité (20 emplacements) → de vrais choix à faire.

---

## 🏰 v0.5 — *Into the Depths* : donjons et pêche
**Objectif : une activité à risque et à forte récompense, rejouable à l'infini.**

- [ ] **Donjons procéduraux** : 5 à 10 salles par étage — combat, trésor, piège, événement, feu de camp — représentées par une mini-carte ASCII.
  ```
  [S]──[⚔]──[?]──[⚔]──[$]
               │
              [🔥]──[⚔]──[☠ BOSS]
  ```
- [ ] **Boss** tous les 5 étages avec une mécanique propre (le Dragon charge une attaque pendant un tour → il faut se défendre).
- [ ] **Risque/récompense** : le butin du donjon n'est gagné que si on ressort ; mourir en donjon = tout perdre sauf l'exp.
- [ ] **Pêche** (les objets canne + appât existent déjà !) : mini-jeu de timing en texte, poissons rares, poissons revendables, un poisson légendaire par saison.

---

## 🌍 v0.6 — *Living World* : quêtes et temps
**Objectif : le monde a une mémoire et une histoire.**

- [ ] **Quêtes v2** : objectifs *tuer*, *collecter*, *livrer*, *explorer un étage*, *pêcher* ; quêtes en chaîne ; donneurs de quêtes nommés avec quelques lignes de dialogue.
- [ ] **Calendrier du jeu** : jours, saisons ; événements (lune de sang : ennemis +50 %, butin ×2).
- [ ] **Buffs temporaires** de ta vision d'origine : *« pour les X prochains combats, +santé »*.
- [ ] **Un village** qui évolue : investir son or pour débloquer de nouveaux bâtiments (forge avancée, alchimiste, arène).
- [ ] **Acte 1 de l'histoire** : pourquoi le monde est-il « mystérieux et dangereux » ? Une intrigue en 10 quêtes principales.

---

## 🧙 v0.7 — *Hero's Path* : la profondeur du personnage
**Objectif : deux joueurs ne jouent pas le même héros.**

- [ ] **Classes** au niveau 5 : Guerrier (force, défense), Voleur (vitesse, chance, critiques), Mage (énergie → sorts).
- [ ] **Compétences** actives coûtant de l'énergie en combat (Frappe lourde, Coup bas, Boule de feu).
- [ ] **Arbre de talents** : 1 point par niveau, 3 branches par classe.
- [ ] **Effets d'état** : poison, brûlure, étourdissement, saignement.
- [ ] **Plusieurs emplacements de sauvegarde** et statistiques de carrière.

---

## ✨ v0.8 — *Polish & Juice* : la finition
**Objectif : un jeu terminal dont on fait des captures d'écran.**

- [ ] Interface **[Rich](https://github.com/Textualize/rich)** (couleurs par rareté, barres de vie animées, tableaux) puis, en option, **[Textual](https://github.com/Textualize/textual)** (TUI complète, navigation à la souris).
- [ ] Art ASCII pour les ennemis et les boss.
- [ ] **Traduction française** (le texte du jeu est en anglais aujourd'hui) avec un système i18n simple.
- [ ] **Équilibrage complet** guidé par `tools/simulate.py` ; courbe d'exp revue (aujourd'hui linéaire).
- [ ] Accessibilité : mode sans couleur, mode lecteur d'écran (pas d'ASCII art, phrases complètes).
- [ ] Tutoriel intégré pour la première partie.

---

## 👑 v1.0 — *Legend* : la sortie
**Objectif : n'importe qui peut installer le jeu en une commande et y jouer 10 heures.**

- [ ] Publication sur **PyPI** : `pipx install textrpg`.
- [ ] **Succès** (« Tuer un dragon au niveau 3 », « 100 poissons pêchés »…).
- [ ] **Endgame** : mode Hell+, **New Game+** qui garde un objet légendaire.
- [ ] Fin de l'acte 1 avec un vrai boss final.
- [ ] Page itch.io + GIF de démo (via [asciinema](https://asciinema.org/) / [vhs](https://github.com/charmbracelet/vhs)).
- [ ] Choix d'une licence (MIT recommandée si tu veux des contributions).

---

## 🚀 Au-delà de la 1.0 — les idées folles

| Idée | Pourquoi c'est faisable grâce à l'architecture |
|---|---|
| **Version web** jouable dans le navigateur (Pyodide ou textual-serve) | La logique ne dépend pas du terminal : seule la couche `ui` change |
| **Bot Discord** : un héros par membre, un donjon commun chaque semaine | Idem : une nouvelle `Console` |
| **Défi quotidien** : même graine pour tout le monde (`--seed`), classement | Le RNG est déjà injectable et la partie reproductible |
| **Mods / packs de contenu** : déposer un dossier de `.toml` pour ajouter un biome | Le contenu est déjà 100 % data-driven et validé au chargement |
| **PNJ dialoguant via un LLM** (optionnel, hors-ligne par défaut) | Les donneurs de quêtes v0.6 sont des données ; un générateur de texte peut s'y brancher |
| **Multijoueur asynchrone** : envoyer son héros fantôme dans le donjon d'un ami | Les sauvegardes sont du JSON versionné |

---

## 🎯 Tes 5 premières sessions

Pour reprendre en douceur, chaque session ≈ 1–2 h et se termine par un commit qui marche :

1. **Découverte** — lancer `python -m textrpg`, lire `ARCHITECTURE.md`, ajouter une arme et une quête dans les TOML pour sentir le système.
2. **`systems/combat.py`** — un seul échange de coups (attaquant → défenseur) + tests.
3. **Le combat complet** — boucle jusqu'à la mort ou la fuite, journal d'événements + tests.
4. **Écran Train** — choix de difficulté, coût en énergie, affichage du combat, exp et or.
5. **Repos et potions** — et la v0.3 est presque là. 🎉

*Le plus dur est déjà fait : la vision était claire depuis le début, la fondation l'est maintenant aussi.*
