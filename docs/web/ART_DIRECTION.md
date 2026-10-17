# Direction artistique — *Le Livre dont tu es le héros*

> TextRPG est un livre. Un livre-jeu des années 80 qu'on aurait retrouvé au grenier, annoté au
> crayon, avec sa feuille d'aventure tachée et ses gravures. On le lit, on y joue, on y écrit.

## 1. D'où vient l'âme

Le jeu s'appelle **TextRPG**. Il est né en 2022 dans un terminal, sous le nom de FightingText.
Sa devise parle à la deuxième personne : *« Le monde est mystérieux. Le monde est dangereux. Tu
as une épée. »* C'est exactement la voix des **livres dont vous êtes le héros** (Défis
Fantastiques, Loup Solitaire, la collection Folio Junior) : des paragraphes numérotés, une
feuille d'aventure à remplir, des gravures à la plume, une seule couleur d'imprimerie.

La direction artistique ne cherche donc pas à « faire fantasy ». Elle fait **livre**. Le mot est
le héros, le papier est le monde, l'encre est la seule lumière.

### Ce qu'on refuse (le style « généré »)
- L'or brillant partout, les lueurs, les dégradés néon, les halos derrière chaque icône.
- Les peintures de château au clair de lune, les héros de dos en cape, les visages générés.
- Les polices « épiques » lisses (Cinzel, Trajan), les capitales espacées sur tout.
- Les coins biseautés de jeu mobile, les boutons qui ressemblent à des lingots.
- Le noir bleuté uniforme qui rend tous les jeux identiques.

## 2. Les cinq signatures

1. **Le papier.** Un fond crème vieilli avec un grain fin et des bords légèrement plus sombres,
   comme une page manipulée. Jamais blanc, jamais pur.
2. **L'encre et le vermillon.** Tout est imprimé en encre brun-noir. Une seule couleur d'accent,
   le **vermillon** des rubriques médiévales et des livres-jeux : titres de section, dégâts,
   danger, lettrines. Les raretés d'objets sont des encres d'imprimerie, pas des néons.
3. **Les paragraphes numérotés.** La chronique est faite de paragraphes « § 214 ». Chaque coup,
   chaque butin a son numéro, comme dans un livre-jeu.
4. **La feuille d'aventure.** La fiche du héros est une feuille à remplir : cases, lignes
   pointillées, chiffres tapés à la machine.
