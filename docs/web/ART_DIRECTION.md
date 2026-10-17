# Direction artistique — *Grimoire sombre*

> Un RPG qui se **lit** comme un vieux grimoire et se **joue** comme une app moderne.
> Le texte reste au premier plan (c'est un TextRPG), mis en valeur par la lumière, la typographie
> et les couleurs du loot à la Diablo.

---

## 1. Les intentions

1. **Le texte est le héros.** Le journal de combat, les descriptions d'objets et le lore sont soignés, lisibles, rythmés. Aucune illustration ne vole la vedette aux mots.
2. **L'obscurité fait ressortir la lumière.** Fond d'encre très sombre ; ce qui compte brille : l'or, les critiques, les objets rares.
3. **La couleur a un sens.** Le jaune ne sert qu'aux objets Rares, l'orange aux Légendaires. Le joueur apprend ces codes en 5 minutes, et un éclat orange suffit à faire battre son cœur.
4. **Chaque action répond.** Toute interaction a un retour visuel, sonore ou haptique en moins de 100 ms.

---

## 2. Couleurs

Définies comme variables CSS (Tailwind v4 `@theme`), donc modifiables en un seul endroit.

### Le monde
| Jeton | Valeur | Usage |
|---|---|---|
| `--ink-950` | `#0a0b10` | Fond de l'app |
| `--ink-900` | `#12141c` | Panneaux |
| `--ink-800` | `#1b1e29` | Cartes, champs, survol |
| `--ink-600` | `#343949` | Bordures, séparateurs |
| `--parchment` | `#e6dcc4` | Texte principal |
| `--parchment-dim` | `#a49b86` | Texte secondaire, descriptions |
| `--gold` | `#c9a24a` | Or, titres, éléments précieux, focus |
| `--ember` | `#e2703a` | Feu de camp, appels à l'action |
| `--blood` | `#b3261e` | PV, dégâts reçus, danger |
| `--mana` | `#3d6fd6` | Énergie |
| `--venom` | `#5fae4e` | Poison, soins |

### Les raretés (inspirées de Diablo, ajustées pour le contraste sur fond sombre)
| Rareté | Texte | Lueur / bordure |
|---|---|---|
| Commun | `#cfc8b8` | aucune |
| Magique | `#6f8dff` | bleu, discrète |
| Rare | `#f2d046` | jaune, douce |
| Légendaire | `#ff8c2a` | orange, **pulsation lente** |
| Set | `#3fd67a` | vert |
| Ancestral | `#ff4a3d` | rouge, pulsation + particules |

Toutes les couleurs de texte ont un contraste **≥ 4,5:1** sur `--ink-900` (WCAG AA). La rareté
est aussi indiquée par une **icône et un mot** (jamais par la couleur seule).

**Thème clair ?** Non : l'obscurité fait partie de l'identité du jeu. On propose à la place un
mode **« contraste élevé »**.

---

## 3. Typographie

| Rôle | Police (Google Fonts) | Usage |
|---|---|---|
| Titres, noms d'objets | **Cinzel** (600–700) | Capitales gravées : *SACRED SWORD*, écrans, boss |
| Récit, journal, descriptions | **Spectral** (400, italique) | Le ton « grimoire » : lisible et littéraire |
| Interface, chiffres | **Inter** (chiffres tabulaires) | Statistiques, prix, dégâts : alignés et nets |

- Taille de base de **17 px** sur mobile (le texte est le jeu) ; interligne 1,55.
- Le texte de saveur des objets est en *Spectral italique*, couleur `--parchment-dim`, entre guillemets.

---

## 4. Matières et textures

- **Fond** : très léger grain de papier (SVG `feTurbulence`, opacité 3 %) + vignettage sombre sur les bords.
- **Panneaux** : bordure fine `--ink-600`, coins à **encoches** (pas de coins arrondis « app SaaS ») réalisés en `clip-path`, ornement doré discret en haut des panneaux importants.
- **Icônes** : [game-icons.net](https://game-icons.net), monochromes, colorées par la rareté ; posées sur un **médaillon** sombre avec un liseré de la couleur de rareté.
- **Pas d'illustrations peintes au départ.** Plus tard, des silhouettes d'ennemis en ombre chinoise (un SVG par type) peuvent apparaître derrière le journal de combat.

---

## 5. Les écrans

### Combat — téléphone
```
┌─────────────────────────────────┐
│  ☠☠  GRAKTHOR L'ORC        Nv 4 │
│  ████████████░░░░░░  86 / 140   │  ← barre rouge, la partie perdue s'efface en douceur
│                                 │
│        ╭───────────────╮        │
│        │   (silhouette │        │  ← icône ennemi, tremble quand elle est touchée
│        │     d'orc)    │  -23!  │  ← chiffre qui flotte (doré = critique)
│        ╰───────────────╯        │
│ ─────────────────────────────── │
│ Grakthor lève sa hache rouillée…│  ← journal (Spectral), nouvelles lignes en fondu
│ Tu esquives et ripostes :       │
│ CRITIQUE ! 23 dégâts.           │
│ ─────────────────────────────── │
│ ARIA        ♥ 92/115  ⚡ 14/26  │
│ ┌──────────┐ ┌──────────┐       │
│ │ FRAPPER  │ │COMPÉTENCE│       │  ← gros boutons pour le pouce, en bas de l'écran
│ ├──────────┤ ├──────────┤       │
│ │ POTION ×3│ │  FUIR    │  AUTO │
│ └──────────┘ └──────────┘       │
├─────────────────────────────────┤
│  🔥Camp  ⚔Chasse  🛡Héros  🎒Sac  📜Quêtes │  ← navigation du bas
└─────────────────────────────────┘
```

### Fin de combat — le butin
```
┌─────────────────────────────────┐
│          ✦ VICTOIRE ✦           │
│      +48 exp   ████████░░ Nv 4  │
│      +17 or   (compteur qui défile)
│                                 │
│   ┃          ┃                  │  ← piliers de lumière de la couleur des objets
│ ┌─┸──┐    ┌──┸─┐                │
│ │ 🗡  │    │ ⚗  │                │  ← médaillons qui tombent l'un après l'autre
│ └────┘    └────┘                │
│ Épée longue   Potion ×1         │
│ inconnue ▲    (commune)         │
│ (Rare, jaune)                   │
│                                 │
│ [ IDENTIFIER ]  [ CONTINUER ]   │
└─────────────────────────────────┘
```

### Info-bulle d'objet (le cœur Diablo)
```
┌───────────────────────────────────┐
│  DEMI-LAME DE LA LUNE             │  ← Cinzel, orange, lueur pulsante
│  Épée légendaire · ilvl 12        │
│ ───────────────────────────────── │
│  14 – 19 dégâts                   │  ← Inter, gros
│  +7 Force                    ▲ +3 │  ← comparaison avec l'arme portée
│  +12 % Vitesse               ▲    │
│  +4 Chance                   ▼ −2 │
│ ───────────────────────────────── │
│  ✦ La nuit, tes coups critiques   │  ← pouvoir légendaire, orange
│    infligent +100 % de dégâts.    │
│ ───────────────────────────────── │
│  « Une lame antique. La légende   │  ← Spectral italique, texte de la v0.1
│    dit qu'elle fut forgée dans la │
│    pierre de lune. »              │
│                                   │
│  Niveau requis 7      Vente 125 ◉ │
│  [ ÉQUIPER ]  [ COMPARER ]  [ … ] │
└───────────────────────────────────┘
```
- Mobile : ouverte en *bottom sheet* au toucher. Desktop : au survol, à côté du curseur.
- Les affixes non identifiés s'affichent `??? ???` avec un léger flou animé.

### Héros — poupée d'équipement
```
        ┌────┐
        │ ⛑  │ Tête
 ┌────┐ ├────┤ ┌────┐
 │ 🗡  │ │ 🛡  │ │ 💍 │     Arme · Armure · Accessoire
 └────┘ └────┘ └────┘     (+ emplacements débloqués : gants, bottes, amulette…)
  Force 24 ▲   Défense 18   Vitesse 11   Chance 9
  Bonus de set (2/4) : +10 % vitesse
```

### Desktop (> 1024 px)
```
┌───────────────┬──────────────────────────────┬────────────────┐
│ FICHE HÉROS   │        SCÈNE                 │ JOURNAL        │
│ Aria  Nv 4    │  (combat, camp, marché…)     │ ou INVENTAIRE  │
│ ♥ ⚡ attributs│                              │ (onglets)      │
│ équipement    │  raccourcis : 1-4, A, Espace │                │
└───────────────┴──────────────────────────────┴────────────────┘
```

---

## 6. Mouvement : le *game feel*

Animations avec **Motion** ; durée courte, effets francs.

| Moment | Effet |
|---|---|
| Coup porté | L'ennemi recule de 4 px, flash blanc de 80 ms, chiffre qui monte et s'efface |
| **Critique** | Chiffre doré plus gros, **tremblement de l'écran** 150 ms, vibration courte (Android) |
| Esquive | Texte *« Esquivé »* qui glisse de côté |
| PV qui baissent | La barre baisse tout de suite ; une « barre fantôme » claire la suit avec 400 ms de retard |
| Butin | Les médaillons tombent avec un léger rebond, décalés de 120 ms |
| **Légendaire** | Ralenti : pilier orange, 0,8 s de suspense, le médaillon se retourne comme une carte, son dédié |
| Identification | Les `???` se dissipent lettre par lettre |
| Montée de niveau | Plein écran : halo doré, gains de statistiques qui apparaissent un par un |
| Or | Compteur qui défile, tintement |
| Énergie pleine | Le feu de camp s'anime au retour sur le Camp |

**`prefers-reduced-motion`** : aucun tremblement, aucun ralenti, uniquement des fondus. Un
réglage « Animations : complètes / réduites » existe aussi dans les options.

---

## 7. Son

- **Howler.js**, sons **Kenney** (CC0) : impacts, épées, pièces, potions, interface.
- **Un son par rareté** à l'apparition du butin : le joueur reconnaît un légendaire **les yeux fermés**.
- Ambiance discrète par lieu : feu de camp, vent des terres de chasse, gouttes des profondeurs.
- **Muet par défaut** jusqu'au premier geste (règle des navigateurs), puis mémorisé. Réglages séparés pour la musique et les effets.

---

## 8. Ton et écriture

- Garder l'esprit de la v0.1 : phrases courtes, inquiétantes, un brin d'ironie.
  > *This is mysterious. This is dangerous.* → *« Le monde est mystérieux. Le monde est dangereux. Tu as une épée. »*
- Descriptions d'objets : une phrase de saveur maximum. Réutiliser celles de la v0.1 (*« forged with moonstone »*, *« sacred by the kiss of the gods »*).
- Le journal de combat varie ses formulations (3–5 variantes par événement) pour ne jamais lasser.
- FR et EN écrits avec le même soin (next-intl) ; pas de traduction automatique brute.

---

## 9. Accessibilité

- Contraste AA partout ; rareté = couleur **+ icône + mot**.
- Navigation complète au clavier (desktop) et lecteur d'écran : le journal de combat est une région `aria-live="polite"`.
- Cibles tactiles ≥ 44 × 44 px ; actions principales dans la zone du pouce.
- Taille de texte réglable (100 / 115 / 130 %).
- Pas d'information transmise uniquement par le son.

---

## 10. Livrables design (avant de coder les écrans)

- [ ] Fichier de jetons (`theme.css`) : couleurs, typo, espacements, ombres, lueurs
- [ ] Planche de composants : `Button` (primaire, secondaire, danger), `Panel`, `HealthBar`, `EnergyBar`, `ItemMedallion`, `ItemTooltip`, `CombatLog`, `BottomNav`
- [ ] Maquette interactive de l'écran de combat et de l'écran de butin (mobile + desktop)
- [ ] Sélection des ~60 premières icônes game-icons.net (armes, armures, anneaux, potions, ennemis)
- [ ] Sélection des ~25 premiers sons
