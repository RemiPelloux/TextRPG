# Équilibrage

L'équilibrage se mesure, il ne se devine pas. Trois outils, tous dans `tools/simulate` :

| Commande | Ce qu'elle mesure |
|---|---|
| `pnpm simulate [combats] [classe]` | Victoires, durée et santé restante par niveau et difficulté, pour un héros en équipement magique de son niveau. |
| `pnpm simulate:progression [jours] [bots] [--check] [--json]` | Des bots jouent des semaines entières (sessions, quêtes, cube, classe, tourments) : temps pour atteindre chaque palier. `--check` échoue si une médiane sort de sa cible. |
| `pnpm simulate:bench` | Coût d'une action du moteur et taille d'une sauvegarde (voir [SCALABILITY.md](SCALABILITY.md)). |

Le workflow **Balance** (`.github/workflows/balance.yml`) lance `--check` chaque lundi et à la demande, et publie le rapport dans le résumé du job. L'agent `balance-keeper` (`.claude/agents/`) sait lire ces rapports et proposer des retouches.

## Profils de joueurs

| Profil | Sessions / jour | Prudence | Classe | Cube |
|---|---|---|---|---|
| casual | 2 (midi, soir) | joue une difficulté gagnée à 90 % | guerrier | non |
| regular | 4 | 80 % | rôdeur | oui |
| hardcore | 6 | 70 % | occultiste | oui |

