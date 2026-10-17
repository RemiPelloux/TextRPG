# Mettre TextRPG en ligne

Recommandé : **Vercel** (l'application Next.js) + **Neon** (Postgres). Les deux ont une offre
gratuite largement suffisante pour commencer.

## 1. La base de données (Neon)

1. Crée un projet sur [neon.tech](https://neon.tech), région proche de tes joueurs.
2. Copie l'URL de connexion **poolée** (celle qui contient `-pooler`), par exemple :
   `postgres://user:pass@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require`

Le client est configuré avec `prepare: false`, ce qui le rend compatible avec les poolers
(Neon, Supabase, PgBouncer).

## 2. L'application (Vercel)

1. Importe le dépôt GitHub sur [vercel.com](https://vercel.com).
2. Laisse le **Root Directory** à la racine du dépôt : `vercel.json` y décrit l'installation, le build et le cron.
3. Variables d'environnement :

| Variable | Obligatoire | Rôle |
|---|---|---|
| `DATABASE_URL` | oui | URL Postgres poolée |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | non | Notifications push (clé publique) |
| `VAPID_PRIVATE_KEY` | non | Notifications push (clé privée) |
| `VAPID_SUBJECT` | non | `mailto:toi@exemple.com` |
| `CRON_SECRET` | non | Protège `/api/cron/notify` (Vercel l'envoie automatiquement aux crons) |

4. Déploie. La commande de build (`pnpm db:migrate && pnpm build`) **applique les migrations** avant de construire : la base est toujours à jour.

## 3. Notifications push (optionnel)

```bash
npx web-push generate-vapid-keys
```

Renseigne les trois variables `VAPID`, puis `CRON_SECRET`. Le cron de `vercel.json` appelle
`/api/cron/notify`, qui prévient les joueurs abonnés dont l'énergie est pleine (une fois par
20 heures au maximum).

- L'offre gratuite de Vercel limite les crons à **un par jour** (17 h UTC par défaut). Avec l'offre Pro, passe le `schedule` à `*/30 * * * *`.
- Sur iOS, les notifications web ne fonctionnent que si le jeu est **installé** sur l'écran d'accueil (iOS 16.4+).

## 4. Domaine et PWA

Ajoute ton domaine dans Vercel. HTTPS est obligatoire pour le service worker et l'installation ;
Vercel le fournit automatiquement.

## Héberger ailleurs

N'importe quel hébergeur Node 22 convient :

```bash
pnpm install --frozen-lockfile
DATABASE_URL=... pnpm db:migrate
pnpm build
DATABASE_URL=... pnpm start      # port 3000
```

Le cron est un simple `GET /api/cron/notify` avec l'en-tête `Authorization: Bearer $CRON_SECRET`,
à appeler depuis n'importe quel planificateur.

## Exploitation

- **Sauvegardes** : Neon garde un historique (point-in-time restore). Chaque héros est un document JSONB versionné (`schemaVersion`) : les migrations de format vivent dans `packages/engine/src/migrations.ts`.
- **Journal d'actions** : `action_log` garde les dernières actions de chaque héros pour le support et la détection d'abus. Purge recommandée à 30 jours (`pruneActionLog`).
- **Limitation de débit** : en mémoire, par instance. Pour plusieurs instances très chargées, remplace `RateLimiter` par un stockage partagé (Redis/Upstash).
