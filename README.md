# Portfolio

Portfolio de développeur, entièrement configurable depuis un panneau d'administration caché.
Aucune modification de code n'est nécessaire pour le faire vivre — c'est l'objectif de conception principal.

**Vue 3 · TypeScript strict · Vite · Pinia · TailwindCSS · Express · SQLite**

---

## Démarrage rapide

```bash
npm install
npm run themes                          # génère les 22 thèmes
npm run hash -- "votreMotDePasse"       # génère vos secrets
# → collez la sortie dans .env (copiez d'abord .env.example)
npm run seed                            # données de démonstration (facultatif)
npm run dev
```

Le site est sur `http://localhost:3000`, l'administration sur `http://localhost:3000/admin-secret`.

### Production

```bash
npm run build
npm start
```

Ou avec Docker :

```bash
docker compose up -d --build
```

---

## Déploiement

### ⚠️ Choisir un hébergeur compatible

Toutes les données de ce portfolio vivent dans des **fichiers** : la base SQLite
(`data/portfolio.db`) et les images envoyées (`data/uploads/`). L'hébergeur doit donc
fournir un **stockage persistant**.

| Hébergeur | Compatible | Pourquoi |
|---|---|---|
| **Render** | ✅ | Disques persistants (`render.yaml` fourni) |
| **Railway**, **Fly.io** | ✅ | Volumes persistants |
| **VPS** (Hetzner, OVH, DigitalOcean…) | ✅ | Système de fichiers classique |
| **Vercel**, **Netlify Functions** | ❌ | Système de fichiers **éphémère et en lecture seule** |

