# Étape 1 : Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances
RUN npm ci --only=production

# Copie du code source
COPY . .

# Étape 2 : Image finale (plus légère et sécurisée)
FROM node:20-alpine

# Création d'un utilisateur non-root (bonne pratique sécurité)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copie depuis l'étape de build
COPY --from=builder /app /app

# Changement de propriétaire
RUN chown -R appuser:appgroup /app

# Utilisation de l'utilisateur non-root
USER appuser

# Port exposé
EXPOSE 3000

# Variable d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3000

# Healthcheck (utile pour Docker et Kubernetes)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Commande de démarrage
CMD ["node", "server.js"]