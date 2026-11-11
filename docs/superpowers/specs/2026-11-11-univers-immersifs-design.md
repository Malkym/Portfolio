# Univers immersifs — spécification de design (lot 1)

**Date** : 2026-11-11 · **Statut** : approuvée par blocs en brainstorming, en attente de revue écrite
**Document mémoire** : [`docs/UNIVERS_IMMERSIFS.md`](../../UNIVERS_IMMERSIFS.md) (vision du propriétaire, décisions confirmées, références)

## 1. Vue d'ensemble

Le portfolio public de la page d'accueil devient une **expérience 3D guidée** :
le visiteur entre dans un **monde** (Three.js vanilla + GSAP), suit un **chemin
visible** dont les **étapes sont les sections du portfolio** (héros → à propos →
compétences → projets → expériences → formation → vitrine CV → contact), guidé
par un **avatar « mini moi »** low-poly qui marche de panneau en panneau.

Le visiteur est **passif** : le voyage avance tout seul. Il peut seulement :

- **changer d'univers** parmi ceux que l'admin a activés (switcher HUD ou
  touche `U`) ;
- **naviguer les étapes** aux touches fléchées (← précédente, → suivante) ;
- **aller-retour vers l'accueil classique** lisible.

Le lot 1 livre la **mécanique complète** (monde, avatar, chemin, HUD, switcher,
admin, fallback) **et 3 univers aboutis**. Les 7 suivants s'ajouteront par
re-skin de la même mécanique, sans nouveau code de moteur.

Contraintes non négociables : **une seule source de contenu** (les données
portfolio existantes), **contenu lisible et référencé toujours accessible**
(`/portfolio`), **performance protégée** (la 3D ne porte jamais le contenu),
**accessibilité équivalente** en mode réduit.

Références d'inspiration assumées : gilleskpanou.tech (structure + couche 3D)
et le robot de luidaniel.vercel.app (pipeline Blender → glTF Draco ≈ 0,8 Mo,
Three.js + GSAP, la 3D hors du chemin critique du contenu).

## 2. Vocabulaire

| Terme | Définition |
|---|---|
| **Univers** | Déclaration JSON complète d'un monde : palette, décor, chemin, peau d'avatar, vignette, slot audio |
| **Monde** | La scène 3D en cours de rendu, pilotée par le moteur et l'univers actif |
| **Étape** | Un arrêt du chemin correspondant à une section du portfolio, avec son panneau de contenu |
| **Chemin** | La suite visible de waypoints traversée par l'avatar |
| **Avatar** | Le « mini moi » : modèle glTF unique, re-skin par univers (couleurs/tenue) |
| **HUD** | Couche DOM au-dessus de la toile : chip d'univers, chip d'accueil, progression d'étape, boutons ‹ › |
| **Panneau** | Carte DOM au bord de l'écran montrant le contenu de l'étape (réutilise les composants de section existants) |
| **Switcher** | La grille des univers actifs ouverte depuis le HUD ou la touche `U` |

## 3. Routage et pages

| URL | Contenu | Notes |
|---|---|---|
| `/` | **WorldHome** (nouveau) : le monde, univers par défaut de l'admin | Le HUD + le premier panneau rendent **avant** la 3D (jamais d'écran vide) |
| `/portfolio` | **HomePage actuelle** (accueil classique), inchangée | Liens directs de recruteurs, SEO, fallback de détection ; catch-all `/…` renvoie désormais ici |
| `/cv/:slug` | Page publique du CV, inchangée | Atteinte depuis la vitrine du monde comme depuis l'accueil classique |
| `/admin-secret/…` | Admin, inchangé | Le raccourci clavier « admin » depuis le monde fonctionne (le monde se démonte proprement) |

- Le routeur déclare `home-world` sur `/` et `home-classic` sur
  `/portfolio` ; le catch-all existant passe de `redirect: '/'` à
  `redirect: '/portfolio'` (un lien mort mène à du contenu lisible, pas à une
  charge 3D).
