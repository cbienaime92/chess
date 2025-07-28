FROM node:18-alpine

WORKDIR /app

# Copier package.json
COPY package.json ./

# Installer les dépendances
RUN npm install --omit=dev

# Copier le code source
COPY . .

# Créer les dossiers nécessaires
RUN mkdir -p logs public

# Exposer le port
EXPOSE 3000

# Démarrer l'application
CMD ["npm", "start"]