# 🏁 Serveur d'Échecs Multijoueur

Application web d'échecs en temps réel pour 2 joueurs ou contre IA, avec historique des coups et système de reconnexion automatique.

## ✨ Fonctionnalités

- 🎮 **Jeu d'échecs 2 joueurs** en temps réel via WebSocket
- 🤖 **Jeu contre IA** avec 5 niveaux de difficulté (débutant à expert)
- 📜 **Historique complet** des coups avec notation algébrique
- 👥 **Mode spectateur** pour regarder les parties
- 🔄 **Reconnexion automatique** en cas de fermeture de fenêtre
- ♛ **Orientation de l'échiquier** selon la couleur du joueur (noirs en bas pour les noirs)
- ⚡ **Mise à jour optimiste** - les coups apparaissent instantanément
- 📊 **Interface d'administration** pour surveiller toutes les parties
- 💾 **Sauvegarde automatique** des parties en cours

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
chess-multiplayer-server/
├── 📄 CORE APPLICATION
│   ├── server.js              ← server_final_clean
│   ├── chess-engine.js        ← chess_engine_simple (IA ultra-rapide)
│   ├── game-manager.js        ← game_manager_clean
│   └── package.json          ← clean_package_json
│
├── 🌐 INTERFACES
│   ├── public/index.html      ← chess_html_final (interface complète)
│   └── public/admin.html      ← admin_interface
│
├── 🐳 DOCKER (optionnel)
│   ├── Dockerfile            ← minimal_dockerfile
│   └── docker-compose.yml    ← minimal_docker_compose
│
└── 📚 DOCUMENTATION
    └── README.md             ← readme_final (ce fichier)
```

## 🎯 Utilisation

### Créer une partie multijoueur
1. Aller sur `http://localhost:3000`
2. Sélectionner "👥 Contre un ami"
3. Entrer votre nom
4. Laisser l'ID de partie vide (généré automatiquement) ou entrer un ID existant
5. Cliquer sur "Commencer la partie"
6. Partager l'ID avec votre adversaire

### Jouer contre l'IA
1. Aller sur `http://localhost:3000`
2. Sélectionner "🤖 Contre l'IA"
3. Entrer votre nom
4. Choisir le niveau de difficulté (1-5)
5. Cliquer sur "Commencer la partie"
6. Vous jouez toujours les blancs contre l'IA

### Rejoindre une partie existante
1. Entrer l'ID de la partie fourni par l'autre joueur
2. Ou utiliser le lien direct : `http://localhost:3000/game/GAMEID`

### Reconnexion automatique
- Si vous fermez la fenêtre par accident, rechargez la page
- Une popup vous proposera de vous reconnecter automatiquement
- Votre adversaire verra "X s'est reconnecté !" quand vous revenez
- La partie continue exactement où elle s'était arrêtée

### Interface d'administration
- Accéder à `http://localhost:3000/admin`
- Voir toutes les parties en cours (multijoueur et IA)
- Statistiques en temps réel
- Surveillance des connexions et déconnexions

## 🎮 Comment jouer

### Contrôles de base
1. **Sélectionner une pièce** : Cliquer sur une de vos pièces
2. **Déplacer** : Cliquer sur la case de destination
3. **Annuler la sélection** : Cliquer sur une case vide
4. **Tour** : Les joueurs alternent automatiquement
5. **Historique** : Visible en temps réel dans le panneau de droite

### Niveaux d'IA
- **Niveau 1** : Débutant (~0.1s) - Coups complètement aléatoires
- **Niveau 2** : Facile (~0.2s) - Préfère capturer les pièces
- **Niveau 3** : Moyen (~0.5s) - Évalue 1 coup à l'avance
- **Niveau 4** : Difficile (~2s) - Évaluation plus poussée
- **Niveau 5** : Expert (~5s) - IA la plus forte disponible

### Fonctionnalités avancées
- **Reconnexion** : Fermez et rouvrez - la partie vous attend 5 minutes
- **Orientation** : L'échiquier s'oriente selon votre couleur
- **Mise à jour optimiste** : Vos coups apparaissent instantanément
- **Mode spectateur** : Les parties complètes deviennent observables
- **Copier lien** : Bouton pour partager l'URL de la partie

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

### Moteur d'IA ultra-rapide
- Algorithme simplifié garantissant des réponses < 1 seconde
- 5 niveaux adaptatifs selon le temps de réflexion souhaité
- Gestion d'erreurs robuste avec coups de secours
- Évaluation basée sur la valeur des pièces et captures prioritaires

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

### Problèmes de reconnexion
- Cliquer sur "🗑️ Effacer les données sauvegardées" sur la page d'accueil
- Actualiser la page et rejoindre normalement
- Vérifier que vous utilisez le même nom qu'avant

### Les pièces ne bougent pas
- Vérifier les logs : `docker-compose logs -f`
- S'assurer que c'est votre tour (joueur actif en vert)
- Actualiser la page pour reconnecter

### L'IA est trop lente ou ne joue pas
- L'IA niveau 1-3 devrait jouer en moins d'1 seconde
- Si plus lent, vérifier les logs serveur
- Redémarrer : `docker-compose restart`

### Problèmes d'affichage
- Vérifier que vous utilisez `chess_html_final` pour index.html
- Aucun code JavaScript ne doit être visible dans la page
- Vider le cache du navigateur (Ctrl+F5)

## 📊 API REST

```bash
GET  /api/games                    # Liste toutes les parties
GET  /api/game/:gameId/analysis    # Analyse d'une partie
POST /api/analyze-position          # Analyser une position FEN
```

## 🎯 Prochaines améliorations

- [ ] **Chat en direct** entre joueurs pendant la partie
- [ ] **Système de classement ELO** pour les parties multijoueur
- [ ] **Parties privées** avec mot de passe
- [ ] **Sauvegarde** des parties terminées dans une base de données
- [ ] **Thèmes d'échiquier** personnalisés (bois, marbre, néon)
- [ ] **Mode tournoi** avec élimination ou round-robin
- [ ] **Variantes d'échecs** : Chess960, King of the Hill
- [ ] **Application mobile** React Native
- [ ] **Analyse post-partie** avec graphiques de précision
- [ ] **Puzzles d'échecs** quotidiens

## 📄 Licence

MIT License - Libre d'utilisation et modification

## 🆘 Support

En cas de problème :
1. Vérifier les logs Docker : `docker-compose logs`
2. Vérifier l'état des conteneurs : `docker-compose ps`
3. Tester l'API : `curl http://localhost:3000/api/games`
4. Pour les problèmes de reconnexion : effacer les données sauvegardées
5. Reconstruire si nécessaire : `docker-compose up --build`

### Logs utiles à surveiller
- `🔌 Nouvelle connexion: socket123` - Connexion réussie
- `🔄 Reconnexion du joueur blanc: Alice` - Reconnexion détectée
- `🤖 IA niveau 3 - Meilleur coup: e2e4` - IA fonctionne
- `❌ Erreur dans getBestMove` - Problème IA à investiguer

---

**🎮 Bon jeu d'échecs ! Que le meilleur joueur gagne ! ♛♚**