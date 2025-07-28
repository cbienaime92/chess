# 🏁 Serveur d'Échecs Multijoueur

Application web d'échecs en temps réel pour 2 joueurs avec historique des coups et moteur IA intégré.

## ✨ Fonctionnalités

- 🎮 **Jeu d'échecs 2 joueurs** en temps réel via WebSocket
- 📜 **Historique complet** des coups avec notation algébrique
- 👥 **Mode spectateur** pour regarder les parties
- 🤖 **Moteur IA intégré** pour l'analyse de position
- 📈 **Suggestions de coups** via le moteur
- 📊 **Interface d'administration** pour surveiller les parties
- 🔄 **Reconnexion automatique** en cas de déconnexion
- ♛ **Orientation de l'échiquier** selon la couleur du joueur
- ⚡ **Mise à jour en temps réel** des deux côtés

## 🚀 Installation

### Prérequis
- Docker et Docker Compose

### Installation
```bash
# 1. Créer le projet
mkdir chess-server && cd chess-server
mkdir public

# 2. Copier les fichiers (voir structure ci-dessous)

# 3. Build et démarrage
docker-compose up --build

# 4. Accéder à l'application
# http://localhost:3000
```

### Commandes Docker utiles
```bash
# Démarrer en arrière-plan
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter
docker-compose down

# Reconstruire après modification
docker-compose up --build
```

## 📁 Structure du projet

```
chess-server/
├── server.js              # Serveur Express + Socket.io
├── chess-engine.js         # Moteur IA avec minimax
├── game-manager.js         # Gestionnaire des parties
├── package.json           # Dépendances npm
├── Dockerfile             # Image Docker (optionnel)
├── docker-compose.yml     # Orchestration (optionnel)
└── public/
    ├── index.html          # Interface de jeu
    └── admin.html          # Interface d'administration
```

## 🎯 Utilisation

### Créer une partie
1. Aller sur `http://localhost:3000`
2. Entrer votre nom
3. Laisser l'ID de partie vide (généré automatiquement)
4. Cliquer sur "Rejoindre la partie"
5. Partager l'ID avec votre adversaire

### Rejoindre une partie
1. Entrer l'ID de la partie fourni par l'autre joueur
2. Ou utiliser le lien direct : `http://localhost:3000/game/GAMEID`

### Interface d'administration
- Accéder à `http://localhost:3000/admin`
- Voir toutes les parties en cours
- Statistiques en temps réel
- Surveillance des connexions

## 🎮 Comment jouer

1. **Sélectionner une pièce** : Cliquer sur une de vos pièces
2. **Déplacer** : Cliquer sur la case de destination
3. **Tour** : Les joueurs alternent automatiquement
4. **Historique** : Visible en temps réel à droite
5. **Reconnexion** : Actualiser la page reconnecte automatiquement

## 🛠️ Développement

### Commandes Docker
```bash
docker-compose up --build    # Démarrer avec rebuild
docker-compose up -d         # Démarrer en arrière-plan
docker-compose logs -f       # Voir les logs en temps réel
docker-compose down          # Arrêter tous les services
```

### Modification du code
1. Modifier les fichiers source
2. Reconstruire : `docker-compose up --build`
3. Les changements sont appliqués

### Logs et debug
- Ouvrir la console du navigateur (F12)
- Logs détaillés côté serveur et client
- Suivi des coups et connexions en temps réel

### Architecture technique
- **Backend** : Node.js + Express + Socket.io
- **Frontend** : HTML/CSS/JavaScript vanilla
- **Moteur d'échecs** : Chess.js + IA minimax custom
- **Communication** : WebSocket en temps réel
- **Validation** : Côté serveur pour la sécurité

## 🔧 Configuration

### Variables d'environnement
```env
PORT=3000              # Port du serveur
NODE_ENV=production    # Environnement
```

### Moteur d'analyse IA
- Algorithme minimax avec élagage alpha-beta
- Évaluation basée sur les pièces et positions
- Analyse des parties terminées
- Suggestions de coups (via API)

## 🚨 Résolution de problèmes

### Le serveur ne démarre pas
```bash
# Vérifier Docker
docker --version
docker-compose --version

# Voir les logs d'erreur
docker-compose logs

# Nettoyer et reconstruire
docker-compose down
docker-compose up --build
```

### Les pièces ne bougent pas
- Vérifier les logs : `docker-compose logs -f`
- S'assurer que les deux joueurs sont connectés
- Actualiser la page pour reconnecter

### Problèmes de connexion
- Vérifier que le conteneur fonctionne : `docker-compose ps`
- Tester l'API : `http://localhost:3000/api/games`
- Redémarrer : `docker-compose restart`

## 📊 API REST

```bash
GET  /api/games                    # Liste toutes les parties
GET  /api/game/:gameId/analysis    # Analyse d'une partie
POST /api/analyze-position          # Analyser une position FEN
```

## 🎯 Prochaines améliorations

- [ ] **Jeu contre IA** avec niveaux de difficulté
- [ ] Chat entre joueurs
- [ ] Système de classement
- [ ] Parties privées avec mot de passe
- [ ] Sauvegarde des parties terminées
- [ ] Thèmes d'échiquier personnalisés
- [ ] Mode tournoi
- [ ] Application mobile

## 📄 Licence

MIT License - Libre d'utilisation et modification

## 🆘 Support

En cas de problème :
1. Vérifier les logs Docker : `docker-compose logs`
2. Vérifier l'état des conteneurs : `docker-compose ps`
3. Reconstruire si nécessaire : `docker-compose up --build`
4. S'assurer que le port 3000 est libre sur l'hôte

---

**Développé avec ❤️ pour la communauté des échecs**

🎮 **Bon jeu !** ♛♚
