# Changelog

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versionnage [SemVer](https://semver.org/lang/fr/).

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
