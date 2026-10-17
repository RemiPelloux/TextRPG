# Contribuer

## Mise en place

```bash
pnpm install
pnpm db:up            # Postgres local (Docker) : bases textrpg et textrpg_test
cp apps/web/.env.example apps/web/.env.local
pnpm db:migrate
pnpm dev
```

Sans Docker, n'importe quel Postgres 16 convient : crée les bases `textrpg` et `textrpg_test`
et renseigne `DATABASE_URL`.

## Avant chaque commit

```bash
pnpm lint && pnpm format:check && pnpm typecheck
pnpm test             # contenu, moteur, interface
pnpm test:server      # demande Postgres
```

Et avant une version : `pnpm build && pnpm e2e`. La CI lance tout cela à chaque push.

## Règles

- **Le moteur reste pur** : pas d'accès réseau, pas de `Date.now()`, pas de `Math.random()` dans `packages/engine`. Le temps arrive par `now`, le hasard par `ctx.rng`.
- **Une règle de jeu = des tests** dans `packages/engine/test`. Un bug corrigé = un test de régression.
- **Le contenu est de la donnée** : objets, ennemis, quêtes et chiffres d'équilibrage vont dans `packages/content/data`. Après un changement d'équilibrage, regarde `pnpm simulate`.
- **Rien de secret côté client** : tout ce qui sort du serveur passe par `toClientView` / `redactEvents`.
- **Chaque texte de l'interface est traduit** dans `apps/web/messages/fr.json` et `en.json` (un test vérifie la parité).
- **Nouvelle icône** : `pnpm --filter @textrpg/web icons`.
- **Nouveau format de sauvegarde** : incrémente `SCHEMA_VERSION`, ajoute une migration dans `packages/engine/src/migrations.ts` et un test.
- **Nouvelle table** : modifie `packages/db/src/schema.ts`, puis `pnpm db:generate`.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/fr/) :

```
feat(combat): add a parry skill for warriors
fix(loot): never roll two affixes on the same stat
docs(deploy): explain push notification setup
```
