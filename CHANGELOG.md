# Changelog

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versionnage [SemVer](https://semver.org/lang/fr/).

## [1.2.0] — 2026-10-17 — *Nuit dorée*

### Direction artistique
- Le jeu devient illustré : une nuit dorée sur le royaume.
  - **Scènes dessinées en vectoriel et animées** : titre (lune, château, aqueduc, héros à la cape rouge), camp (tentes, bannière, feu vivant), chasse, Profondeurs, lune de sang, décor de chaque combat.
  - **Portrait du héros** teinté par sa classe, dans un médaillon doré.
  - **Matières** : cadres dorés à coins ornés (cadre rouge pour les événements), boutons d'or avec reflet et boutons d'acier cerclés d'or, toujours avec icône.
- Écrans retravaillés :
  - **titre** : emblème, logo doré, panneau d'entrée avec nom aléatoire au dé, raccourcis ronds ;
  - **barre du héros** : portrait, jauges, bourse, réglages ;
  - **camp** : bannière illustrée, raccourcis Carte/Quêtes/Inventaire, carte du feu de camp, événement lune de sang ;
  - **combat** : décor, emblème de l'ennemi, chronique encadrée, portrait du héros.
- Mouvement :
  - **ambiance** : étoiles, brume, braises, flammes, parallaxe, monstre qui flotte ;
  - **interface** : reflet sur l'or ;
  - désactivé par « mouvement réduit ».
- Polices : Cinzel et Cinzel Decorative (titres), EB Garamond (texte).
- Mise en page :
  - grille commune barre du haut / page, échelle d'espacement, marges 16 px / 28 px ;
  - aucune page plus large que l'écran, vérifié par les tests e2e ;
  - corrigé : une étiquette élargissait la page Chasse sur téléphone.
- README refait avec bannière animée et démonstrations animées.

## [1.1.0] — 2026-10-17 — *Forge infinie*

Chaque objet est unique, les sets comptent dès le niveau 1, le Cube ouvre le craft dès le premier jour, et l'équilibrage est désormais mesuré par des bots qui jouent des semaines entières.

### Butin
- **Générateur d'objets** : 32 matières (fer, os, soie d'ombre, métal stellaire…), qualité 0-100 %, numéro de série, provenance (« Arraché à Grakthor l'Orc, le 14 oct. »). Plus de 99,5 % des objets générés sont distincts, même parmi les communs.
- **Pouvoirs générés** : 17 modèles (brûlure, saignement, vol de vie, cadence, riposte, dernier souffle…) dont les valeurs grandissent avec le niveau d'objet.
- **Légendaires procéduraux** : nom (« Complainte d'Aldric »), légende et 1 pouvoir (2 pour un ancestral), en plus des 13 légendaires faits main ; rares mythiques avec un pouvoir.
- **Sceaux** : 9 lignées (Loup, Corbeau, Braise, Ours…) portables sur n'importe quel objet, bonus à 2, 3, 4 et 6 pièces dès le niveau 1, butin intelligent qui complète la première paire. Deux nouveaux sets faits main de bas niveau.
- Les affixes continuent de grandir au-delà du niveau d'objet 20.

### Cube
- Dès le niveau 1 : **transmuter** 3 objets en 1 de la rareté suivante, **enchanter** (3 propositions, une à garder), **infuser** un sceau, **reforger**, **extraire** le pouvoir d'un légendaire et le placer dans l'un des 3 emplacements (niveaux 1, 10 et 20).

### Difficulté et progression
- **Tourments** 1 à 10 au niveau 20 (un de plus tous les 3 niveaux de Parangon) : ennemis plus forts, récompenses et découverte magique en hausse.
- **Pitié** : après des défaites d'affilée, les ennemis faiblissent un peu jusqu'à la prochaine victoire.
- **Premiers pas** : niveaux 1 à 4 plus rapides, chasses à moitié prix avant le niveau 5 ; la classe se débloque le premier jour.
- **Second souffle** : une chasse gagnée rend de la santé, les combats s'enchaînent.
- Ennemis retouchés : plus de « mur » aux niveaux 2-3, normal et difficile plus mordants, courbe d'expérience étirée après le niveau 5.

### Outils et plateforme
- `pnpm simulate:progression` : 3 profils de joueurs (casual, regular, hardcore) jouent des semaines ; `--check` vérifie les cibles de [docs/BALANCE.md](docs/BALANCE.md). Les bots ont trouvé un plantage (transmuter des cannes à pêche), corrigé.
- `pnpm simulate:bench` et `pnpm simulate:load` : coût du moteur et charge réelle sur Postgres ([docs/SCALABILITY.md](docs/SCALABILITY.md)).
- Moteur 5× plus rapide en fin de partie (copie d'état sans `structuredClone`).
- Maintenance quotidienne (`/api/cron/maintenance`) : purge du journal d'actions et des sessions expirées, avec les index nécessaires ; classements en cache 30 s.
- Workflow **Balance** hebdomadaire et agents Claude Code `balance-keeper` et `loot-smith` (`.claude/agents/`).
- Sauvegardes migrées automatiquement (schéma v2).

### Interface
- Infobulles v2 (qualité, pouvoirs, enchantement, sceau et progression, légende, provenance), page **Cube**, sélecteur de tourment, sceaux et pouvoirs actifs sur la fiche du héros, onglet Sceaux du codex, chronique des nouveaux événements, le tout en français et en anglais.

## [1.0.0] — 2026-10-17 — *Legend*

Refonte complète en jeu web : Next.js, PWA, serveur autoritaire. La version Python est conservée dans `legacy/python`.

### Jeu
- **Combat** au tour par tour : initiative, critiques, esquive, garde, attaques supplémentaires, compétences avec temps de recharge, 8 effets d'état, boss aux coups télégraphés et enragés, élites à modificateurs, mode automatique, fuite.
- **Loot à la Diablo** : 6 raretés, 30 affixes à 5 paliers, noms générés (accord en genre en français), 13 légendaires à pouvoir unique, 2 sets à bonus 2/3/4 pièces, objets non identifiés, protection contre la malchance, révélation animée.
- **Progression** : niveaux 1 → 20 (gains de la version originale), 3 classes, 10 compétences, 15 talents, Parangon infini.
- **Monde** : le Camp (repos quotidien et flamme de série), 4 difficultés de chasse, lune de sang le samedi, boss de la semaine, les Profondeurs (portes, 7 types de salles, 10 événements à choix, gardiens tous les 5 étages, raccourcis, butin perdu à la mort).
- **Quêtes** : Acte I en 10 chapitres, 12 annonces, 8 quêtes du jour, 6 PNJ.
- **Économie** : marché quotidien, forge (+10, relance d'affixe, recyclage), alchimiste, 4 bâtiments, pêche à 12 poissons (dont 2 saisonniers).
- **Social** : défi quotidien commun à tous, 3 classements, 31 succès, codex avec probabilités affichées.
- Équilibrage outillé par un simulateur (`pnpm simulate`).

### Plateforme
- Next.js 16, interface « Grimoire sombre » responsive (mobile, tablette, desktop), chronique de combat, sons synthétisés, vibrations.
- PWA installable, service worker (démarrage instantané, consultation hors ligne), notifications push opt-in.
- Comptes invités sans inscription, revendication par e-mail, fusion des héros entre appareils.
- Serveur autoritaire : validation Zod, verrou optimiste, limitation de débit, journal d'actions, aucune donnée secrète envoyée au client.
- Français et anglais ; mouvement réduit, contraste élevé, taille du texte, navigation clavier.
- 118 tests (contenu, moteur avec tests de propriétés, serveur sur Postgres, interface, Playwright mobile et desktop) ; CI GitHub Actions.

## [0.2.0] — 2026-10-16 — *Renaissance*

Refonte de la version Python : architecture en couches, contenu en TOML, sauvegarde versionnée,
32 tests, audit et roadmap. Voir [legacy/python](legacy/python).

## [0.1.0] — 2022-08 — *FightingText*

Prototype original en Python : création de personnage, écran de stats, catalogue d'objets, génération d'ennemis.
