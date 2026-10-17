# Direction artistique — *Nuit dorée*

> Un royaume la nuit, éclairé par l'or et le feu. Le joueur ouvre le jeu comme on pousse la porte
> d'une taverne : il fait sombre, ça brille là où c'est précieux, et chaque écran est une scène.

## 1. Les intentions

1. **Chaque écran est une scène.** Le titre, le camp, la chasse, les Profondeurs et chaque combat
   ont leur illustration : ciel, lune, château, forêt, feu, brume.
2. **L'or signale le précieux.** Les cadres dorés, les boutons d'or et les médaillons sont
   réservés à ce qui compte : l'action principale, le héros, le butin.
3. **Le feu et la lune donnent le ton.** La lune dorée par défaut, rouge les soirs de lune de
   sang et face aux boss. Le feu de camp vit (flammes, braises).
4. **Rien n'est figé.** Les étoiles scintillent, la brume dérive, les braises montent, la lune
   respire. Tout se fige si le joueur demande moins d'animations.

## 2. Illustrations

Toutes les images sont **dessinées en vectoriel** dans `apps/web/components/art/Scenes.tsx`, à
partir de calques réutilisables :

| Calque | Rôle |
|---|---|
| `Stars`, `Moon` (or, sang, pâle) | Le ciel, la lumière principale |
| `Castle`, `Pines`, montagnes | Les silhouettes du royaume |
| `Fog`, `Embers` | L'atmosphère en mouvement |
| `Fire` | Le feu de camp animé |
| `Wanderer` | Le héros de dos, cape rouge au vent |
| `Portrait` | Le buste du héros dans son médaillon, teinté par sa classe |

Scènes composées : `TitleScene`, `CampScene`, `FireArt`, `BloodMoonArt`, `CombatBackdrop`.
Avantages : quelques kilo-octets, nettes à toute taille, animables en CSS, et cohérentes entre
elles (même lune, même château, même lumière).

Les créatures sont les silhouettes de game-icons.net, éclairées comme des figures de théâtre
(contre-jour rouge, ombre portée, léger flottement) devant le décor de combat.

## 3. Couleurs

| Rôle | Valeur |
|---|---|
| Nuit (fond) | `#0b0d12` |
| Panneaux | `#161a23` → `#0d0f15` |
| Or (cadres, titres, action) | `#d4a24c`, clair `#f3d07a`, sombre `#8a6424` |
| Texte | `#ece2ca`, secondaire `#b9ad94`, discret `#7d7461` |
| Sang (PV, danger, lune de sang) | `#c4372b` / `#e8604f` |
| Énergie | `#3f74d8` / `#86a6f2` |

Raretés (à la Diablo) : Commun `#d6cfbf`, Magique `#7b97ff`, Rare `#f2d046`, Légendaire
`#ff8c2a`, Set `#3fd67a`, Ancestral `#ff5a4d`.

## 4. Typographie

- **Cinzel** : titres, noms, boutons, en capitales espacées. **Cinzel Decorative** pour les
  grandes célébrations (montée de niveau).
- **EB Garamond** : tout le texte et les chiffres (chiffres alignés).

## 5. Matières et composants

- **Cadre doré** : un seul cadre vectoriel à coins ornés, étiré par `border-image`
  (`--frame-gold`, `--frame-blood` pour les événements).
- **Boutons** : l'action principale est un lingot d'or (dégradé, reflet qui passe au survol) ;
  les autres sont en acier sombre cerclé d'or, toujours avec une icône.
- **Médaillons** : le portrait du héros dans un double anneau d'or ; les icônes de lieux dans des
  sceaux ronds.
- **Jauges** : rouge pour la vie, bleu pour l'énergie, avec un reflet et le chiffre au centre.
- **Bannières** : l'illustration de la page passe derrière le titre et se fond dans la nuit.

## 6. Mise en page

- Mobile : barre du haut avec portrait, nom, niveau, jauges et bourse ; onglets en bas avec un
  losange doré sur l'onglet actif ; raccourcis flottants (Carte, Quêtes, Inventaire) sur la scène
  du camp.
- Desktop : trois colonnes alignées sur la barre du haut (navigation | page | chronique).
- Marges : 16 px sur téléphone, 28 px dès la tablette ; aucune page ne doit être plus large que
  l'écran (vérifié par les tests e2e).

## 7. Mouvement

Scintillement des étoiles, respiration de la lune, dérive de la brume, flammes et braises,
bannière et cape au vent, parallaxe lente sur le titre, anneau de l'emblème qui tourne, reflet
sur les boutons d'or, monstre qui flotte, recul au coup, chiffres de dégâts qui s'envolent,
butin qui tombe et se retourne. Tout respecte « mouvement réduit ».
