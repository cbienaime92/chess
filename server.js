// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const GameManager = require('./game-manager');
const ChessEngine = require('./chess-engine');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Gestionnaire de parties
const gameManager = new GameManager();

// API REST
app.get('/api/games', (req, res) => {
    const games = gameManager.getAllGames();
    res.json(games);
});

app.get('/api/game/:gameId/analysis', (req, res) => {
    const analysis = gameManager.getGameAnalysis(req.params.gameId);
    if (analysis) {
        res.json(analysis);
    } else {
        res.status(404).json({ error: 'Partie non trouvée' });
    }
});

app.post('/api/analyze-position', (req, res) => {
    const { fen } = req.body;
    if (!fen) {
        return res.status(400).json({ error: 'FEN requis' });
    }
    
    const engine = new ChessEngine();
    if (engine.loadFen(fen)) {
        const analysis = engine.analyzePosition();
        const suggestions = engine.getSuggestions(5);
        res.json({ analysis, suggestions });
    } else {
        res.status(400).json({ error: 'FEN invalide' });
    }
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/game/:gameId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// WebSocket avec debug détaillé
io.on('connection', (socket) => {
    console.log(`🔌 Nouvelle connexion: ${socket.id}`);

    socket.on('join-game', (data) => {
        const { gameId, playerName } = data;
        console.log(`👤 ${playerName} (${socket.id}) rejoint la partie ${gameId}`);
        
        const result = gameManager.joinGame(socket.id, gameId, { 
            name: playerName,
            rating: data.rating || 1200
        });

        const { color, game } = result;
        socket.join(gameId);

        console.log(`✅ ${playerName} assigné comme ${color} dans ${gameId}`);
        
        // Vérifier les joueurs connectés
        const room = io.sockets.adapter.rooms.get(gameId);
        console.log(`📊 Joueurs dans ${gameId}:`, room ? room.size : 0);

        if (color === 'white' || color === 'black') {
            socket.emit('player-assigned', { 
                color: color, 
                gameState: game.chess.fen()
            });

            if (color === 'black' && game.gameState === 'playing') {
                console.log(`🚀 Démarrage de la partie ${gameId}`);
                io.to(gameId).emit('game-start', {
                    white: game.players.white.name,
                    black: game.players.black.name,
                    gameState: game.chess.fen()
                });
            }
        } else {
            socket.emit('spectator-mode', { 
                gameState: game.chess.fen(),
                moveHistory: game.moveHistory,
                players: {
                    white: game.players.white?.name || 'En attente...',
                    black: game.players.black?.name || 'En attente...'
                }
            });
        }

        socket.emit('move-history', game.moveHistory);
    });

    socket.on('make-move', (data) => {
        const { gameId, move } = data;
        console.log(`🎯 Coup de ${socket.id}: ${move.from}→${move.to} dans ${gameId}`);
        
        const result = gameManager.makeMove(socket.id, gameId, move);

        if (result.success) {
            console.log(`✅ Coup validé: ${result.move.san}`);
            
            // Envoyer immédiatement à tous
            const moveData = {
                move: result.move,
                gameState: result.gameState,
                moveHistory: gameManager.getGame(gameId).moveHistory,
                turn: gameManager.getGame(gameId).chess.turn()
            };
            
            console.log(`📤 Envoi du coup à tous les joueurs de ${gameId}`);
            io.to(gameId).emit('move-made', moveData);
            
            // Vérifier qui a reçu
            const room = io.sockets.adapter.rooms.get(gameId);
            if (room) {
                console.log(`📨 Coup envoyé à ${room.size} joueurs`);
            }

            const game = gameManager.getGame(gameId);
            if (game && game.gameState === 'finished') {
                const endResult = gameManager.endGame(gameId, getGameOverReason(game.chess));
                io.to(gameId).emit('game-over', endResult);
            }
        } else {
            console.log(`❌ Coup invalide: ${result.error}`);
            socket.emit('invalid-move', result.error);
        }
    });

    socket.on('disconnect', (reason) => {
        console.log(`❌ Déconnexion ${socket.id}: ${reason}`);
        
        const result = gameManager.removePlayer(socket.id);
        if (result) {
            const { gameId } = result;
            console.log(`👋 Joueur retiré de ${gameId}`);
            socket.to(gameId).emit('player-disconnected', {
                message: 'Un joueur s\'est déconnecté'
            });
        }
    });

    // Ping pour maintenir la connexion
    socket.on('ping', () => {
        socket.emit('pong');
    });
});

// Fonctions utilitaires
function getGameOverReason(chess) {
    if (chess.isCheckmate()) return 'checkmate';
    if (chess.isStalemate()) return 'stalemate';
    if (chess.isThreefoldRepetition()) return 'repetition';
    if (chess.isInsufficientMaterial()) return 'insufficient-material';
    return 'draw';
}

// Nettoyage périodique
setInterval(() => {
    gameManager.cleanupOldGames();
}, 60 * 60 * 1000);

// Démarrage du serveur - UNE SEULE DÉCLARATION DE PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🏁 Serveur d'échecs démarré sur le port ${PORT}`);
    console.log(`📊 Interface: http://localhost:${PORT}`);
    console.log(`📊 Admin: http://localhost:${PORT}/admin`);
});