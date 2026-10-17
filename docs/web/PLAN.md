# Plan de refonte : TextRPG en Next.js (PWA)

> **But :** transformer TextRPG en jeu web **responsive, installable (PWA), joli et addictif**,
> tout en gardant son âme : un RPG sombre et mystérieux, où l'on joue par choix et où le texte
> raconte l'histoire. Les objets ont une touche **Diablo**.
>
> Documents liés :
> - [GAME_DESIGN.md](GAME_DESIGN.md) — boucles de jeu, combat, loot à la Diablo, rétention
> - [ART_DIRECTION.md](ART_DIRECTION.md) — thème visuel, couleurs, typo, écrans, animations, sons
>
> Le code Python (v0.2) sert de **spécification de référence** : mêmes règles, mêmes formules,
> même architecture en couches, portées en TypeScript.

## ✅ Statut : livré en v1.0.0

Toutes les phases 0 à 7 sont livrées (voir le [CHANGELOG](../../CHANGELOG.md)). Quelques choix ont
évolué pendant la construction, toujours vers moins de dépendances et plus de contrôle :

| Prévu | Réalisé | Pourquoi |
|---|---|---|
| Turborepo | scripts pnpm (`pnpm -r`) | 6 paquets : Turborepo n'apportait rien de plus |
| Tailwind CSS v4 + Radix | CSS sur mesure à jetons (`app/globals.css`) | Une identité de jeu (coins coupés, lueurs de rareté) s'écrit plus simplement en CSS ; les composants accessibles sont faits maison |
| Better Auth | Authentification maison (`packages/server/src/auth.ts`) | Comptes invités, revendication et fusion entre appareils : ~120 lignes testées, sans dépendance |
| next-intl | i18n maison (`lib/i18n.ts`) | Pas de préfixe de langue dans les URL, variantes de phrases pour la chronique |
| Serwist | Service worker écrit à la main (`public/sw.js`) | Compatible avec le build Turbopack de Next 16, 100 lignes lisibles |
| Howler.js + sons Kenney | Sons synthétisés (Web Audio) | Zéro fichier audio, un accord par rareté |
| Compétences payées en énergie | Compétences à temps de recharge | L'énergie rythme les sessions ; la dépenser en combat punissait les compétences |
| Phase 1 en IndexedDB, serveur en phase 3 | Serveur autoritaire dès le départ | Tout a été construit d'un bloc : pas besoin de l'étape intermédiaire |
| Saisons (phase 7) | Reportées en v1.3 | Voir [ROADMAP](../ROADMAP.md) |

---

## 1. Les décisions en bref

| Sujet | Décision | Pourquoi |
|---|---|---|
| Langage | **TypeScript** partout | Un seul langage du moteur à l'interface |
| Framework | **Next.js 15+ (App Router)** | Server Components, Server Actions, un seul déploiement |
| Moteur | Package **TS pur** (`packages/engine`), sans React ni base de données | Testable, rejouable, réutilisable (bot, CLI, simulateur) |
| Autorité | **Le serveur décide** de chaque résultat (combat, loot, temps) | Énergie et journées infalsifiables : on ne triche pas en changeant l'heure du téléphone |
| Base de données | **Postgres** (Neon) + **Drizzle ORM** | Gratuit au départ, typé, migrations versionnées |
| Comptes | **Better Auth** avec **mode invité** (compte anonyme rattachable) | **On joue avant de s'inscrire** : premier combat en moins de 60 s |
| UI | **Tailwind CSS v4** + variables de thème, **Radix UI** (accessibilité), **Motion** (animations) | Rapide à écrire, cohérent, animations fluides |
| Icônes | **game-icons.net** (SVG, CC BY 3.0) recolorées par rareté | Plus de 4 000 icônes RPG homogènes |
| Sons | **Howler.js** + sons **Kenney** (CC0) | Retour sonore du loot et des coups |
| PWA | **Serwist** (`@serwist/next`) | Installable, démarrage instantané, notifications push |
| i18n | **next-intl**, FR + EN **dès le début** | Peu coûteux au départ, très coûteux à ajouter plus tard |
| Hébergement | **Vercel** + **Neon** (offres gratuites) | Zéro serveur à gérer, un déploiement par push |
| Tests | **Vitest** (moteur), **fast-check** (propriétés), **Playwright** (e2e mobile) | Le moteur est blindé, l'interface est vérifiée sur un vrai navigateur |

