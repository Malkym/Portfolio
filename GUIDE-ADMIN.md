# Guide d'utilisation de l'administration

Ce guide s'adresse à la personne qui gère le portfolio au quotidien.
Aucune connaissance technique n'est nécessaire.

---

## 1. Se connecter

L'administration n'apparaît nulle part sur le site public. Pour y accéder :

- **Le plus simple** : allez sur `votre-site.com/admin-secret`
- **Sans retenir l'adresse** : sur la page d'accueil, tapez `admin` au clavier
- **Sur téléphone** : cliquez cinq fois de suite sur la ligne « © 2026 … » en bas de page

Saisissez votre mot de passe. Vous restez connecté sept jours.

> Après cinq mauvais mots de passe, l'accès est bloqué quinze minutes. C'est normal, cela
> protège votre site. Attendez, puis réessayez.

---

## 2. Le tableau de bord

Premier écran après connexion. Il montre :

- **Vues totales** et visiteurs uniques — *vous seul les voyez*
- **Note moyenne** en étoiles — la seule chose que le public voit
- **J'aime** et nombre de commentaires
- La **courbe des visites** sur 30 jours
- Un encadré orange **À traiter** quand des commentaires ou messages vous attendent
- Le journal des dernières actions

---

## 3. Modifier vos contenus

### Textes uniques (nom, accroche, à propos, SEO…)

Menu **Contenu & réglages**. Les modifications s'enregistrent **automatiquement** une seconde
et demie après votre dernière frappe. L'indicateur en haut à droite affiche « À jour » quand
c'est fait. `Ctrl + S` force l'enregistrement immédiat.

### Listes (projets, expériences, formations…)

Chaque type a son entrée dans le menu de gauche.

- **Ajouter** : bouton « + Ajouter », remplissez, « Enregistrer »
- **Modifier** : bouton « Modifier » sur la ligne
- **Réordonner** : attrapez la poignée `⠿` et glissez
- **Masquer** : « Masquer » retire l'élément du site sans le supprimer
- **Supprimer** : deux options vous sont proposées
  - **Archiver** *(recommandé)* — retiré du site, données conservées, réversible
  - **Supprimer définitivement** — irréversible

> Préférez toujours l'archivage. Un instantané est pris avant chaque suppression définitive,
> mais l'archivage se défait en un clic.

---

## 4. Créer une nouvelle rubrique

C'est la fonction qui permet au portfolio de suivre votre carrière sans développeur.

**Exemple : ajouter une rubrique « Récompenses ».**

1. Menu **Sections perso.** → « + Nouvelle section »
2. Nom : `Récompenses`. L'identifiant d'URL se remplit tout seul
3. Choisissez une icône et un mode d'affichage (Cartes, Liste, Tableau…)
4. Définissez les champs. Pour chacun :
   - **Libellé** : ce que vous verrez dans le formulaire (ex. `Nom du prix`)
   - **Type** : texte, date, image, lien, note, oui/non…
   - **Rôle affiché** : comment le champ apparaît sur le site
     - *Titre de la carte* → en gros
     - *Sous-titre* → en couleur d'accent, sous le titre
     - *Image principale* → illustration
     - *Lien principal* → bouton en bas de carte
     - *Aucun* → affiché en petite information
   - **Requis** : coche si le champ est obligatoire
5. « Créer la section »

La rubrique apparaît aussitôt dans le menu de gauche **et** sur le portfolio public.
Cliquez sur « Gérer le contenu » pour y ajouter des éléments.

---

## 5. Changer l'apparence

Menu **Thèmes**. Vingt-deux thèmes sont disponibles.

### Choisir un thème

- **Aperçu** : applique le thème à l'écran d'administration pour juger des couleurs.
  Le site public n'est **pas** affecté
- **Appliquer** : c'est l'action qui change réellement le site public

> Appliquer un thème manuellement **désactive la rotation automatique**. Sinon votre choix
> serait écrasé au changement de mois.

### La rotation mensuelle

