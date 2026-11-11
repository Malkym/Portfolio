# Univers immersifs — mémoire de conception

> Document de travail tenu à jour pendant le brainstorming. Chaque décision
> confirmée est marquée **[confirmé]** ; les hypothèses à valider sont
> marquées **[hypothèse]**. La spec définitive sera écrite séparément une
> fois le design approuvé.

## Vision (mots du propriétaire)

Un univers immersif est **choisi** et **différent des ~20 thèmes visuels
existants** : il mélange un monde 3D explorable, une feuille de route et un
guide qui incarne le propriétaire.

- **10 univers** dont l'admin décide : activer ou non chacun, et choisir
  **l'univers par défaut**. [confirmé]
- Le visiteur **entre dans un monde** guidé par une **feuille de route**
  (parcours) et un **« mini moi »** (avatar du propriétaire) qui l'accompagne.
  [confirmé]
- Le visiteur **n'a rien à faire** pour vivre l'expérience, sauf :
  - changer le thème/univers en cours, parmi les 10 ; [confirmé]
  - utiliser les **touches de direction** pour revenir en arrière ou
    explorer « pour s'amuser ». [confirmé]

## Références inspirantes

| Référence | Ce qui inspire |
|---|---|
| https://gilleskpanou.tech/ | Section origins classiques + couche 3D WebGL Three.js |
| https://luidaniel.vercel.app/en/projects/este-portafolio | Robot guide : modélisation **Blender via scripts Python**, export **glTF Draco ≈ 0,8 Mo**, anim sur web **Three.js + GSAP** synchronisé avec le DOM ; la 3D reste hors du chemin critique du contenu |

Leçons du créateur du robot (à respecter chez nous) : animations réalisées
dans Blender (le web ne lit que des clips), compression Draco, la 3D ne doit
pas pénaliser la performance du contenu (LCP) ni l'accessibilité.

## Décisions prises

1. **Relation avec le site actuel** : **le monde EST l'accueil** [confirmé].
   La page racine devient l'expérience du monde (univers par défaut choisi
   en admin) ; l'accueil classique reste accessible par un lien direct
   (référé en : URL à décider, ex. `/portfolio`) pour les recruteurs, le
   référencement et la performance.

## Questions ouvertes [hypothèse]

2. **L'avatar « mini moi »** : **un seul modèle 3D low-poly, re-skin par
   univers** [confirmé]. Modélisé une fois (Blender → glTF Draco), puis
   recoloré/habilité par les paramètres de l'univers. Pas d'obligation de
   10 modèles distincts.
3. **Feuille de route** : **chemin visible dans le monde** [confirmé] ;
   l'avatar y avance d'étape en étape (héros → … → contact), HUD discret
   avec étape courante et progression.
4. **Premier lot** : **mécanique complète + 3 univers aboutis** [confirmé]
   (variantes par re-skin ; les 7 suivants s'ajoutent ensuite avec la même
   mécanique).
5. **Son** : **emplacement prévu dans le modèle, pas de son au lot 1**
   [confirmé] (0 Ko d'audio ; un fichier par univers activera l'ambiance
   plus tard).
6. **Secours technique** : **détection au démarrage** (WebGL, appareil,
   `prefers-reduced-motion`) **→ affichage automatique de l'accueil
   classique** si le monde ne peut pas s'éprouver confortablement
   [confirmé]. Affinement mobile (variante light) possible plus tard.

## Décisions d'intention (design)

- **Moteur** : **Three.js vanilla + GSAP**, univers déclaratifs en JSON de
  paramètres [confirmé] — même philosophie que les designs et thèmes CV ;
  aucune dépendance de framework 3D supplémentaire.

## Design (l'approuvative log par blocs)

### Bloc 1 — expérience & données [confirmé]

- **`/`** = le monde (univers par défaut de l'admin). Ouverture cinématique
  courte, avatar guide, **chemin automatique étape par étape** (héros →
  à propos → compétences → projets → expériences → formation → vitrine CV
  → contact). HUD : étape n°, nom, progression ; visiteur passif.
- **`/portfolio`** = accueil classique (l'actuel) pour recruteurs/SEO/
  fallback. Bouton discret dans le monde pour aller-retour.
- Le monde **relit exactement les données portfolio existantes** — aucune
  duplication de contenu.
- **Modèle univers (JSON)** : `id`, `name`, `enabled`, `palette`, `scene`
  (fog/lumières/terrain/props), `path` (waypoints auto), `avatar.skin`
  (couleurs/tenue), `audio.url` (null au lot 1), `thumb` (vignette).
  Stockées hors volume comme les thèmes CV (`data/univers/`), catalogue
  servi par une route dédiée.
- **3 univers du lot 1** : *Cité orbitale* (futuriste), *Circuit
  rétro-arcade*, *Jardin cyber-nature* — list à choisir et compléter.

### Bloc 2 — interactions [confirmé]

- **Flèches ← →** : étape précédente/suivante ; la marche de l'avatar est
  réelle le long du chemin (pas de téléportation), caméra qui suit,
  panneau de contenu à l'arrivée.
- **Voyage automatique** après l'intro (délai confortableentre étapes) ;
  **pausedez que le visiteur touche aux flèches** — la lecture manuelle
  prend le relais.
- **Échap** : replier tout panneau de contenu = vue paysage pure.
- **Switcher d'univers** : chip HUD (nom + vignette) ou touche `U` → grille
  des univers **actifs uniquement** ; bascule par fondu croisé (pas de
  noir long) ; **l'étape de lecture est conservée** au switch ;
  l'univers **défaut** (admin) charge sur `/` ; le choix visiteur persist
  en localStorage pour la session seulement.
- **Retour lisible** : chip « Accueil classique » (ou équivalent clavier)
  → `/portfolio`.

### Bloc 3 — perf, accessibilité, admin, tests [confirmé]

- **Perf** : Three.js + GSAP en chunk lazy (jamais sur `/portfolio`) ;
  cible moteur **≤ 250 ko gzip** (three + gsap + loaders Draco/GLTF, réel
  plutôt qu'optimiste) ; avatar **≤ 1,0 Mo** (glTF Draco) ;
  **HUD et panneaux = vrai DOM** rendus avant la 3D (jamais d'écran vide) ;
  décor instancié, géométries procédurales, DPR limité ≤ 2, rendu en pause
  si l'onglet est masqué.
- **Accessibilité** : flèches au clavier natif sans piège de focus ;
  `prefers-reduced-motion` → accueil classique ; contrastes via tokens de
  thème ; les étapes sont de vrais éléments titrés.
- **Admin** : onglet « Univers » (grille des 10) : activer/désactiver,
  choisir le défaut ; garde serveur : le défaut reste actif.
- **Tests** : unitaires (schéma, waypoints, API défaut/actifs) + E2E
  (monde à `/`, flèches, switcher actifs seulement, mémorisation session,
  fallback WebGL absent, admin toggle/défaut, accueil classique intact).

## État du processus

- Brainstorming (chantier architectural) en cours.
- Prochaine décision attendue : la relation monde ↔ accueil (question 1).