---

## 2. Structure du dépôt

Monorepo **pnpm** + **Turborepo** :

```
textrpg/
├── apps/
│   └── web/                         Next.js (App Router)
│       ├── app/
│       │   ├── [locale]/
│       │   │   ├── page.tsx           Écran titre / reprise de partie
│       │   │   ├── (game)/
│       │   │   │   ├── layout.tsx       Barre de nav du bas (mobile) / colonnes (desktop)
│       │   │   │   ├── camp/            Le hub : repos, énergie, résumé du jour
│       │   │   │   ├── hunt/            Entraînement : choix de la difficulté → combat
│       │   │   │   ├── dungeon/         Donjons (phase 4)
│       │   │   │   ├── hero/            Fiche, équipement, poupée de paperdoll
│       │   │   │   ├── bag/             Inventaire, comparaison, vente
│       │   │   │   ├── quests/          Journal et tableau de quêtes
│       │   │   │   ├── market/          Boutique du jour
│       │   │   │   └── forge/           Forgeron : améliorer, identifier, recycler
│       │   │   └── codex/             Bestiaire, collection d'objets, succès
│       │   ├── manifest.ts            Manifest PWA
│       │   └── sw.ts                  Service worker (Serwist)
│       ├── actions/                   Server Actions : 1 fichier par domaine (hunt.ts, bag.ts…)
│       ├── components/
│       │   ├── game/                  ItemCard, ItemTooltip, HealthBar, CombatScene, LootReveal…
│       │   └── ui/                    Button, Sheet, Dialog, Tabs (Radix + thème)
│       ├── lib/                       session, sons, haptique, formatage
│       └── messages/                  fr.json, en.json
│
├── packages/
│   ├── engine/                      LE JEU — TypeScript pur, aucune dépendance runtime
│   │   ├── src/
│   │   │   ├── domain/                Types : Hero, Stats, Item, Affix, Enemy, Quest…
│   │   │   ├── systems/               leveling, combat, loot, affixes, quests, shop, forge, energy
│   │   │   ├── rng.ts                 PRNG à graine (xoshiro128**), état sérialisable
│   │   │   ├── reducer.ts             apply(state, action, ctx) → { state, events }
│   │   │   └── migrations.ts          Évolution du format de sauvegarde
│   │   └── test/
│   ├── content/                     LE CONTENU — JSON validés par Zod
│   │   ├── data/                      bases.json, affixes.json, legendaries.json, sets.json,
│   │   │                              enemies.json, difficulties.json, quests.json, loot-tables.json
│   │   └── src/schema.ts
│   └── db/                          Schéma Drizzle, migrations, requêtes
│
├── tools/
│   └── simulate/                    CLI d'équilibrage : 10 000 combats → courbes
├── legacy/python/                   La v0.2 Python, gardée comme référence jusqu'à la parité
└── docs/
```

