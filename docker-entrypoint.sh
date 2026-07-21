#!/bin/sh
set -e

# Point d'entrée du conteneur.
#
# Un disque persistant (Render, Fly.io, volume Docker) est monté APRÈS la
# construction de l'image, et appartient à root. Un conteneur qui tourne en
# utilisateur non privilégié ne peut donc pas y écrire : la base SQLite échoue
# à la création avec « EACCES: permission denied ».
#
# On répare les droits en root — la seule opération qui l'exige — puis on
# abandonne les privilèges pour exécuter l'application en tant que `node`.

DATA_DIR="${DATA_DIR:-/app/data}"

if [ "$(id -u)" = "0" ]; then
  mkdir -p "$DATA_DIR"
  chown -R node:node "$DATA_DIR"

  # `exec` remplace le shell par le processus applicatif : les signaux
  # d'arrêt de l'orchestrateur lui parviennent directement, ce qui permet
  # un arrêt propre plutôt qu'un SIGKILL après expiration du délai.
  exec setpriv --reuid=node --regid=node --init-groups "$@"
fi

# Déjà non-root (plateforme qui impose son propre utilisateur) : on ne peut
# ni ne doit tenter de changer les droits, on démarre directement.
exec "$@"
