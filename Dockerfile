# Dockerfile avec Stockfish binaire
FROM node:18-alpine

# Installer wget et les dépendances nécessaires
RUN apk add --no-cache wget

# Télécharger et installer Stockfish
RUN wget -O /tmp/stockfish.tar.gz https://github.com/official-stockfish/Stockfish/releases/download/sf_17.1/stockfish-ubuntu-x86-64-avx2.tar \
    && tar -xf /tmp/stockfish.tar.gz -C /tmp \
    && mv /tmp/stockfish/stockfish-ubuntu-x86-64-avx2 /usr/local/bin/stockfish \
    && chmod +x /usr/local/bin/stockfish \
    && rm -rf /tmp/stockfish* \
    && apk del wget

# Créer le répertoire de travail
WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances Node.js
RUN npm install --omit=dev

# Copier le code source
COPY . .

# Exposer le port
EXPOSE 3000

# Définir la variable d'environnement pour le chemin Stockfish
ENV STOCKFISH_PATH=/usr/local/bin/stockfish

# Démarrer l'application
CMD ["node", "server.js"]