**Règle des dépendances** (la même qu'en Python) :
`apps/web → engine, content, db` · `engine → content (types seulement)` · `engine` ne connaît **ni** React, **ni** la base de données, **ni** l'heure système.

---

## 3. Le moteur : une fonction pure

Tout le jeu tient dans une fonction :

```ts
type ApplyResult = { state: GameState; events: GameEvent[] };

function apply(state: GameState, action: Action, ctx: { now: Date; content: Content }): ApplyResult;
```

- **`GameState`** = le héros complet + l'état du RNG + `schemaVersion`.
- **`Action`** = ce que le joueur fait : `{ type: "hunt.start", difficulty: "hard" }`, `{ type: "combat.attack" }`, `{ type: "item.equip", uid }`…
- **`GameEvent[]`** = ce qui s'est passé, **dans l'ordre** : `damage`, `crit`, `dodge`, `enemyDefeated`, `lootDropped`, `levelUp`, `questProgress`…

**L'interface ne calcule rien : elle anime les événements.** Un `crit` déclenche le tremblement de l'écran et le chiffre doré, un `lootDropped{rarity:"legendary"}` déclenche le pilier de lumière orange et le son. C'est ce qui rend le jeu à la fois **juste** (le serveur décide) et **vivant** (le client met en scène).

### Le hasard

- PRNG à graine **sérialisé dans l'état** (`rngState`). Chaque action fait avancer le même flux.
- Conséquences : une partie est **rejouable à l'identique** (débogage, signalement de bug, replays), et le client ne peut pas relancer un tirage pour obtenir un meilleur objet.
- Le défi quotidien utilise la **même graine pour tout le monde**.

### Le temps

- Le moteur ne lit jamais l'horloge : `ctx.now` lui est passé par le serveur.
- Régénération d'énergie, repos quotidien, boutique du jour : tout est calculé à partir de `now` et de dates stockées (`energyUpdatedAt`, `lastRestOn`, `shopSeedDay`).

---

## 4. Le serveur : actions autoritaires

Chaque action de jeu est une **Server Action** :

```
client ──(action)──► Server Action
                      1. authentifier (session ou invité)
                      2. valider l'action (Zod)
                      3. limiter le débit (anti-bot)
                      4. charger le héros (state + version)
                      5. apply(state, action, { now: new Date(), content })
                      6. sauvegarder SI version inchangée (verrou optimiste) → sinon 409
                      7. renvoyer { events, stateVisible }
client ◄─(events)──── anime les événements, met à jour l'affichage
```

- **Verrou optimiste** (`version` incrémentée à chaque écriture) : un double-clic ou deux onglets ouverts ne peuvent ni dupliquer un objet ni rejouer un combat.
- **Pas d'API REST publique** au départ : uniquement des Server Actions typées.
- **Latence** : l'UI anime de manière optimiste ce qui est certain (le bouton s'enfonce, l'attaque part) et révèle le résultat quand les événements arrivent (en général < 150 ms).

---

## 5. Base de données

Un principe : **le héros est un document**. On ne normalise pas chaque objet en table : on stocke
l'état complet en **JSONB versionné** (comme la sauvegarde Python actuelle), avec quelques
colonnes pour ce qu'on interroge.

```ts
// packages/db/schema.ts (Drizzle) — esquisse
heroes = pgTable("heroes", {
  id:              uuid().primaryKey(),
  userId:          text().references(() => users.id).notNull(),
  name:            text().notNull(),
  level:           integer().notNull(),          // pour classements / affichage
  paragon:         integer().notNull().default(0),
  state:           jsonb().$type<GameState>().notNull(),
  schemaVersion:   integer().notNull(),
  version:         integer().notNull().default(0), // verrou optimiste
  createdAt, updatedAt
});

actionLog = pgTable("action_log", {             // audit + replays + support (rétention 30 j)
  id, heroId, action: jsonb(), rngBefore: text(), createdAt
});

achievements  = pgTable("achievements",  { heroId, achievementId, unlockedAt });
dailyRuns     = pgTable("daily_runs",    { day, heroId, score, seed });     // défi quotidien
seasons / leaderboardEntries                                                 // phase 7
```

Les tables `users`, `sessions` et `accounts` sont gérées par Better Auth.

---

## 6. Comptes : jouer d'abord, s'inscrire ensuite

1. Le visiteur arrive → **compte invité créé automatiquement** (plugin *anonymous* de Better Auth).
2. Il joue tout de suite : nom du héros, premier combat, premier loot.
3. Après le premier objet **Rare** ou au niveau 3 : *« Ne perds pas Aria — sauvegarde ta partie »* → connexion **Google / GitHub / e-mail magique**. Le compte invité est rattaché, rien n'est perdu.

Aucun mur d'inscription : c'est le facteur n°1 de rétention d'un jeu web.

---

## 7. PWA et responsive

### Installable
- `app/manifest.ts` : nom, icônes (192, 512, maskable), `display: "standalone"`, `theme_color` = couleur d'encre du thème, écran de démarrage.
- Invite d'installation **maison** (pas celle du navigateur) proposée **après** une bonne session, jamais au premier chargement.
- iOS : bannière d'aide « Partager → Sur l'écran d'accueil ».

### Hors ligne
Le serveur décidant des résultats, **on ne combat pas hors ligne**. Mais :
- l'**app shell**, les polices, les icônes et les sons sont en cache → démarrage instantané ;
- héros, inventaire et codex restent **consultables** hors ligne (dernière copie connue) ;
- un bandeau « Hors ligne — reconnecte-toi pour reprendre la chasse » remplace les boutons d'action.

### Notifications (opt-in, jamais par défaut)
- « Ton énergie est pleine », « Le marché a de nouveaux objets », « Ton héros fantôme est revenu du donjon d'un ami ».
- Une par jour maximum. Web Push : Android et desktop ; iOS 16.4+ uniquement si l'app est installée.

### Responsive (mobile d'abord)
| Largeur | Mise en page |
|---|---|
| < 640 px (téléphone) | Une colonne, **barre de navigation en bas** (Camp · Chasse · Héros · Sac · Quêtes), panneaux en *bottom sheet*, cibles tactiles ≥ 44 px |
| 640–1024 px (tablette) | Deux colonnes : scène + panneau latéral (journal de combat ou inventaire) |
| > 1024 px (desktop) | Trois colonnes : fiche du héros · scène · journal / inventaire ; raccourcis clavier `1`–`9` comme dans la version terminal |

Les maquettes sont dans [ART_DIRECTION.md](ART_DIRECTION.md#5-les-écrans).

---

## 8. Qualité et performances

| Objectif | Cible |
|---|---|
| Lighthouse mobile (perf / a11y / PWA) | ≥ 90 / ≥ 95 / installable |
| LCP sur 4G | < 2,5 s |
| Du premier clic au premier combat | < 60 s |
| Taille JS initiale | < 200 Ko gzip (les écrans lourds en chargement différé) |
| Couverture du moteur | ≥ 90 % |

**CI (GitHub Actions)** : lint (ESLint + Prettier) → typecheck → Vitest → build → Playwright (iPhone 14 + desktop) → Lighthouse CI. Preview Vercel sur chaque PR.

**Tests du moteur** :
- les 32 tests Python portés un pour un (même scénarios, mêmes régressions) ;
- tests de propriétés (fast-check) : *les PV ne dépassent jamais le max*, *un combat finit toujours*, *même graine ⇒ même résultat*, *aucun objet ne se duplique* ;
- `tools/simulate` : taux de victoire par niveau et difficulté, temps moyen pour atteindre un niveau, fréquence des légendaires. On vérifie l'équilibrage **avant** de jouer.

---

## 9. Migration depuis Python

| Python (v0.2) | TypeScript |
|---|---|
| `domain/*.py` (dataclasses) | `engine/src/domain/*.ts` (types + fabriques) |
| `systems/leveling.py` | `engine/src/systems/leveling.ts` |
| `systems/enemy_factory.py` | `engine/src/systems/enemies.ts` |
| `systems/quests.py` | `engine/src/systems/quests.ts` |
| `content/loader.py` + `data/*.toml` | `content/data/*.json` + `content/src/schema.ts` (Zod) |
| `persistence/serialization.py` | `engine/src/migrations.ts` + `db/` |
| `ui/` | `apps/web/` |
| `tests/` (32 tests) | `engine/test/` |

Le dossier `legacy/python/` est conservé (avec sa CI) jusqu'à ce que la version web atteigne la
parité, puis supprimé dans un commit dédié. L'historique git garde tout.

---

## 10. Les phases

Estimations en **soirées de 2–3 h** pour une personne. Chaque phase se termine par une version
**jouable et déployée**.

### Phase 0 — *Fondations* (≈ 4 soirées)
- [ ] Monorepo pnpm + Turborepo, Next.js, Tailwind v4, ESLint/Prettier, CI
- [ ] Thème (couleurs, typo) et composants de base : `Button`, `Panel`, `HealthBar`, `ItemCard`
- [ ] `packages/content` : TOML → JSON + schémas Zod
- [ ] `packages/engine` : domaine, RNG à graine, leveling, ennemis, quêtes + **portage des 32 tests**
- [ ] Déploiement Vercel de l'écran titre

### Phase 1 — *First Blood* : le combat jouable (≈ 8 soirées)
- [ ] `systems/combat.ts` (formules dans [GAME_DESIGN.md](GAME_DESIGN.md#3-le-combat)) + tests de propriétés
- [ ] Écrans **Chasse** (choix de la difficulté, coût en énergie) et **Combat** (scène, journal, actions, auto-combat x1/x2)
- [ ] Énergie : régénération + repos quotidien ; potions
- [ ] Montée de niveau célébrée
- [ ] Sauvegarde **locale** (IndexedDB) à ce stade, pour itérer vite sans base de données
- [ ] `tools/simulate` v1

**Critère de sortie :** quelqu'un qui n'a jamais vu le jeu joue 15 minutes sans explication et veut continuer.

### Phase 2 — *Loot & Gold* : l'âme Diablo (≈ 10 soirées)
- [ ] Bases d'objets, **affixes** (préfixes/suffixes par palier), **raretés**, noms générés, objets **non identifiés**
- [ ] **Légendaires** (pouvoir unique) et **sets** (bonus à 2/3/4 pièces)
- [ ] Tables de butin, protection contre la malchance
- [ ] Mise en scène du loot : piliers de lumière, sons par rareté, révélation lente des légendaires
- [ ] **Poupée d'équipement**, comparaison ▲▼, équiper en un geste
- [ ] **Marché** du jour, vente, **Forge** (améliorer, identifier, recycler en éclats)

### Phase 3 — *En ligne* (≈ 6 soirées)
- [ ] Postgres + Drizzle, Better Auth (invité → compte)
- [ ] Bascule de l'état local vers les **Server Actions autoritaires** ; import de la partie locale au premier login
- [ ] Verrou optimiste, limitation de débit, journal d'actions
- [ ] **PWA** : manifest, service worker, invite d'installation, mode hors ligne en consultation
- [ ] i18n FR/EN complète

### Phase 4 — *Into the Depths* (≈ 8 soirées)
- [ ] Donjons procéduraux (carte de salles), boss tous les 5 étages, risque/récompense
- [ ] Pêche (canne + appât existent déjà dans le contenu)

### Phase 5 — *Living World* (≈ 8 soirées)
- [ ] Quêtes v2 (tuer / collecter / livrer / explorer), quêtes du jour, PNJ
- [ ] Le **Camp** qui s'agrandit (forge avancée, alchimiste, arène)
- [ ] **Acte I** de l'histoire : *« This is mysterious. This is dangerous. »*

### Phase 6 — *Hero's Path* (≈ 8 soirées)
- [ ] Classes (Guerrier, Rôdeur, Occultiste), compétences actives, talents
- [ ] Effets d'état (poison, brûlure, saignement, étourdissement)
- [ ] **Niveaux de Parangon** après le niveau 20

### Phase 7 — *Legend* (≈ 6 soirées)
- [ ] Succès, **Codex** (bestiaire + collection d'objets)
- [ ] **Défi quotidien** (graine commune) et classement
- [ ] **Saisons** (remise à zéro optionnelle, récompenses cosmétiques)
- [ ] Notifications push opt-in, page de présentation, GIF de démo

---

## 11. Risques et garde-fous

| Risque | Garde-fou |
|---|---|
| Recaler comme la v0.1 (trop de chantiers en parallèle) | Une phase à la fois, **toujours jouable et déployée** ; les comptes ne viennent qu'en phase 3 |
| Passer des semaines sur l'infra | Phases 0–2 **sans base de données** ; Vercel + Neon en une heure le moment venu |
| Jeu joli mais pas fun | Critère de sortie « 15 min sans explication » ; simulateur d'équilibrage ; faire tester par 3 personnes à chaque phase |
| Triche | Serveur autoritaire, RNG côté serveur, verrou optimiste, limitation de débit |
| Coûts | Offres gratuites Vercel/Neon jusqu'à plusieurs milliers de joueurs ; état en JSONB = peu de requêtes |
| Addiction toxique | Règles éthiques explicites (voir [GAME_DESIGN.md](GAME_DESIGN.md#8-addictif-mais-honnête)) |