Le portfolio peut changer de thème tout seul selon le mois. Cochez « Activer la rotation »,
attribuez un thème à chaque mois, puis « Enregistrer le calendrier ». Le mois en cours est
signalé en bleu. Un mois laissé vide conserve le thème actif.

### Personnaliser

En bas de page, vous pouvez surcharger les couleurs du thème actif, régler la vitesse des
animations (ou les désactiver), et ajouter du CSS libre. « Réinitialiser » revient au thème d'origine.

---

## 6. Lire les retours des visiteurs

Menu **Retours visiteurs**. Deux onglets.

### Commentaires

Les visiteurs peuvent laisser un message sur votre portfolio. **Ils ne sont jamais affichés
publiquement** — ils n'existent que pour vous.

Si la modération est activée, chaque commentaire arrive « En attente ». Vous pouvez
l'**Approuver**, le **Rejeter** ou le **Supprimer**. Le statut ne change rien à l'affichage
public : il vous sert uniquement à faire le tri.

### Messages de contact

Les envois du formulaire de contact. Cliquez pour déplier ; le message passe en « lu ».
« Répondre » ouvre votre logiciel de messagerie avec le destinataire pré-rempli.

---

## 7. Régler l'engagement

Menu **Contenu & réglages** → onglet **Engagement**.

| Réglage | Effet |
|---|---|
| Notation par étoiles | Les visiteurs notent de 1 à 5. **Une seule fois, définitivement** |
| Bouton « J'aime » | Un like par visiteur, annulable |
| Afficher le compteur de likes | **Désactivé par défaut** : le visiteur ne voit pas le total |
| Commentaires | Les visiteurs écrivent, vous seul lisez |
| Modération préalable | Les nouveaux commentaires arrivent « En attente » |

Rappel : les **vues** et les **commentaires** ne sont jamais visibles publiquement, quels que
soient ces réglages. Seule la note moyenne en étoiles est publique.

---

## 8. Sauvegarder

Menu **Contenu & réglages** → onglet **Sauvegarde**.

- **Télécharger une sauvegarde** — un fichier JSON contenant tout votre portfolio.
  **Rangez-le ailleurs que sur le serveur** : c'est votre vraie assurance
- **Importer un fichier** — restaure une sauvegarde. Un instantané de sécurité est pris avant
- **Historique des versions** — les 50 derniers instantanés, pris automatiquement avant chaque
  modification importante. « Restaurer » revient à cet état

### À quelle fréquence ?

- Après chaque grosse mise à jour (nouveau projet, nouvelle rubrique)
- Au minimum une fois par trimestre
- Toujours **avant** d'importer une sauvegarde

---

## 9. Questions fréquentes

**J'ai modifié un texte mais le site n'a pas changé.**
Vérifiez l'indicateur en haut à droite : s'il affiche « Modifications en attente »,
appuyez sur `Ctrl + S`. Puis rechargez la page publique.

**Une section a disparu du site.**
Une section vide n'est pas affichée — c'est volontaire, pour ne pas laisser un trou dans la page.
Ajoutez-y au moins un élément, ou vérifiez qu'elle n'est pas « Masquée ».

**J'ai supprimé un projet par erreur.**
S'il a été *archivé*, il est encore là : réaffichez-le. S'il a été supprimé définitivement,
allez dans **Sauvegarde → Historique des versions** et restaurez l'instantané pris juste avant.

**J'ai oublié mon mot de passe.**
Il n'existe nulle part en clair, personne ne peut vous le rappeler. Il faut en générer un
nouveau en ligne de commande (`npm run hash -- "nouveauMotDePasse"`) et remplacer la ligne
`ADMIN_PASSWORD_HASH` du fichier `.env`, puis redémarrer le serveur.

**Le site affiche « Portfolio momentanément indisponible ».**
Le serveur ne répond pas. Vérifiez qu'il tourne toujours. Vos données ne sont pas perdues :
elles sont dans le dossier `data/`.

**Puis-je changer l'adresse de l'administration ?**
Oui : modifiez `ADMIN_PATH` et `VITE_ADMIN_PATH` dans le fichier `.env`, puis redémarrez.
C'est recommandé.
