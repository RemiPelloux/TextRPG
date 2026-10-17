# Game design — version web

> Comment rendre TextRPG **addictif et jouable** sur téléphone, avec un loot à la **Diablo**,
> sans trahir l'idée d'origine : *un RPG de choix, rythmé par l'énergie, mystérieux et dangereux.*
> Tous les chiffres sont des **points de départ** à valider avec `tools/simulate`.

---

## 1. Les boucles de jeu

Un jeu addictif empile des boucles de durées différentes. Chacune doit offrir **une récompense claire**.

| Durée | Boucle | Récompense |
|---|---|---|
| **3 secondes** | Un tour de combat | Chiffres qui volent, critique doré, son d'impact |
| **30 secondes** | Un combat | Victoire, or, **un objet qui tombe**, la quête qui avance |
| **5 minutes** | Une session (dépenser son énergie) | Un objet meilleur ▲ à équiper, une montée de niveau |
| **1 jour** | Repos, marché, quêtes du jour, défi quotidien | De nouvelles occasions chaque jour |
| **1 semaine** | Boss de donjon hebdomadaire | Un butin garanti de rareté élevée |
| **Long terme** | Niveaux 1→20, Parangon, sets complets, Codex, succès | Le sentiment de construire son héros |

**La règle d'or :** quand le joueur ferme l'app, il doit **savoir ce qu'il fera en revenant**
(« encore 2 orcs pour la quête », « ma barre d'énergie sera pleine à 19 h », « il me manque les
gants du set »).

---

## 2. L'énergie : le cœur de l'idée d'origine

Elle rythme les sessions et empêche l'épuisement. C'est aussi ce qui fait revenir le joueur.

| Paramètre | Valeur de départ |
|---|---|
| Énergie max | 20 (+2 par niveau, comme aujourd'hui) |
| Régénération passive | 1 point toutes les 12 min (pleine en ≈ 4 h) |
| **Repos** (1 fois par jour) | Remplit PV et énergie au maximum |
| Coût d'une chasse | Facile 2 · Normal 3 · Difficile 5 · **Enfer 8** |
| Potion d'énergie | +5 (trouvable, jamais achetable avec de l'argent réel) |

- Le repos devient le **rituel du jour** (« Le feu de camp crépite. Tu te sens prêt. »).
- Sans énergie, on peut toujours **gérer** : inventaire, forge, marché, codex. On n'est jamais bloqué devant un écran vide.

---

## 3. Le combat

### Format
**Au tour par tour, semi-automatique**, pensé pour le pouce :
- 4 boutons : **Frapper** · **Compétence** (phase 6) · **Potion** · **Fuir** ;
- bouton **Auto** (et vitesse x2) pour les combats faciles : on garde le contrôle des combats importants et on ne s'ennuie pas sur les autres ;
- le **journal de combat** raconte l'action en texte, c'est l'ADN du TextRPG :
  > *Grakthor l'Orc lève sa hache rouillée…*
  > *Tu esquives et ripostes : **CRITIQUE !** 23 dégâts.*

### Formules (reprises et complétées depuis la v0.2)
```
initiative       : la vitesse la plus haute frappe en premier ; vitesse ≥ 2× l'adversaire → double attaque
dégâts           : max(1, round(force × rand(0.85, 1.15) − défense_cible × 0.5))
critique         : chance = min(50 %, chance_attaquant %) ; dégâts × 1.5 (+ bonus d'affixes)
esquive          : min(30 %, max(0, vitesse_défenseur − vitesse_attaquant) × 2 %)
fuite            : 50 % + (vitesse_joueur − vitesse_ennemi) × 5 %, bornée entre 10 % et 90 %
```

### Victoire et défaite
- **Victoire :** exp + or (selon niveau × difficulté), jet de butin, progression des quêtes.
- **Défaite :** le héros est ramené au camp avec 1 PV et perd 10 % de son or. **Jamais de mort définitive** hors donjon.
- **Difficulté visible** : chaque ennemi affiche un indicateur de menace (☠ à ☠☠☠☠) calculé à partir des taux de victoire simulés.

---

## 4. Le loot à la Diablo

C'est **le** moteur de l'addiction : une récompense **variable** et **lisible**. Chaque combat
peut donner quelque chose d'exceptionnel.