5. **Les planches gravées.** Les créatures et les lieux sont des gravures sur bois (les icônes
   en aplat d'encre), encadrées et légendées : *Planche IV — Le Spectre*.

## 3. Couleurs

Deux éditions du même livre : **Papier** (par défaut) et **Veillée**, le même livre lu à la
bougie, pour la nuit. Toutes les couleurs sont des variables CSS dans `apps/web/app/globals.css`.

| Rôle | Papier | Veillée |
|---|---|---|
| Page (`--paper`) | `#ece3cf` | `#1a1612` |
| Encart, cases (`--paper-2`) | `#e3d8bf` | `#231e18` |
| Sélection, appui (`--paper-3`) | `#d6c8a8` | `#2e2820` |
| Encre (`--ink`) | `#211c16` | `#e9ddc4` |
| Encre secondaire (`--ink-2`) | `#4f4639` | `#b8ab8f` |
| Crayon, légendes (`--ink-3`) | `#857965` | `#857a66` |
| Filets (`--rule`) | `#b9aa8a` | `#3d362b` |
| **Vermillon** (`--red`) | `#b0361f` | `#e06a4c` |
| Énergie (`--blue`) | `#2a4a86` | `#8fa9e3` |

### Raretés : des encres d'imprimerie
Lisibles sur papier, reconnaissables en un coup d'œil, jamais lumineuses.

| Rareté | Papier | Veillée |
|---|---|---|
| Commun | `#3d352b` encre | `#d8cdb6` |
| Magique | `#2a4b8d` bleu de Prusse | `#8eaaf5` |
| Rare | `#8f5f0f` ocre | `#e0b04a` |
| Légendaire | `#b4471b` terre brûlée | `#f0884a` |
| Set | `#2c6a3d` vert de vessie | `#6cc487` |
| Ancestral | `#8b1d2c` sang-de-bœuf | `#f2646f` |

## 4. Typographie : trois voix

| Voix | Police | Usage |
|---|---|---|
| **Le graveur** | IM Fell English (et SC) | Titres, lettrines, noms d'objets et de créatures. Fontes gravées en 1670, encrage irrégulier : elles ont une main. |
| **Le livre** | EB Garamond | Tout le texte : récit, descriptions, chronique. Le caractère du livre français. |
| **La machine** | Courier Prime | Chiffres, statistiques, coûts, étiquettes système. La machine à écrire de la feuille d'aventure, et un clin d'œil au terminal de 2022. |

Règles :
- Corps de texte à 18 px, interlignage 1,5, lignes de 60 à 70 signes.
- Titres de page en IM Fell avec **lettrine vermillon**.
- Titres de section (« rubriques ») en IM Fell SC vermillon, suivis d'un filet.
- Les chiffres sont toujours en Courier Prime : on lit une fiche, pas une affiche.
- Pas de capitales espacées hors des petites étiquettes machine.

## 5. Ornements et matières

- **Filets** : simple filet d'encre, double filet pour les cadres importants (comme les encadrés
  d'imprimerie). Pas de coins coupés, pas d'ombres portées.
- **Fleurons** : ❦ et ✠ servent de séparateurs, avec parcimonie.
- **Hachures** : les barres de vie se remplissent de hachures d'encre ; les planches ont un fond
  hachuré léger, comme une gravure.
- **Cases** : les niveaux, les pièces de set et les points de talent sont des cases à cocher
  (☐ ☒), comme sur une feuille d'aventure.
- **Tampons** : les actions principales sont des tampons encreurs (texte en petites capitales
  dans un double cadre) ; au survol, l'encre remplit le tampon.

## 6. Mise en page : le livre ouvert

- **En-tête courant** (comme en haut d'une page imprimée) : le nom du héros, sa ligne
  d'endurance, sa bourse. Petites capitales et chiffres machine.
- **Desktop : trois colonnes comme un livre ouvert.**
  - À gauche, le **Sommaire**, avec ses points de conduite et ses numéros de page.
  - Au centre, la page.
  - À droite, les **notes en marge** : la chronique, en italique, avec ses numéros de paragraphe.
- **Mobile** : une page, des **onglets de livre** en bas (comme des signets).
- **Folio** en bas de chaque page.
- Marges généreuses : 16 px minimum sur téléphone, 28 px dès la tablette, une colonne de texte
  qui ne dépasse jamais 70 signes.

## 7. Images

Les icônes de game-icons.net sont des silhouettes pleines : imprimées en encre sur papier, elles
deviennent des **gravures sur bois**. On ne les met jamais dans un halo. Une créature est une
**planche** : cadre double, fond légèrement hachuré, légende en italique. Pas d'illustration
peinte, pas d'image générée.

## 8. Mouvement et son

- L'encre **apparaît** (le texte se dépose comme de l'encre qui sèche), elle ne glisse pas.
- Un coup reçu fait **trembler la page**, pas l'écran entier.
- Un butin rare se **découvre** : la carte se retourne, une seule fois.
- Respect de « mouvement réduit » : tout devient instantané.

## 9. La voix

Deuxième personne, phrases courtes, présent. Le jeu parle comme le narrateur d'un livre-jeu :
« Tu entres. Il fait froid. Rends-toi au § 12. » Les boutons sont des verbes à l'infinitif
(Chasser, Se reposer, Garder), jamais « Valider ».

## 10. Accessibilité

- Contraste du texte ≥ 7:1 sur papier (encre `#211c16` sur `#ece3cf`), ≥ 4,5:1 partout ailleurs.
- La rareté n'est jamais portée par la couleur seule : le nom de la rareté est toujours écrit.
- Mode contraste élevé : papier plus clair, encre noire, filets plus épais.
- Les tailles de texte (100 / 115 / 130 %) agrandissent tout, y compris les chiffres.