> **Ne déployez pas sur Vercel en l'état.** Le code démarrerait sans erreur, puis
> la base serait réinitialisée à chaque déploiement et à chaque démarrage à froid :
> vos contenus, notes et commentaires disparaîtraient silencieusement.
>
> Pour utiliser Vercel malgré tout, il faudrait remplacer SQLite par une base distante.
> [Turso](https://turso.tech) est le chemin le plus court : c'est du SQLite accessible
> en HTTP, le SQL reste identique, seule la couche `server/database/db.ts` change.

### Render, pas à pas

1. Poussez le dépôt sur GitHub
2. Sur Render : **New → Web Service**, sélectionnez le dépôt.
   Le fichier `render.yaml` configure le reste automatiquement
3. Choisissez un plan **payant** : le plan gratuit ne permet pas les disques persistants
4. Générez vos secrets en local :
   ```bash
   npm run hash -- "votreMotDePasseSolide"
   ```
5. Dans **Environment**, saisissez :

   | Variable | Valeur |
   |---|---|
   | `ADMIN_PASSWORD_HASH` | le hash produit à l'étape 4 |
   | `ADMIN_PATH` | un chemin à vous, ex. `/atelier-prive` |
   | `VITE_ADMIN_PATH` | la même valeur |

   `JWT_SECRET` et `VISITOR_SALT` sont générés par Render.

6. Déployez, puis connectez-vous à `votre-site.com/atelier-prive`

### Après le premier déploiement

- Le portfolio démarre **vide**, avec les textes par défaut. `npm run seed` n'insère que
  des données de démonstration : ne le lancez pas en production
- Renseignez vos contenus depuis l'administration
- Faites un export (*Contenu → Sauvegarde*) et **conservez-le ailleurs que sur le serveur**

---

## Publier le code sur GitHub

Le dépôt peut être public sans risque pour votre site en ligne : **personne ne peut pousser
sur votre dépôt ni toucher à votre déploiement sans votre autorisation.** Les autres peuvent
lire, forker et proposer des pull requests — que vous seul validez. Un seul dépôt suffit,
inutile d'en maintenir deux.

Ce qui doit rester privé est déjà exclu par `.gitignore` :

| Fichier | Pourquoi il ne doit jamais être publié |
|---|---|
| `.env` | Hash du mot de passe, secrets de session, chemin admin |
| `data/*.db` | Vos contenus, commentaires reçus et statistiques |
| `data/uploads/` | Vos images |
| `data/portfolio-data.json` | Contiendrait vos coordonnées réelles une fois personnalisé |

**Avant le premier `git push`, vérifiez :**

```bash
git ls-files | grep -E '^\.env$|\.db$|portfolio-data\.json'   # ne doit rien afficher
```

> Si un secret a déjà été poussé, le supprimer dans un commit suivant **ne suffit pas** :
> il reste lisible dans l'historique. Il faut le considérer comme compromis et le régénérer
> (`npm run hash`).

Le chemin admin est lu au démarrage depuis `ADMIN_PATH` et transmis au front par l'API :
vous pouvez donc le changer sans reconstruire, et il n'apparaît nulle part dans le code publié.

---

## Comment ça marche

### Un seul processus

Express sert l'API **et** le front. En développement, Vite tourne en middleware dans le même
processus : un seul port, un seul `npm run dev`, rechargement à chaud compris.
En production, Express sert `dist/client` et injecte les méta-tags SEO dans le HTML à chaque requête —
ce qui rend le référencement réellement pilotable depuis l'admin, y compris pour les robots
qui n'exécutent pas JavaScript.

### Le stockage, pensé pour durer

| Donnée | Stockage | Pourquoi |
|---|---|---|
| Contenu du portfolio | Un document JSON dans SQLite | Absorbe n'importe quelle forme future sans migration SQL |
| Vues, likes, notes, commentaires | Tables relationnelles | Il faut compter, dédupliquer et agréger |
| Thèmes | Fichiers JSON dans `data/designs/` | Ajoutables à la main, sans toucher au code |
| Fichiers envoyés | `data/uploads/` | Simple copie de dossier pour les sauvegarder |

Tout l'état tient dans le dossier `data/`. Le sauvegarder, c'est sauvegarder le site entier.

### Les thèmes

22 thèmes livrés. Un thème ne change **jamais** de composant ni de classe CSS : il réécrit
uniquement des variables CSS sur `:root`. Changer de thème est donc instantané, ne provoque
aucun re-render, et fonctionne sur des composants écrits bien après le thème.

Les 12 premiers alimentent la **rotation mensuelle** (janvier → *Neon Pulse*, février →
*Minimalist White*…). Les 10 autres sont disponibles à la sélection manuelle.
Le calendrier est modifiable dans l'admin, mois par mois.

Ajouter un 23ᵉ thème : déposez un JSON dans `data/designs/` en copiant la structure d'un
fichier existant. Il apparaît immédiatement dans l'admin.

### Les sections dynamiques

C'est la réponse à « et si dans huit ans je veux une section *Certifications* ? ».

Dans l'admin, vous décrivez des champs (`Nom`, `Organisme`, `Date`, `Lien`) et le système
en déduit **tout** : le formulaire de saisie, la validation, et l'affichage public.
Aucun développeur n'est requis. Un exemple est fourni dans les données de démonstration.

### Vues, notes et commentaires

La règle de visibilité est stricte et appliquée côté serveur :

| | Visiteur | Vous (admin) |
|---|---|---|
| Note moyenne en étoiles | ✅ visible | ✅ visible |
| Nombre de likes | ⚙️ optionnel (masqué par défaut) | ✅ visible |
| Nombre de vues | ❌ **jamais** | ✅ visible |
| Commentaires | ❌ **jamais** | ✅ visible |
| Messages de contact | ❌ **jamais** | ✅ visible |

Aucune route publique n'expose de vue ni de commentaire — ce n'est pas masqué en CSS,
la donnée ne quitte simplement pas le serveur.

**Une personne ne peut noter qu'une seule fois.** La garantie repose sur une contrainte
`UNIQUE` en base, pas sur du code applicatif contournable. Le visiteur est identifié par
un hachage anonyme (IP + navigateur + sel serveur) : aucune donnée personnelle n'est conservée
pour l'engagement.

---

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | Développement, Vite en middleware |
| `npm run build` | Vérification TypeScript + build de production |
| `npm start` | Serveur de production |
| `npm run seed` | Insère les données de démonstration |
| `npm run themes` | Régénère les 22 thèmes |
| `npm run hash -- "mdp"` | Génère hash bcrypt et secrets |
| `npm run backup` | Archive JSON horodatée (avec rotation) |
| `npm test` | Tests unitaires |

---

## Configuration

Copiez `.env.example` vers `.env`.

| Variable | Rôle |
|---|---|
| `PORT` | Port d'écoute |
| `ADMIN_PATH` | Chemin de l'admin. **Changez-le.** |
| `VITE_ADMIN_PATH` | Même valeur, pour le front |
| `ADMIN_PASSWORD_HASH` | Hash bcrypt (via `npm run hash`) |
| `JWT_SECRET` | Signature des sessions. Obligatoire en production |
| `VISITOR_SALT` | Sel d'anonymisation des visiteurs |
| `ADMIN_SECRET_QUESTION` / `_ANSWER` | 2FA simple, facultatif |
| `DATABASE_PATH` | Emplacement de la base |

> En production, le serveur **refuse de démarrer** sans `JWT_SECRET`. C'est volontaire :
> un secret par défaut en production serait une porte ouverte.

---

## Sécurité

- Mot de passe haché avec bcrypt (12 tours), jamais stocké en clair
- Blocage après 5 échecs de connexion pendant 15 minutes, par IP
- Session JWT en cookie `httpOnly` + `SameSite=strict`, 7 jours
- Messages d'erreur volontairement neutres : ils ne révèlent jamais *quoi* était faux
- Tout le HTML riche est assaini avec DOMPurify **à l'affichage**
- Uploads : extension **et** type MIME vérifiés, nom de fichier régénéré
- Helmet, CSP stricte en production, rate limiting global et par route
- Piège à robots (honeypot) sur le formulaire de contact

**Le chemin admin caché n'est pas une mesure de sécurité**, c'est du confort. La seule barrière
réelle est le mot de passe vérifié côté serveur : deviner l'URL ne donne accès qu'à un écran
de connexion.

---

## Accéder à l'administration

Aucun lien vers l'admin n'existe dans le site public. Trois façons d'y entrer :

1. Aller directement sur le chemin configuré (`/admin-secret` par défaut)
2. Taper `admin` au clavier depuis n'importe où sur la page d'accueil
3. Cliquer **cinq fois** sur la ligne de copyright, en bas de page

---

## Structure

```
├── server/            API Express
│   ├── routes/        auth · data · designs · engagement · upload · contact
│   ├── models/        Chargement, fusion et vue publique des données
│   └── database/      SQLite : schéma et accès
├── src/
│   ├── public/        Site visible par tous
│   ├── admin/         Panneau d'administration (chunk séparé, chargé à la demande)
│   ├── shared/        Types, moteur de thème, client API, assainissement
│   └── router/        Routes, dont l'admin au chemin configurable
├── data/
│   ├── designs/       Les 22 thèmes
│   ├── portfolio.db   Base SQLite
│   └── uploads/       Fichiers envoyés
└── scripts/           seed · themes · hash · backup
```

---

## Poids du bundle

Le code de l'admin est isolé dans son propre chunk et chargé uniquement à l'ouverture du
panneau. Un visiteur ne télécharge jamais l'administration.

| | Brut | Gzip |
|---|---|---|
| Site public (JS + CSS) | ~294 Ko | **~102 Ko** |
| Admin (à la demande) | ~70 Ko | ~20 Ko |

---

## Accessibilité

- Contrastes vérifiés sur les 22 thèmes
- Navigation clavier complète, focus toujours visible
- Lien d'évitement vers le contenu
- `prefers-reduced-motion` respecté : les animations sont neutralisées **sans** masquer le contenu
- Notation en `radiogroup`, barres de compétences en `meter`, retours en `aria-live`
- Feuille de style d'impression dédiée

---

## Faire évoluer

**Ajouter un champ à une section native** → une ligne dans `SCHEMAS`, dans
`src/admin/views/AdminPanel.vue`. Le formulaire et la validation en découlent.

**Ajouter un type de section** → rien à coder, passez par *Sections personnalisées* dans l'admin.

**Ajouter un thème** → un fichier JSON dans `data/designs/`.

**Ajouter une route API** → un fichier dans `server/routes/`, monté dans `server/index.ts`.
Pour une route protégée, utilisez `router.use('/admin', requireAuth)` — **avec le préfixe** :
sans lui, le garde intercepte aussi les requêtes des routeurs montés après.

---

## Sauvegardes

Trois niveaux, du plus léger au plus complet :

1. **Instantanés automatiques** — pris avant chaque modification importante, les 50 derniers
   sont conservés, restaurables en un clic depuis l'admin
2. **Export manuel** — un fichier JSON téléchargé depuis *Contenu → Sauvegarde*
3. **Archive planifiée** — `npm run backup` en tâche cron, avec rotation

Gardez au moins une copie **hors du serveur**. C'est la seule qui vous sauvera d'une panne
disque ou d'une erreur de manipulation.

---

## Contribuer

Les contributions sont bienvenues — corrections, nouveaux thèmes, améliorations
d'accessibilité. Voir [CONTRIBUTING.md](CONTRIBUTING.md).

Avant toute pull request :

```bash
npm run build   # vérification TypeScript + build
npm test        # tests unitaires
```

## Licence

[MIT](LICENSE) — utilisez, modifiez et redistribuez librement, y compris
commercialement. Aucune garantie n'est fournie.
