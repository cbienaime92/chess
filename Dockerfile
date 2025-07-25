# Utiliser l'image officielle Node.js (version LTS)
FROM node:18-alpine

# Définir le répertoire de travail dans le conteneur
WORKDIR /usr/src/app

# Copier les fichiers de configuration des dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install --omit=dev && npm cache clean --force
# Copier le reste du code de l'application
COPY . .

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Changer la propriété des fichiers
RUN chown -R nextjs:nodejs /usr/src/app
USER nextjs

# Exposer le port sur lequel l'application s'exécute
EXPOSE 3000

# Définir les variables d'environnement
ENV NODE_ENV=production
ENV PORT=3000

# Commande de santé pour vérifier que le conteneur fonctionne
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Commande pour démarrer l'application
CMD ["npm", "start"]