### Raretés
| Rareté | Couleur | Affixes | Particularité |
|---|---|---|---|
| **Commun** | gris parchemin | 0 | La base de l'objet |
| **Magique** | bleu | 1–2 | Nom composé : *« Épée **affûtée** de la **Célérité** »* |
| **Rare** | jaune | 3–4 | Nom généré en deux mots : *« Croc Funeste »*, *« Murmure de Cendre »* |
| **Légendaire** | orange | 2–3 + **pouvoir unique** | Nom et histoire fixes, change la façon de jouer |
| **Set** | vert | 2–3 + bonus de set | Bonus à 2 / 3 / 4 pièces portées |
| **Ancestral** | rouge sang | Légendaire aux valeurs maximales | Endgame : niveau 20+, très rare |

### Anatomie d'un objet
```
base        : Épée longue (dégâts 6–9, niveau requis 5)
ilvl        : niveau de l'objet = niveau de l'ennemi qui l'a lâché → borne les paliers d'affixes
affixes     : préfixe  « Affûtée »   → +12 % dégâts      (palier 2 sur 5)
              suffixe  « du Renard »  → +4 chance          (palier 1 sur 5)
amélioration: +0 … +10 à la forge
```
Les affixes sont des **données** (`content/data/affixes.json`) : nom, statistique, paliers par
`ilvl`, poids, types d'objets autorisés. On en ajoute sans toucher au code.

### Légendaires : changer la façon de jouer
Quelques exemples dans l'univers existant :
- **Demi-lame de la Lune** (l'arme de la v0.1 devient légendaire) : *« La nuit, tes critiques infligent +100 % de dégâts. »* (la nuit = l'heure réelle du joueur, côté serveur) ;
- **Anneau Mystérieux** : *« À chaque combat, une statistique au hasard est doublée. »* ;
- **Dents d'Orc enfilées** (collier) : *« +5 % de dégâts par orc tué aujourd'hui (max 50 %). »* ;
- **Cotte du Dernier Rempart** : *« Une fois par combat, survis à un coup mortel avec 1 PV. »*

### Sets
*« Panoplie du Chasseur de Lune »* — 4 pièces :
- 2 pièces : +10 % vitesse ;
- 3 pièces : les esquives déclenchent une contre-attaque ;
- 4 pièces : *Éclipse* — tous les 5 tours, ton attaque est un critique garanti.

### Le mystère : objets non identifiés
Fidèle au thème *« this is mysterious »* : les objets **Rares et plus** tombent **non identifiés**
(*« Épée longue inconnue »*, nom flou, affixes cachés `???`). On les identifie **d'un toucher**
(avec un parchemin bon marché ou à la forge). Ce moment de révélation, c'est le *« ouverture de pochette surprise »* de Diablo.

### Taux de butin (départ)
| Difficulté | Chance de butin | Magique | Rare | Légendaire |
|---|---|---|---|---|
| Facile | 35 % | 20 % | 3 % | 0,2 % |
| Normal | 50 % | 25 % | 6 % | 0,5 % |
| Difficile | 70 % | 30 % | 10 % | 1,2 % |
| **Enfer** | 100 % | 35 % | 18 % | 3 % |

