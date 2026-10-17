# Roadmap

```
2022           v0.1  FightingText — prototype Python dans un terminal
oct. 2026      v0.2  Renaissance — refonte Python, tests, documentation
oct. 2026  ✅  v1.0  Legend — jeu web complet, PWA, en ligne
               v1.1  Polish & Launch
               v1.2  Act II — Au-dessus
               v1.3  Seasons
               v2.0  Together
```

## ✅ v1.0 — *Legend* (fait)

Tout le plan des phases 0 à 7 de [docs/web/PLAN.md](web/PLAN.md) : moteur autoritaire, combat,
loot à la Diablo, donjons, pêche, Acte I, classes, talents, Parangon, défi quotidien,
classements, succès, codex, PWA, FR/EN. Le détail est dans le [CHANGELOG](../CHANGELOG.md).

## ✅ v1.1 — *Forge infinie* (fait)

Générateur d'objets (matières, qualité, provenance, pouvoirs générés, légendaires procéduraux),
sceaux dès le niveau 1, Cube (transmutation, enchantement, infusion, reforge, extraction),
tourments, pitié, sprint d'équilibrage mesuré par bots, montée en charge
([BALANCE](BALANCE.md), [SCALABILITY](SCALABILITY.md)), agents `balance-keeper` et `loot-smith`.

---

## v1.2 — *Polish & Launch*

Le jeu est complet. Cette version sert à le **faire jouer**.

- [ ] Déploiement public (Vercel + Neon), nom de domaine, page de présentation
- [ ] **Faire tester par 5 personnes** qui n'ont jamais vu le jeu ; noter où elles bloquent
- [ ] Tutoriel guidé du premier combat (3 bulles d'aide), premier butin garanti Magique
- [ ] Silhouettes SVG des ennemis derrière la scène de combat
- [ ] Musique d'ambiance par lieu (synthétisée, comme les effets)
- [ ] Animations de montée de niveau et de légendaire encore plus marquées
- [ ] Connexion Google / GitHub (en plus de l'e-mail)
- [ ] Lighthouse mobile ≥ 90 en CI ; page de statut
- [ ] Choix d'une licence (MIT si tu veux des contributions)

## v1.3 — *Act II : Au-dessus*

La fin de l'Acte I l'annonce : *« It is above. »*

- [ ] 10 nouveaux chapitres, un nouveau biome (les Flèches, une ville suspendue)
- [ ] 4 nouveaux ennemis, 2 boss, 8 légendaires, 1 set
- [ ] PNJ à dialogues à choix (réponses qui changent les récompenses)
- [ ] Gemmes à sertir (emplacements sur les objets Rares et plus)
- [ ] Recettes de forge : transmuter 3 objets Rares en 1 Légendaire aléatoire

## v1.4 — *Seasons*

- [ ] Saisons de 2 mois : nouveau héros saisonnier, classement saisonnier, récompenses cosmétiques
- [ ] Un modificateur de règles par saison (ex. « les critiques soignent », « double élites »)
- [ ] Boss de saison et poisson légendaire de saison
- [ ] Historique des classements (Hall of Fame)

## v2.0 — *Together*

- [ ] **Héros fantômes** : envoyer son héros explorer les Profondeurs d'un ami (asynchrone)
- [ ] **Guildes** légères : un feu de camp commun, un boss de guilde hebdomadaire
- [ ] Échange d'objets entre joueurs (contre or, avec taxe pour freiner l'inflation)
- [ ] Bot Discord : le même moteur, une autre interface

## Idées en réserve

| Idée | Pourquoi l'architecture le permet |
|---|---|
| Mods / packs de contenu | Le contenu est 100 % JSON validé : un pack = un dossier de fichiers |
| PNJ dialoguant via un LLM (optionnel) | Les quêtes sont des données, le narrateur est séparé du moteur |
| Mode hardcore (mort définitive) | Une option de partie, gérée dans `encounters.ts` |
| Application native (Capacitor) | La PWA fonctionne déjà hors ligne en consultation |
| Replays de combats partagés | Le moteur est déterministe : graine + actions = combat rejoué à l'identique |

## Principes (inchangés)

1. **Une version = une boucle jouable**, jamais de grande refonte qui bloque le jeu.
2. **La logique d'abord**, testée, puis l'écran.
3. **Le contenu est de la donnée.**
4. **Addictif mais honnête** : pas de pay-to-win, pas de punition pour une absence, probabilités affichées.
