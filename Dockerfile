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
COPY server ./server
COPY src/shared ./src/shared
COPY tsconfig.json ./

# La base et les fichiers envoyés doivent survivre au conteneur : ils vivent
# dans un volume, pas dans la couche d'image.
VOLUME ["/app/data"]

# On n'exécute pas en root : une faille dans l'app ne donne alors pas
# les pleins pouvoirs sur le conteneur.
RUN chown -R node:node /app
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=4s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npx", "tsx", "server/index.ts"]