- **Protection contre la malchance :** chaque combat sans légendaire augmente la chance de +0,1 % ; un légendaire la remet à zéro. Personne ne joue 2 semaines sans orange.
- **Loot intelligent :** 70 % des objets correspondent à la classe du héros (phase 6).
- **Objets de quête :** 10–20 % de chance si une quête active les demande (idée d'origine de la v0.1).

### La forge (le « cube » du jeu)
- **Améliorer** +1 → +10 (+10 % des bonus par niveau ; risque d'échec à partir de +5, sans destruction) ;
- **Identifier** ;
- **Recycler** un objet en **éclats** (selon sa rareté) ;
- **Relancer un affixe** contre des éclats (phase 2+) : le puits à ressources qui garde tout objet utile.

### Inventaire
- 24 emplacements (extensibles via le camp) : il faut faire des choix ;
- tri par rareté / type / niveau ; **vente en masse des communs** en un geste ;
- **comparaison automatique** : chaque objet affiche ▲ vert / ▼ rouge par rapport à l'équipement porté.

---

## 5. Progression

- **Niveaux 1 → 20** : la courbe actuelle (`100 × niveau` d'exp par niveau) est un point de départ ; elle deviendra légèrement exponentielle pour que le niveau 20 se mérite (≈ 2 semaines de jeu régulier).
- **Gains de niveau** : ceux de la v0.2 (+5 PV, +2 énergie, attributs aléatoires, bonus de chance), avec une **célébration** plein écran.
- **Parangon** (après le niveau 20) : chaque palier d'exp donne 1 point à placer (+1 % critique, +2 % PV, +1 % butin magique…). La progression ne s'arrête jamais.
- **Classes** au niveau 5 (phase 6) : *Guerrier*, *Rôdeur*, *Occultiste*.

---

## 6. Le monde

Le ton reste celui de la v0.1 : **mystérieux et dangereux**. Le joueur est seul, au bord d'un
monde qu'il ne comprend pas.

- **Le Camp** : le hub. Un feu, une forge, un marchand, un tableau de quêtes. Il s'agrandit au fil des investissements.
- **Les Terres de chasse** : l'entraînement de la v0.1, avec les 4 difficultés (*Facile · Normal · Difficile · Enfer*).
- **Les Profondeurs** : les donjons (phase 4).
- **Le bestiaire d'origine** est conservé : Orc, Gobelin, Squelette, Zombie, Démon, Dragon. Puis un nouveau type par acte.
- **Les ennemis élites** (5 %) ont un nom et 1–2 modificateurs (*Rapide*, *Vampirique*, *Enragé*) et un meilleur butin. C'est un clin d'œil aux champions de Diablo.

---

## 7. Rétention : faire revenir sans culpabiliser

| Mécanique | Détail |
|---|---|
| **Quêtes du jour** | 3 petites quêtes renouvelées à minuit (heure du joueur) |
| **Marché du jour** | 6 objets, dont parfois un Rare ; un seul exemplaire de chaque |
| **Défi quotidien** | Un donjon court, même graine pour tous, classement du jour |
| **Flamme de feu de camp** | Jours de connexion consécutifs → petit bonus d'éclats ; un jour manqué fait **baisser** la flamme d'un cran, **ne la remet pas à zéro** |
| **Boss hebdomadaire** | Garantit un objet Rare+, une fois par semaine |
| **Codex** | Bestiaire (ennemis vaincus, lore débloqué) et **collection** de tous les légendaires et sets : l'envie de compléter |
| **Succès** | *« Tuer un Dragon au niveau 3 »*, *« Identifier 100 objets »*, *« Survivre à l'Enfer avec 1 PV »* |
| **Notifications** | Opt-in, une par jour maximum, toujours utiles (« énergie pleine ») |

---

## 8. Addictif, mais honnête

Les règles qu'on s'impose :

1. **Pas de pay-to-win, pas de lootbox payante.** Si un jour il y a de la monétisation, elle sera cosmétique.
2. **L'énergie protège le joueur** autant qu'elle le fait revenir : on ne peut pas y passer 6 heures d'affilée.
3. **Pas de punition pour une absence** : la flamme diminue, elle ne s'éteint pas ; aucun événement qu'on « rate pour toujours ».
4. **Probabilités affichées** : les taux de butin sont consultables dans le Codex.
5. **Pas de faux compte à rebours**, pas de pression artificielle.

---

## 9. Premiers pas du joueur (onboarding)

| Temps | Ce qui se passe |
|---|---|
| 0 s | Écran titre sombre : *« This is mysterious. This is dangerous. »* → **Commencer** |
| 10 s | Choisir un nom (ou le nom généré), lancer les dés des statistiques avec une animation |
| 30 s | **Premier combat** guidé contre un gobelin : 3 bulles d'aide maximum |
| 60 s | **Le premier butin est garanti Magique** (bleu) : le joueur découvre le loot tout de suite |
| 2 min | Équiper l'objet → le ▲ vert, la statistique qui monte |
| 5 min | Première quête acceptée, premier niveau gagné |
| fin de session | *« Reviens quand ton énergie sera pleine (à 19 h 40). »* → invite à installer l'app / créer un compte |
