# Générateur de CV — validation

## Périmètre

Référence : `CV_GENERATOR_IMPLEMENTATION_PLAN.md`. Réparation du générateur existant,
sans ajout des univers immersifs. Travail direct sans sous-agents ; modifications
préexistantes conservées. Les essais utilisent des données fictives, une base SQLite
et un dossier d'uploads temporaires sous `/tmp/opencode`.

## Mécanismes contrôlés

| Mécanisme | Couverture |
|---|---|
| Création et thèmes de départ | Création depuis un thème et sans thème ; chemin admin personnalisé |
| Dix types de sections | En-tête, profil, expérience, formation, compétences, projets, certifications, langues, publications, personnalisée |
| Édition | Champs structurés, TipTap, gras, compatibilité avec les anciens documents JSON TipTap |
| Organisation | Ajout, sélection, réordonnancement, activation/masquage et suppression ; commandes clavier en complément du glisser-déposer |
| Sauvegarde | Automatique, manuelle, réponse lente, erreur suivie d'une reprise, départ de l'éditeur et avertissement avant rechargement non sauvegardé |
| Synchronisation | Import du portfolio après confirmation, puis édition sans disparition des éléments importés |
| Images | Saisie d'URL, téléversement réel, conservation de la photo ; intégration des fichiers locaux dans le PDF |
| Thèmes | 30 choix, aperçu au survol sans modification du CV, sélection persistante, rendu de chaque thème |
| Publication | Consultation sans session admin, dépublication, exclusion des coordonnées et éléments masqués du JSON public |
| Vitrine d'accueil | La section « CV en ligne » de la page publique liste les CV publiés (`/api/cv/public`) : nom, rôle, bref aperçu (180 caractères max, sans e-mail ni téléphone), lien direct `/cv/{slug}` et PDF public ; l'entrée de navigation disparaît quand aucun CV n'est publié |
| PDF | Téléchargements administrateur et public ; six thèmes avec contrôle textuel et rasterisation |
| Sauvegarde JSON | Téléchargement, réimport réel et message d'erreur sur fichier invalide |
| Historique | Instantané avant écrasement, limite de 50 par CV sans supprimer les sauvegardes d'autres CV |
| API | Authentification, refus des types/listes invalides, conflit d'adresse publique |
| Métadonnées | Titre et description propres au CV, Open Graph et JSON-LD Person |
| Responsive | Contrôles à 1440 px et 390 px, absence de débordement horizontal, captures examinées |

## Causes corrigées

- La sauvegarde démontait l'éditeur : elle dispose maintenant d'un état séparé, et les
  requêtes sont séquencées pour ne pas écraser une saisie plus récente.
- Trois rendus divergents perdaient des contenus. `src/shared/utils/cvHTML.ts` fournit
  désormais le document à l'aperçu, au public et au service PDF.
- Le public lisait les listes à la mauvaise profondeur ; le PDF transformait certaines
  données en `[object Object]` et supprimait même les coordonnées du document administrateur.
- Les éléments importés sans indicateur `enabled` devenaient invisibles après édition.
- L'événement d'import JSON ne correspondait pas à son écouteur ; aucun succès n'est
  maintenant annoncé avant la réponse de l'enregistrement.
- La saisie directe d'une URL d'image modifiait une prop sans notifier son parent.
- Les instantanés étaient enregistrés dans la mauvaise table et leur rotation pouvait
  effacer l'historique d'un autre CV.
- Le chemin administrateur renvoyé au démarrage n'était pas réutilisé par les liens du CV.
- Les styles et plusieurs icônes n'étaient pas chargés sur un accès direct à l'éditeur.
- Les palettes pastel les moins contrastées rendaient les petits titres difficiles à lire :
  les encres textuelles sont ajustées, les couleurs d'accent sont conservées.
- L'image Docker ne livrait pas les thèmes CV ; ils sont désormais générés et copiés hors
  du volume de données. Le contexte Docker exclut aussi secrets, bases et uploads locaux.
- La transition de route (`mode="out-in"` dans `App.vue`) bloquait le montage des routes
  en import dynamique : « Voir le CV » et l'ouverture admin (raccourci « admin ») montraient
  un écran vide jusqu'au rafraîchissement. Le routeur n'est plus enveloppé dans une
  transition ; la comparaison avec/sans en a fait la preuve, couverte par E2E.

## Choix d'implémentation

- Une seule iframe de document, sans autorisation de scripts, remplace les nombreuses
  mini-iframes. La galerie utilise des aperçus typographiques légers ; le survol actualise
  le véritable aperçu. Cela évite le plafond qui laissait les thèmes suivants vides.
- TipTap émet du HTML pour conserver la compatibilité des champs existants ; l'import et
  le rendu acceptent aussi les documents JSON TipTap. Le texte enrichi est assaini côté
  navigateur et côté serveur avec une liste de balises autorisées.
- L'aperçu reste continu, alors que l'impression applique la pagination et les marges A4.
- Les contrôles du générateur sont adaptés au mobile ; le document public est réellement
  responsive plutôt qu'une page A4 réduite en texte minuscule.

## Reproduire les contrôles

```bash
npm test
npm run build
npm run test:cv
npm run test:cv:visual
```

La suite CV possède sa propre configuration `playwright.cv.config.ts` ; les autres
tests E2E existants ne sont pas exécutés par cette commande. Les captures ne contiennent
que la persona de test Camille Martin.

### Captures locales

- `/tmp/opencode/cv-admin-desktop.png`
- `/tmp/opencode/cv-admin-mobile.png`
- `/tmp/opencode/cv-public-desktop.png`
- `/tmp/opencode/cv-public-mobile.png`
- `/tmp/opencode/cv-board-capture.png` (vitrine « CV en ligne » de l'accueil)
- `/tmp/opencode/cv-visuals/30-themes.png`
- `/tmp/opencode/cv-visuals/*-pdf.png` et les six PDF correspondants

## Limites explicites

- La revue a été faite directement par l'auteur, sans revue indépendante, conformément
  à la consigne de ne pas employer de sous-agents.
- Les contrôles automatiques de contraste ne constituent pas un audit d'accessibilité complet.
- La synchronisation remplace les sections existantes après confirmation ; ce n'est pas
  une fusion bidirectionnelle. L'historique est en base, sans nouvel écran de restauration.
- Les anciens instantanés déjà enregistrés dans la table globale ne sont ni supprimés ni
  migrés automatiquement.
- Google Fonts et les images externes dépendent de leur disponibilité réseau. Les images
  locales sont intégrées au PDF ; des polices système servent de secours.
- Les sauvegardes simultanées depuis deux navigateurs ne sont pas fusionnées automatiquement.
- npm signale encore 25 vulnérabilités dans l'arbre des dépendances (2 faibles, 10 modérées,
  9 élevées, 4 critiques). Aucun `npm audit fix --force` ni migration hors périmètre n'a été appliqué.
