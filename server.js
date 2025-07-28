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

// Fonction pour faire jouer l'IA
function makeAIMove(gameId) {
    const game = gameManager.getGame(gameId);
    if (!game || !game.isAIGame || game.gameState !== 'playing') {
        return;
    }

    console.log(`🤖 IA réfléchit pour la partie ${gameId}...`);
    
    const aiMove = game.engine.getBestMove();
    
    if (aiMove) {
        console.log(`🎯 IA joue: ${aiMove.from} → ${aiMove.to}`);
        
        const result = gameManager.makeAIMove(gameId, aiMove);
        
        if (result.success) {
            io.to(gameId).emit('move-made', {
                move: result.move,
                gameState: result.gameState,
                moveHistory: game.moveHistory,
                turn: game.chess.turn(),
                isAIMove: true
            });
            
            if (game.gameState === 'finished') {
                const endResult = gameManager.endGame(gameId, getGameOverReason(game.chess));
                io.to(gameId).emit('game-over', endResult);
            }
        }
    }
}

function getGameOverReason(chess) {
    if (chess.isCheckmate()) return 'checkmate';
    if (chess.isStalemate()) return 'stalemate';
    if (chess.isThreefoldRepetition()) return 'repetition';
    if (chess.isInsufficientMaterial()) return 'insufficient-material';
    return 'draw';
}

// WebSocket
io.on('connection', (socket) => {
    console.log(`🔌 Nouvelle connexion: ${socket.id}`);

    // Ping pour maintenir la connexion
    socket.on('ping', () => {
        socket.emit('pong');
    });

    socket.on('join-game', (data) => {
        const { gameId, playerName } = data;
        console.log(`👤 ${playerName} tente de rejoindre ${gameId} avec socket ${socket.id}`);
        
        // Debug: Vérifier l'état de la partie avant jointure
        const existingGame = gameManager.getGame(gameId);
        if (existingGame) {
            console.log(`🔍 État de la partie ${gameId}:`);
            console.log(`   - État: ${existingGame.gameState}`);
            console.log(`   - Blanc: ${existingGame.players.white?.name || 'vide'} (${existingGame.players.white?.id || 'pas d\'ID'})`);
            console.log(`   - Noir: ${existingGame.players.black?.name || 'vide'} (${existingGame.players.black?.id || 'pas d\'ID'})`);
        }
        
        const result = gameManager.joinGame(socket.id, gameId, { 
            name: playerName,
            rating: data.rating || 1200
        });

        const { color, game, isReconnection } = result;
        socket.join(gameId);

        console.log(`✅ ${playerName} assigné comme ${color} dans ${gameId} ${isReconnection ? '(RECONNEXION)' : '(NOUVEAU)'}`);

        if (color === 'white' || color === 'black') {
            socket.emit('player-assigned', { 
                color: color, 
                gameState: game.chess.fen()
            });

            if (isReconnection) {
                // Notifier l'autre joueur de la reconnexion
                socket.to(gameId).emit('player-reconnected', {
                    playerName: playerName,
                    color: color,
                    message: `${playerName} s'est reconnecté`
                });
                
                console.log(`📢 Notification de reconnexion envoyée pour ${playerName}`);
            }

            if ((color === 'black' && game.gameState === 'playing') || game.gameState === 'playing') {
                io.to(gameId).emit('game-start', {
                    white: game.players.white?.name || 'En attente...',
                    black: game.players.black?.name || 'En attente...',
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

    socket.on('join-ai-game', (data) => {
        const { gameId, playerName, aiDifficulty } = data;
        console.log(`🤖 ${playerName} démarre une partie IA niveau ${aiDifficulty}`);
        
        const result = gameManager.createAIGame(socket.id, gameId, {
            name: playerName,
            rating: data.rating || 1200
        }, aiDifficulty);

        const { color, game } = result;
        socket.join(gameId);

        socket.emit('player-assigned', { 
            color: color, 
            gameState: game.chess.fen()
        });

        socket.emit('ai-game-start', {
            player: playerName,
            aiLevel: aiDifficulty,
            gameState: game.chess.fen()
        });

        socket.emit('move-history', game.moveHistory);

        // L'IA ne joue jamais en premier, le joueur a toujours les blancs
    });

    socket.on('make-move', (data) => {
        const { gameId, move } = data;
        const result = gameManager.makeMove(socket.id, gameId, move);

        if (result.success) {
            io.to(gameId).emit('move-made', {
                move: result.move,
                gameState: result.gameState,
                moveHistory: gameManager.getGame(gameId).moveHistory,
                turn: gameManager.getGame(gameId).chess.turn()
            });

            const game = gameManager.getGame(gameId);
            if (game && game.gameState === 'finished') {
                const endResult = gameManager.endGame(gameId, getGameOverReason(game.chess));
                io.to(gameId).emit('game-over', endResult);
            } else if (game && game.isAIGame && game.chess.turn() === 'b') {
                // C'est le tour de l'IA
                setTimeout(() => {
                    makeAIMove(gameId);
                }, Math.random() * 1000 + 500);
            }
        } else {
            socket.emit('invalid-move', result.error);
        }
    });

    socket.on('new-game', (data) => {
        const { gameId } = data;
        const game = gameManager.getGame(gameId);
        
        if (game) {
            gameManager.games.delete(gameId);
            const newGame = gameManager.createGame(gameId);
            
            if (game.players.white) {
                newGame.players.white = game.players.white;
            }
            if (game.players.black) {
                newGame.players.black = game.players.black;
            }
            
            if (newGame.players.white && newGame.players.black) {
                newGame.gameState = 'playing';
                newGame.startTime = new Date();
            }
            
            io.to(gameId).emit('game-reset', {
                gameState: newGame.chess.fen(),
                moveHistory: []
            });
        }
    });

    socket.on('disconnect', (reason) => {
        console.log(`❌ Déconnexion ${socket.id}: ${reason}`);
        
        const result = gameManager.removePlayer(socket.id);
        if (result && result.disconnectedPlayer) {
            const { gameId, disconnectedPlayer } = result;
            
            // Notifier seulement une déconnexion temporaire
            socket.to(gameId).emit('player-temporarily-disconnected', {
                playerName: disconnectedPlayer.name,
                color: disconnectedPlayer.color,
                message: `${disconnectedPlayer.name} s'est déconnecté temporairement. La partie sera annulée dans 5 minutes s'il ne revient pas.`
            });
        }
    });
});

// Nettoyage périodique
setInterval(() => {
    gameManager.cleanupOldGames();
}, 60 * 60 * 1000);

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🏁 Serveur d'échecs démarré sur le port ${PORT}`);
    console.log(`📊 Interface: http://localhost:${PORT}`);
    console.log(`📊 Admin: http://localhost:${PORT}/admin`);
});