- `syncAdminPath()` est inchangé : `/` et `/portfolio` correspondent à des
  routes connues, aucune requête supplémentaire.
- Le monde est un **composant de route lazy** distinct ; Three.js + GSAP sont
  importés dynamiquement **par lui**, jamais par `/portfolio`.

## 4. Modèle de données « univers »

Fichiers : `data/univers/<id>.json` + `data/univers/index.json` (ordre
d'affichage du catalogue). Chemin configurable par `UNIVERS_PATH`
(défaut `./data/univers`), **hors du volume Docker `/app/data`** (leçon des
thèmes CV : copiés à `/app/univers` dans l'image, `UNIVERS_PATH` fixé dans le
Dockerfile et l'entrypoint).

```jsonc
{
  "id": "futuristic",                       // slug unique, nom du fichier
  "name": "Cité orbitale",
  "tagline": "Ton portfolio vu d'une cité suspendue",
  "version": 1,
  "palette": {                              // mappe les tokens CSS existants
    "primary": "#7dd3fc", "surface": "#0b1220", "text": "#e2e8f0",
    "gradient": "linear-gradient(120deg, #38bdf8, #a78bfa)"
  },
  "scene": {
    "sky": { "top": "#0b1220", "bottom": "#1e3a5f" },   // dégradé shader simple
    "fog":  { "color": "#0b1220", "near": 12, "far": 60 },
    "terrain": "city",                      // générateur codé : city | arcade | garden
    "props": [ { "kind": "tour", "count": 24, "scale": [0.8, 2.2] } ]
  },
  "path": { "style": "luminous", "curvature": 0.35 },   // waypoints générés en code
  "avatar": { "skin": { "suit": "#38bdf8", "visor": "#f0f9ff", "emblem": "star" } },
  "audio":  { "url": null },                // slot prêt, muet au lot 1
  "thumb":  "thumbs/futuristic.webp"        // relatif à UNIVERS_PATH
}
```

- **Schéma validé** côté serveur **et** client par un zod partagé
  (`src/shared/univers/universeSchemas.ts`) : un fichier invalide est
  signalé (log + exclusion du catalogue), jamais servi brut.
- Terrain, props, chemin et waypoints sont **générés en code** à partir de
  ces paramètres (aucune lourdeur de modélisation au lot 1) ; l'avatar reste
  le seul asset 3D réel.
- Les thumbs sont générés au build (rendu hors ligne d'une scène type) et
  livrés avec le catalogue.

## 5. Catalogue et état côté serveur

- **Fichiers = définitions** (paramètres du monde). **État = réglages admin**,
  persistés dans la table `config` existante via `getConfig`/`setConfig`
  (patron identique au portfolio) sous la clé `universStates` :

```jsonc
{ "futuristic": { "enabled": true,  "isDefault": true },
  "arcade":     { "enabled": true,  "isDefault": false },
  "garden":     { "enabled": false, "isDefault": false } }
```

- **API publique** — `GET /api/univers/catalog` :

```jsonc
{ "defaultId": "futuristic",
  "universes": [ /* seulement les activés, ordre de index.json */
    { "id": "futuristic", "name": "Cité orbitale", "tagline": "…",
      "thumb": "/api/univers/thumb/futuristic", "params": { /* JSON complet */ } } ] }
```

- **API admin** (protégées par `requireAuth`, patron CV) :
  - `GET /api/admin/univers` — catalogue complet + états ;
  - `PATCH /api/admin/univers/:id` — corps `{ enabled?, isDefault? }`.
- **Gardes serveur** : impossible de désactiver l'univers par défaut ; définir
  `isDefault: true` active l'univers ; l'ancien défaut reste actif mais perd
  son statut ; `index.json` ne contient que des ids existants.
- **Miniatures** : `GET /api/univers/thumb/:id` (webp, cache long).

## 6. Moteur du monde (architecture front)

```
src/shared/univers/
  universeSchemas.ts      // zod partagé serveur/client
  universeTypes.ts        // types dérivés
  waypoints.ts            // 8 étapes → points du chemin (générateur)
  WorldEngine.ts          // scène, rendu, caméra, traversal, cross-fade, dispose
  avatarSkin.ts           // application des couleurs/tenue sur le glTF
  proceduralTerrain.ts    // city | arcade | garden (géométries générées)
src/public/views/WorldHome.vue   // route du monde : HUD, panneaux, cycle de vie
src/public/components/world/     // UniverseSwitcher.vue, StepPanel.vue, StepHud.vue
```

- **WorldEngine** (classe) : création/disposal complet (toile, resize,
  `InstancedMesh`, DPR ≤ 2, pause rendu onglet masqué) ; boucle `requestAnimationFrame`
  ; **cross-fade** de changement d'univers (fondu de la toile + réapplication
  palette/skin, sans noir long) ; **traversal** : timeline GSAP par hop
  (marche de l'avatar le long du chemin, caméra en suivi doux).
- **Panneaux = composants de section existants** (`HeroSection`,
  `AboutSection`, `SkillsSection`, `ProjectsSection`, `ExperienceSection`,
  `EducationSection`, `CvSection`, `ContactSection`) montés dans
  `StepPanel` avec les mêmes props que l'accueil — les tokens CSS de la
  palette d'univers écrasent les variables dans le conteneur du monde
  (aucun composant à réécrire).
- **Avatar** : un seul asset partagé, `data/univers/assets/avatar.glb`
  (Draco, servi par `GET /api/univers/avatar`) ; la peau par univers est
  appliquée par recoloration des matériaux (`avatarSkin.ts`).
- **Charge en parallèle** : catalogue JSON (rapide) + données portfolio
  (store existant) + chunk moteur (lazy). Les HUD et panneaux s'affichent
  dès que le catalogue et le contenu sont là ; la toile apparaît à son
  premier rendu (fondu d'entrée court).
- **Fallback** : à l'entrée sur `/`, détection WebGL (`getContext`), capacité
  d'appareil (`navigator.deviceMemory < 4` si exposé) et
  `navigator.connection.saveData`, et `prefers-reduced-motion` : si l'un
  quelconque empêche une expérience confortable →
  `router.replace('/portfolio')` immédiat (le visiteur ne voit jamais une
  toile cassée), avec bandeau explicatif sur l'accueil classique.
- **Cas limite** : si aucun univers activé et valide n'existe (catalogue
  vide ou fichiers cassés), `/` redirige vers `/portfolio` et l'admin
  affiche une alerte dans l'onglet « Univers » — le site reste toujours
  lisible, quel que soit l'état du catalogue.

## 7. Expérience du visiteur

1. **Entrée** : le HUD est visible tout de suite (chip d'univers, progression,
   chips ‹ › et accueil classique) ; le premier panneau (héros) s'affiche ;
   la toile se fond en place, l'avatar accueille (petit salut), la caméra
   planifie l'ouverture.
2. **Voyage automatique** : après l'ouverture, progression automatique
   étape par étape (délai confortable, ~6 s par étape par défaut) ; à chaque
   arrivée, le panneau de l'étape s'ouvre.
3. **Manuel** : toute touche fléchée **passe en mode manuel** (le voyage
   automatique se met en pause) ; ← revient à l'étape précédente, → avance ;
   l'avatar **marche** réellement le long du chemin dans les deux sens.
4. **Échap** : replie le panneau → vue paysage pure (juste être dans le
   monde) ; Échap à nouveau rouvre le panneau de l'étape courante.
5. **Switcher (`U` ou chip)** : grille des univers **activés seulement**
   (vignette, nom, tagline) ; bascule en fondu croisé, **l'étape courante est
   conservée** ; le choix visiteur vit en **`sessionStorage`** (`pf_universe`,
   session en cours seulement — le défaut admin s'impose à chaque nouvelle
   session) ; l'univers par défaut est marqué d'une étoile.
6. **Accès au mode lisible** : chip « Accueil classique » (équivalent
   clavier `L`) → `/portfolio` ; depuis cet accueil, un bouton discret
   « Entrer dans l'univers » renvoie à `/`.
7. **Tactile** (mobiles compatibles WebGL) : boutons HUD ‹ › pour changer
   d'étape, tap sur les chips = mêmes actions ; le monde reste **passif**
   (pas de joystick ni de drag au lot 1).

## 8. Performance (budgets et mécanismes)

| Élément | Budget / mécanisme |
|---|---|
| Chunk moteur (three + gsap + loaders) | **≤ 250 kB gzip**, importé uniquement par WorldHome |
| Avatar glTF | **≤ 1,0 Mo** (Draco) |
| Textures | **Aucune** au lot 1 (couleurs + matériaux simples) |
| Décor | `InstancedMesh` + géométries procédurales |
| Rendu | DPR ≤ 2 ; pause quand l'onglet est masqué ; disposal complet au démontage |
| LCP / contenu | HUD + panneau héros = **DOM avant la 3D** ; `/portfolio` ne charge jamais le moteur |
| Réseau catalogue | JSON complet des univers activés (quelques kB) ; thumbs en webp |

## 9. Accessibilité

- Canvas `aria-hidden` ; les panneaux sont de **vrais titres/texte** (le
  contenu reste lisible aux lecteurs d'écran et indexable).
- Clavier complet sans piège de focus : ←/→ étapes, `U` switcher, `L`
  accueil classique, Échap paysage ; l'ordre de focus reste naturel (HUD →
  panneau).
- `prefers-reduced-motion` → **accueil classique** (décision confirmée) ;
  l'accueil classique devient alors l'expérience par défaut de ces
  visiteurs, avec son contenu intégral.
- Contrastes HUD/panneaux : les tokens de palette passent le même contrôle
  de contraste que les thèmes existants (encres textuelles ajustées à
  l'ajout d'un univers).
- Message honnête en cas de redirection (bandeau sur `/portfolio` :
  « Version immersive non disponible sur cet appareil — voici le portfolio
  classique »), sans alarme.

## 10. Admin — onglet « Univers »

- Nouvelle entrée dans `AdminPanel` : grille du catalogue (les 10 visés) ;
  par univers : vignette, nom, tagline, **toggle activer/désactiver**,
  **action « Définir par défaut »** (radio/select), aperçu de la vignette
  en grand au clic.
- Requêtes `PATCH` avec messages d'erreur réutilisant le style CV (toast
  inline) ; la garde serveur (défaut non désactivable) est reflétée dans
  l'UI (toggle désactivé pour le défaut).
- Les univers du fichier absents de `index.json` ou invalides apparaissent
  en liste grisée avec la raison (transparent pour l'admin).

## 11. Les 3 univers du lot 1

| Univers | Ambiance | Terrain | Palette d'orientation |
|---|---|---|---|
| **Cité orbitale** (`futuristic`) | Cité suspendue, lumière froide, néons discrets, pont de lumière comme chemin | `city` : tours instanciées, plates-formes | Cieux sombres + accents cyan/blanc |
| **Circuit rétro-arcade** (`arcade`) | Piste synthwave, grilles néon, collines low-poly, jetons flottants | `arcade` : route néon, obstacles décoratifs | Magenta/violet/cyan sur nuit profonde |
| **Jardin cyber-nature** (`garden`) | Clairière organique, lucioles, chemin de pierres lumineuses, brume douce | `garden` : arbres stylisés, fleurs instanciées | Verts profonds + or doux |

Chacun est un **re-skin complet** : palette, terrain, props, chemin, peau
d'avatar, vignette. Aucun fichier de scène 3D par univers.

## 12. Sécurité

- Routes admin derrière `requireAuth` (patron CV) ; corps `PATCH` validés par
  zod (`enabled`/`isDefault` booléens) ; réponses d'erreur homogènes.
- Catalogue public en **lecture seule**, filtré serveur (les univers
  désactivés ne quittent jamais le serveur).
- Fichiers univers = fichiers locaux du dépôt (pas d'upload au lot 1) ;
  validation stricte à la charge, exclusion propre en cas d'erreur.
- Aucune donnée personnelle nouvelle ; l'expérience ne modifie pas la base
  au-delà des réglages d'univers.

## 13. Tests

**Unitaires (vitest)**

1. Schéma univers : fichier valide accepté ; champs manquants/types faux
   rejetés ; `audio.url: null` accepté.
2. Générateur de waypoints : 8 étapes ordonnées, héros en premier, contact
   en dernier, points espacés régulièrement.
3. Gardes d'état : le défaut ne peut pas être désactivé ; définir le défaut
   active l'univers ; l'ancien défaut perd son statut sans être désactivé.
4. Catalogue public : les désactivés sont exclus ; l'ordre suit
   `index.json` ; `defaultId` toujours présent dans la liste activée.

**E2E (playwright, serveur isolé sous `/tmp/opencode`, patron CV)**

5. `/` affiche le monde : HUD visible, panneau héros visible, toile présente.
6. Flèches : → avance d'étape (panneau suivant), ← revient ; le panneau suit
   l'étape ; mode automatique suspendu après la première flèche.
7. Switcher : `U` ouvre la grille ; un univers désactivé (via l'API admin)
   **n'apparaît pas** ; la bascule conserve l'étape courante.
8. Mémoire session : le choix visiteur survit au rechargement (même onglet)
   mais le défaut admin s'impose dans une nouvelle session.
9. Fallback : WebGL simulé absent → redirection `/portfolio` + bandeau.
10. Admin : toggle désactivation, définir défaut, garde du défaut (désactiver
    refusé), persistance après rechargement.
11. `/portfolio` intact (accueil classique complet, vitrine CV comprise) ;
    `/cv/:slug` inchangé.

## 14. Critères d'acceptation du lot 1

- [ ] `/` vit le monde avec l'univers par défaut, HUD + premier panneau
      affichés avant la 3D.
- [ ] Le voyage automatique déroule les 8 étapes sans aucune action.
- [ ] ←/→ contrôlent les étapes ; l'avatar marche réellement.
- [ ] `U` et la chip ouvrent le switcher ; seuls les univers actifs y sont ;
      l'étape est conservée à la bascule.
- [ ] Le visiteur ne touche à rien pour profiter du voyage (passif).
- [ ] Les 3 univers sont livrés, re-skin complet les uns des autres.
- [ ] `prefers-reduced-motion` ou WebGL absent → accueil classique direct.
- [ ] `/portfolio` est inchangé et performant (aucun code 3D chargé).
- [ ] L'onglet admin « Univers » gère activation, défaut, avec gardes.
- [ ] Budgets : moteur ≤ 250 kB gzip, avatar ≤ 1 Mo.
- [ ] Suites unitaires et E2E listées au §13 vertes.

## 15. Hors périmètre du lot 1

- Fichiers audio réels (le slot existe, muet) ; pistes par univers ensuite.
- Ressemblance exacte du propriétaire sur l'avatar (low-poly stylisé pour
  l'instant) ; sculpts plus riches plus tard.
- Univers 4 à 10 (mécanique prête à en recevoir par re-skin JSON).
- Variante light mobile du rendu (la détection renvoie à l'accueil classique
  en attendant) ; joystick/drag d'exploration libre.
- Traduction du switcher (site en français).
- Éditeur d'univers dans l'admin (gestion par toggles seulement ; les JSON
  restent des fichiers versionnés).
