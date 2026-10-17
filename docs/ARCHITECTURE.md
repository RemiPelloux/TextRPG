# Architecture

## Vue d'ensemble

```
 navigateur (PWA)                         serveur (Next.js)                       Postgres
┌──────────────────────┐   Server Action  ┌───────────────────────────────┐     ┌──────────────┐
│ écrans React         │ ───────────────► │ apps/web/app/actions.ts        │     │ users        │
│ GameProvider         │   { action }     │   session (cookie httpOnly)    │     │ sessions     │
│   anime les events   │                  │ packages/server                │     │ heroes       │
│   chronique, sons    │ ◄─────────────── │   parseAction (Zod)            │ ◄─► │  state JSONB │
│                      │ { view, events } │   rate limit                   │     │  version     │
└──────────────────────┘                  │   load → apply → save (lock)   │     │ daily_runs   │
                                          │ packages/engine (pur)          │     │ action_log   │
                                          │ packages/content (JSON + Zod)  │     │ push_subs    │
                                          └───────────────────────────────┘     └──────────────┘
```

**Le serveur décide de tout.** Le client envoie une intention (« attaquer », « équiper tel
objet ») ; le serveur charge la partie, applique les règles avec **son** horloge et **son** générateur
aléatoire, sauvegarde, puis renvoie la vue et la liste des événements. Le client ne calcule
rien : il met les événements en scène (chiffres qui volent, sons, chronique).

## Le moteur — `packages/engine`

Tout le jeu tient dans une fonction pure :

```ts
apply(state: GameState, action: Action, { now, content }): { state, events }
```

- Elle **ne modifie jamais** son entrée (`structuredClone`), donc une erreur (`GameError`) laisse la partie intacte.
- Elle est **déterministe** : l'état du générateur (xoshiro128\*\*) est stocké dans la partie. Même état + même action = même résultat. Le client ne peut pas relancer un tirage.
- Elle ne lit **jamais l'heure système** : `now` est passé par le serveur. Les journées commencent à minuit dans le fuseau du joueur (`tzOffset`).

| Module | Rôle |
|---|---|
| `reducer.ts` | `apply()` : synchronise le temps, refait le marché et les quêtes du jour, vérifie que l'action est permise (pas de chasse en plein combat…), la distribue, met à jour quêtes et succès |
| `combat.ts` | Combat au tour par tour : formules, compétences, effets d'état, pouvoirs légendaires, boss |
| `encounters.ts` | Démarrer une chasse ou le boss de la semaine ; distribuer les récompenses ou gérer la défaite |
| `loot.ts` | Raretés, bases, affixes à paliers, légendaires, sets, protection contre la malchance, objets de quête |
| `economy.ts` | Sac, équipement, consommables, vente, identification, forge, alchimie, bâtiments, marché |
| `quests.ts` | Histoire, tableau d'annonces, quêtes du jour, progression, récompenses |
| `dungeon.ts` | Les Profondeurs : portes, salles, événements, gardiens, butin à rapporter |
| `fishing.ts` | La pêche : lire le poisson, répondre par le bon geste |
| `challenge.ts` | Le défi quotidien : mêmes ennemis pour tous (graine du jour), héros prêt à l'emploi |
| `progression.ts` | Repos, classes, talents, Parangon, succès |
| `leveling.ts` | Courbe d'expérience, montées de niveau (gains de la version originale) |
| `stats.ts` | Statistiques dérivées : base + équipement + sets + classe + talents + Parangon + buffs |
| `time.ts` | Journées locales, régénération (1 énergie et 5 % de santé toutes les 12 min), lune de sang |
| `view.ts` | Ce que le client a le droit de voir : jamais le générateur, ni les propriétés des objets non identifiés, ni la réponse à la pêche |
| `migrations.ts` | Évolution du format de sauvegarde |
| `sim.ts` | Héros « type » et mesure de combats pour l'équilibrage |

### Formules de combat

```
initiative  : la vitesse la plus haute agit d'abord ; 2× plus rapide → attaque supplémentaire
dégâts      : (6 + force × 1,6) × variation(0,85–1,15) × multiplicateurs × (1 − atténuation)
atténuation : défense / (défense + 20 + 5 × niveau de l'attaquant)
critique    : chance × 0,75 + chance de critique (max 60 %), dégâts × (1,5 + dégâts critiques)
esquive     : (vitesse défenseur − vitesse attaquant) × 1,5 % + esquive (max 35 %)
garde       : dégâts reçus × 0,4 (× 0,2 contre un coup télégraphé)
```

