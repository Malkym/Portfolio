# syntax=docker/dockerfile:1

# ---------- Étape 1 : build ----------
FROM node:22-bookworm-slim AS build

WORKDIR /app

# better-sqlite3 se compile nativement : il lui faut une chaîne de build.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run themes && npx vite build

# ---------- Étape 2 : exécution ----------
FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

# Seules les dépendances de production suivent : l'image finale ne contient
# ni compilateur, ni outillage de build.
COPY package*.json ./
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && npm ci --omit=dev \
    && apt-get purge -y python3 make g++ && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/* /root/.npm

COPY --from=build /app/dist ./dist
COPY --from=build /app/data/designs ./data/designs

# Contenu du portfolio, embarqué dans l'image pour que le site s'affiche
# rempli dès le premier démarrage, même sans stockage persistant.
#
# Placé HORS de /app/data volontairement : si un disque est monté à cet
# endroit, il masquerait tout fichier que l'image y aurait déposé.
# La syntaxe `.jso[n]` rend la copie facultative — le build ne casse pas
# quand le fichier n'existe pas.
COPY --from=build /app/data/portfolio-data.jso[n] /app/content/
ENV CONTENT_FILE=/app/content/portfolio-data.json
COPY server ./server
COPY src/shared ./src/shared
COPY tsconfig.json ./

# Pas de directive VOLUME : elle créerait un volume anonyme à chaque
# démarrage sur les hébergeurs qui n'en montent pas. Le montage est déclaré
# explicitement par l'orchestrateur (docker-compose.yml, disque Render).

# L'application tourne en utilisateur `node` : une faille ne donne alors pas
# les pleins pouvoirs sur le conteneur. Le passage en non-root se fait dans
# l'entrypoint et non ici, car il faut rester root le temps de corriger les
# droits du disque persistant, monté seulement au démarrage.
RUN chown -R node:node /app

# `COPY` puis `chmod` séparément : l'option `--chmod` exige BuildKit et
# échouerait sur un builder classique.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=4s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# `npm start` plutôt que `npx tsx` : npx irait chercher tsx sur le réseau à
# chaque démarrage s'il ne le trouvait pas localement — lenteur au boot et
# dépendance à une ressource externe. Ici tsx vient de node_modules.
CMD ["npm", "start"]