Les bots équipent ce qui augmente leur score de puissance, commencent volontiers un sceau même avec une pièce un peu plus faible (l'infobulle affiche « Loup 1/2 »), boivent une potion sous 45 % de vie puis se reposent, et tentent de temps en temps la difficulté au-dessus.

## Cibles

Médianes, en jours de jeu (`tools/simulate/src/progression.ts` → `TARGETS`, à garder synchronisé) :

| Mesure | casual | regular | hardcore |
|---|---|---|---|
| niveau 5 (classe) | 0,2 – 2 | 0,3 – 1,5 | — |
| niveau 10 | — | 3 – 8 | — |
| niveau 20 | 14 – 30 | 10 – 21 | 7 – 16 |
| premier craft | — | 0 – 1,5 | — |
| premier bonus de sceau (2 pièces) | 0 – 3 | 0 – 2 | — |
| premier objet de set | — | 0 – 3 | — |
| premier légendaire | — | 0,5 – 6 | — |
| défaites / 100 combats | — | 1,5 – 10 | 2 – 12 |
| tourment atteint en 30 jours | — | — | 2 – 10 |

Combat (`pnpm simulate`), héros bien équipé, santé pleine : facile ≈ 100 % ; normal ≥ 95 % avec 65 à 80 % de vie restante (les combats s'enchaînent, c'est l'usure qui compte) ; difficile 55 à 90 % ; enfer 15 à 60 % ; 2 à 8 tours par combat.

## Dernière mesure (v1.1, 6 bots × 30 jours)

```
                          casual   regular  hardcore
level 5                      0.5       0.8       0.6
level 10                     6.5       4.5       3.5
level 20                    18.9      13.9      12.3
first craft                  —         0.8       0.3
first sigil bonus            0.5       1.4       0.4
first legendary              3.9       3.3       1.3
first set item               0.5       0.5       0.3
fights / day                21.6      29.3      26.0
defeats / 100 fights         0.9       3.1       4.9
paragon (day 30)            17        52        75
torment (day 30)             3         7         8
```

Sur 60 jours (4 bots) : Parangon 103 / 216 / 250, tourment 9 / 9 / 10.

## Audit balance-keeper (v1.1)

Premier audit de l'agent `balance-keeper`, et ce qui en a été retenu :

| Constat | Suite |
|---|---|
| Le score de puissance ignorait les pouvoirs (procs, pouvoirs de légendaires, vol de vie, épines) : un légendaire paraissait moins bon qu'un rare bien tiré, pour les joueurs comme pour les bots. | **Corrigé** : `powerScore(stats, powers)` et `heroPower` (chaque pouvoir ≈ +4 %), vol de vie et épines comptés ; les flèches ▲▼ du sac comptent aussi les pouvoirs. |
| Les bots n'équipaient jamais de légendaire, ne recyclaient rien, n'amélioraient rien : la fin de partie était mal mesurée (sac plein, or inutilisé). | **Corrigé** dans `bot.ts` : extraction et recyclage quand le sac se remplit, forge quand l'or abonde, baisse du tourment quand même le normal devient difficile. |
| « Les tourments 7 à 10 sont un mur. » | **Non retenu** : c'était un artefact des bots sans forge ni légendaires. Mesurés correctement, les joueurs atteignent T7-8 au jour 30. |
| L'occultiste dominait à partir du niveau 15 (enfer niv. 20 : 85 % contre 58 % guerrier, 43 % rôdeur). | **Corrigé en partie** : Drain de vie (drain 0,5 → 0,3), Feu de l'âme (×2 → ×1,4, brûlure 0,35 → 0,25), Maléfice (affaiblissement 3 → 2 tours). Enfer niv. 20 ≈ 70 % ; reste un peu au-dessus de la bande 15-60 % aux niveaux 18-20, à surveiller. |
| Le rôdeur était faible du niveau 5 au niveau 10. | **Corrigé** : +4 % d'esquive en passif. |
| Les bonus de sceau à 2-3 pièces pèsent peu ; le set complet est fort. | **À décider** : doubler les statistiques à 2-3 pièces dans `sigils.json` si les joueurs les ignorent. |
| Le Cube est très abordable en fin de partie. | **Accepté** : la forge (+10) est le vrai puits d'or ; à revoir avec l'économie. |

**Question ouverte (design)** : avec les tourments actuels, un joueur régulier atteint le tourment maximal en ~2 mois. Pour une fin de partie plus longue : plus de tourments, saisons (roadmap v1.4), ou progression des tourments liée au Parangon plus lente (`maxTorment`).

## Leviers et ce qu'ils font

| Levier | Où | Effet |
|---|---|---|
| Courbe d'expérience | `leveling.ts` : `FIRST_STEPS` (niveaux 1-4), puis `100 · niveau^1.5` | Les premiers niveaux tombent en une journée, la suite s'étire. |
| Premiers pas | `encounters.ts` : `huntEnergy` | Chasses à moitié prix avant le niveau 5 : le premier jour n'est jamais avare. |
| Second souffle | `encounters.ts` : `secondWind` | Une chasse gagnée rend 15 % de vie (6 % après le niveau 5) : les combats s'enchaînent. |
| Novice | `enemies.ts` : `enemyStats` | Ennemis affaiblis jusqu'au niveau 6, sans « mur » aux niveaux 2-3. |
| Difficultés | `content/data/enemies.json` → `difficulties[].mods` | Santé, attaque, défense, vitesse des ennemis par difficulté. |
| Pitié | `encounters.ts` : `mercyMods` | −8 % santé et attaque ennemies par défaite d'affilée (3 max), remis à zéro à la victoire. |
| Tourments | `encounters.ts` : `tormentMods`, `tormentRewards` | Au niveau 20 : +1 niveau ennemi et +35 % de récompenses par tourment ; un tourment de plus tous les 3 niveaux de Parangon. |
| Sceaux | `loot.ts` : `SIGIL_CHANCE`, `PAIR_SIGIL_CHANCE`, `SMART_SIGIL_CHANCE` | Fréquence des sceaux et « butin intelligent » qui complète la première paire. |
| Pouvoirs | `procs.ts` : `PROC_RANGES` | Chance, valeur et croissance par niveau de chaque modèle de pouvoir. |

## Méthode

1. Changer **un** levier.
2. `pnpm simulate 400` puis `pnpm simulate:progression 30 6 --check`.
3. Si une cible bouge, décider : on corrige le levier, ou la cible était mauvaise (et on la change ici et dans `TARGETS`, en expliquant pourquoi dans le commit).
4. `pnpm test` : les tests qui figent une valeur (courbe d'expérience, coût en énergie) se mettent à jour avec le levier.