Les ennemis suivent une courbe légèrement exponentielle, adoucie avant le niveau 5 ; les chiffres
sont réglés avec `pnpm simulate` (Facile ≈ 100 %, Normal ≈ 99 %, Difficile ≈ 55–90 %,
Enfer ≈ 20–40 % de victoires pour un héros équipé de son niveau, sans potion).

## Le contenu — `packages/content`

Tout ce qui relève du game design est de la **donnée** :

| Fichier | Contenu |
|---|---|
| `items.json` | Bases d'objets (armes par classe, armures, bijoux, potions, élixirs, objets de quête) |
| `affixes.json` | Préfixes et suffixes, 5 paliers par niveau d'objet, noms FR (masculin/féminin) et EN |
| `legendaries.json`, `sets.json` | Objets uniques et panoplies, avec leurs pouvoirs |
| `enemies.json` | Types d'ennemis, boss, modificateurs d'élite, paliers de difficulté |
| `classes.json` | Classes, compétences, talents |
| `quests.json` | PNJ, Acte I, annonces, quêtes du jour |
| `fish.json`, `events.json`, `buildings.json`, `achievements.json`, `rare-names.json` | Le reste du monde |

Chaque fichier est validé par Zod au chargement, et les références croisées sont vérifiées
(une quête qui cible un ennemi inexistant fait échouer les tests, pas une partie).

### Ajouter du contenu

- **Un objet** : un bloc dans `items.json` (`icon` = un nom d'icône de `react-icons/gi`).
- **Un légendaire** : un bloc dans `legendaries.json` avec un `power` existant. Pour un nouveau pouvoir, l'ajouter à `POWER_IDS` (`schema.ts`) et l'implémenter dans `combat.ts` ou `stats.ts`.
- **Une quête** : un bloc dans `quests.json`.
- Puis `pnpm test` (le contenu est vérifié) et `pnpm --filter @textrpg/web icons` si tu as utilisé une nouvelle icône.

## Le serveur — `packages/server` et `packages/db`

- **Comptes sans friction** : un compte invité est créé à la première partie ; l'e-mail et le mot de passe (haché en scrypt) peuvent être ajoutés plus tard. Se connecter depuis un autre appareil y rapatrie les héros invités.
- **Sessions** : jeton aléatoire dans un cookie `httpOnly` ; seul son SHA-256 est stocké en base.
- **Validation** : chaque action est validée par un schéma Zod aligné à la compilation sur le type `Action` du moteur.
- **Limitation de débit** : seau à jetons par utilisateur.
- **Verrou optimiste** : chaque héros a une `version` ; une écriture concurrente (deux onglets, double clic) est rejouée une fois, jamais écrasée.
- **Héros = document** : l'état complet en JSONB, plus quelques colonnes copiées pour les classements.

## L'interface — `apps/web`

- **App Router**, une route par écran (`/play/[heroId]/hunt`…), un `GameProvider` client qui garde la vue et diffuse les lots d'événements.
- **`CombatOverlay`** rejoue les événements avec un rythme (plus rapide en ×2, instantané en mouvement réduit) ; un toucher sur la scène saute l'animation.
- **`lib/narrate.ts`** transforme chaque événement en phrase, avec plusieurs variantes par langue.
- **`lib/text.ts`** compose les noms d'objets à la Diablo (« Épée tranchante du Renard », accord en genre).
- **`lib/sfx.ts`** synthétise les sons (Web Audio) : aucun fichier audio.
- **i18n** maison (FR/EN) : `messages/*.json`, avec des tests qui vérifient la parité des clés et la traduction de chaque code d'erreur.
- **Icônes** : `scripts/gen-icons.mjs` génère une table contenant seulement les ~140 icônes utilisées.
- **PWA** : `app/manifest.ts`, `public/sw.js` (coquille en cache, pages en réseau d'abord, repli hors ligne, push).

## Tests

| Où | Quoi |
|---|---|
| `packages/content/test` | Schémas, références croisées, icônes existantes, chaîne de l'histoire |
| `packages/engine/test` | Règles du jeu, dont des tests de propriétés (fast-check) : un combat finit toujours, les PV ne dépassent jamais le max, aucun objet n'est dupliqué, même graine = même partie |
| `packages/server/test` | Comptes, sessions, verrou optimiste, validation, classement (contre Postgres) |
| `apps/web/test` | Traductions, noms d'objets et d'ennemis, chronique |
| `apps/web/e2e` | Parcours complets dans Chromium, mobile et desktop |
