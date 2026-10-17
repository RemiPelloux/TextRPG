# Montée en charge

## Le chemin d'une action

```
navigateur ─► Server Action ─► parseAction (Zod) ─► rate limit (6/s, rafale 30, par compte)
          ─► SELECT héros ─► moteur apply() ─► UPDATE … WHERE version = v  +  INSERT action_log
          ◄─ vue client redigée + événements
```

Une requête = une lecture et une transaction d'écriture, sans état côté serveur : on ajoute des instances Next.js derrière le répartiteur, et Postgres reste le seul point partagé.

## Mesures (v1.1)

Machine de mesure : bac à sable 4 cœurs, Node et Postgres 16 sur la même machine. À refaire sur la cible avant un lancement.

**Moteur seul** (`pnpm simulate:bench`) :

| Sauvegarde | Taille | `sync` | `hunt.start` | combat entier (`combat.auto`) |
|---|---|---|---|---|
| jour 0, niveau 1 | 4,8 Kio | 0,10 ms | 0,12 ms | 0,19 ms |
| jour 30, niveau 20, 35 objets | 24,6 Kio | 0,10 ms | 0,13 ms | 0,18 ms |

Avant la v1.1, `apply` copiait l'état avec `structuredClone` : 90 % du temps d'une action, et 0,54 ms en fin de partie. `clonePlain` (`packages/engine/src/clone.ts`) fait la même copie 5 à 8 fois plus vite ; un test vérifie qu'elle est identique.

**Service complet** (`pnpm simulate:load 400 10 20`, base de test) : 400 héros, 20 requêtes en parallèle, **≈ 630 requêtes/s** ; un combat (2 requêtes) prend 62 ms au p50, 78 ms au p95, 95 ms au p99 ; aucune erreur inattendue. La limite est l'écriture Postgres (un commit par action), pas le moteur.

Ordre de grandeur : un joueur actif envoie environ une action toutes les 5 à 10 secondes. Une instance et un Postgres modeste tiennent donc quelques milliers de joueurs simultanés.

## Ce qui grossit, et comment on le contient

| Donnée | Croissance | Garde-fou |
|---|---|---|
| `heroes.state` | 25 à 30 Kio en fin de partie (sac plein) | sac borné (`bagCapacity`), chronique et événements jamais stockés |
| `action_log` | une ligne par action | purgé après 30 jours par `/api/cron/maintenance` (chaque jour, 04:17 UTC), index `action_log_created_idx` |
| `sessions` | une par connexion | sessions expirées purgées par la même tâche, index `sessions_expires_idx` |
| classements | lus à chaque visite | `boardCache` : 30 s de cache par instance, une seule requête partagée pendant ce temps |
| limiteur de débit | une entrée par compte | en mémoire, vidé au-delà de 50 000 comptes |

## Les prochains paliers

1. **Plusieurs instances.** Le limiteur et le cache de classement sont par instance : c'est acceptable (le limiteur reste efficace contre un clic-bot, le cache reste frais à 30 s près). Pour un limiteur global, passer à Redis/Upstash avec la même interface `RateLimiter.take`.
2. **Postgres à saturation.** Dans l'ordre : pooler (PgBouncer, déjà compatible : `prepare: false`), `synchronous_commit = off` pour la seule insertion dans `action_log` (perdre la dernière seconde de journal est acceptable, pas la sauvegarde), puis réplica en lecture pour les classements.
3. **Notifications push.** `pushTargets` lit l'état complet de chaque héros abonné. Au-delà de quelques milliers d'abonnés, stocker `energyFullAt` dans une colonne au moment de la sauvegarde et filtrer en SQL.
4. **Sauvegardes plus lourdes.** Si un état dépasse ~100 Kio (nouveaux systèmes), compresser l'historique (`counters`, pouvoirs du cube) ou le sortir dans une table à part.

## Rejouer les mesures

```bash
pnpm simulate:bench 2000
DATABASE_URL=postgres://textrpg:textrpg@localhost:5432/textrpg_test pnpm simulate:load 400 10 20
```

`simulate:load` crée des comptes invités jetables et refuse une URL qui contient « prod ».
