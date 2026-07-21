# Contribuer

Merci de l'intérêt porté à ce projet.

## Mise en route

```bash
npm install
npm run themes                     # génère les 22 thèmes
cp .env.example .env
npm run hash -- "motDePasseDeTest"  # collez la sortie dans .env
npm run seed                       # données de démonstration
npm run dev
```

## Avant d'ouvrir une pull request

```bash
npm run build   # TypeScript strict + build de production
npm test        # tests unitaires
```

Les deux doivent passer.

## Conventions

- **TypeScript strict.** Pas de `any` : préférez `unknown` avec un affinage de type
- **Composition API** uniquement, `<script setup>`
- **Commentaires en français**, et seulement quand ils expliquent *pourquoi* —
  un commentaire qui paraphrase le code est du bruit
- **Aucune couleur en dur** dans les composants : passez par les variables CSS
  (`var(--c-primary)`), sinon le composant casse sur 21 des 22 thèmes
- **Accessibilité** : navigation clavier, rôles ARIA pertinents, respect de
  `prefers-reduced-motion`

## Pièges connus

**Routes Express protégées** — utilisez toujours `router.use('/admin', requireAuth)`
**avec le préfixe**. Un `router.use(requireAuth)` sans chemin intercepte toute requête
traversant le routeur, y compris celles destinées aux routeurs montés après lui.

**HTML riche** — tout contenu affiché via `v-html` doit passer par `sanitizeHtml()`.
C'est du contenu saisi en administration, réinjecté dans chaque page vue par les visiteurs :
une balise non filtrée est une faille XSS persistante.

**Visibilité de l'engagement** — les vues et les commentaires ne doivent **jamais** être
exposés par une route publique. Cette règle est appliquée côté serveur, pas en CSS.

## Ajouter un thème

Copiez un fichier de `data/designs/`, changez `id` et les valeurs. Il apparaît
automatiquement dans l'administration. Vérifiez les contrastes : le texte doit rester
lisible sur `bg` **et** sur `surface`.

## Signaler une faille de sécurité

N'ouvrez pas d'issue publique. Contactez directement le mainteneur.
