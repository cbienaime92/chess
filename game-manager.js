// game-manager.js - Gestionnaire avancé des parties
const ChessEngine = require('./chess-engine');
const { Chess } = require('chess.js');

class GameManager {
    constructor() {
        this.games = new Map();
        this.players = new Map(); // socketId -> gameId
        this.gameStats = new Map(); // Statistiques des parties
    }

    createGame(gameId, options = {}) {
        const game = {
            id: gameId,
            chess: new Chess(),
            engine: new ChessEngine(),
            players: {},
            spectators: new Set(),
            moveHistory: [],
            gameState: 'waiting',
            startTime: null,
            endTime: null,
            timeControl: options.timeControl || null, // Format: { initial: 600, increment: 5 }
            playerTimes: { white: 600, black: 600 }, // Temps en secondes
            lastMoveTime: null,
            isRated: options.isRated || false,
            gameType: options.gameType || 'standard', // standard, blitz, bullet, correspondence
            variant: options.variant || 'standard', // standard, chess960, king-of-the-hill
            chat: [],
            analysis: {
                enabled: options.analysis !== false,
                moves: []
            }
        };

        // Initialiser le moteur avec la position
        game.engine.loadFen(game.chess.fen());
        
        this.games.set(gameId, game);
        this.gameStats.set(gameId, {
            moves: 0,
            captures: 0,
            checks: 0,
            castles: 0,
            promotions: 0,
            averageMoveTime: 0,
            longestThink: 0
        });

        return game;
    }

    joinGame(socketId, gameId, playerData) {
        if (!this.games.has(gameId)) {
            this.createGame(gameId);
        }

        const game = this.games.get(gameId);
        this.players.set(socketId, gameId);

        // Assigner le joueur à une couleur
        if (!game.players.white) {
            game.players.white = {
                id: socketId,
                name: playerData.name,
                rating: playerData.rating || 1200,
                country: playerData.country || 'UN'
            };
            return { color: 'white', game };
        } else if (!game.players.black) {
            game.players.black = {
                id: socketId,
                name: playerData.name,
                rating: playerData.rating || 1200,
                country: playerData.country || 'UN'
            };
            
            // Démarrer la partie
            game.gameState = 'playing';
            game.startTime = new Date();
            
            return { color: 'black', game };
        } else {
            // Spectateur
            game.spectators.add(socketId);
            return { color: 'spectator', game };
        }
    }

    makeMove(socketId, gameId, moveData) {
        const game = this.games.get(gameId);
        if (!game) {
            return { success: false, error: 'Partie non trouvée' };
        }
        
        if (game.gameState !== 'playing') {
            return { success: false, error: 'Partie non active' };
        }

        // Vérifier que c'est le bon joueur
        const playerColor = game.players.white?.id === socketId ? 'white' : 'black';
        if (!game.players.white || !game.players.black) {
            return { success: false, error: 'Joueurs manquants' };
        }
        
        if (game.chess.turn() !== playerColor.charAt(0)) {
            return { success: false, error: 'Ce n\'est pas votre tour' };
        }

        try {
            // Effectuer le coup
            const moveResult = game.chess.move(moveData);
            if (!moveResult) {
                return { success: false, error: 'Coup invalide' };
            }

            // Mettre à jour le moteur d'analyse
            if (game.engine) {
                game.engine.loadFen(game.chess.fen());
            }

            // Ajouter à l'historique
            const moveRecord = {
                move: moveResult.san,
                from: moveResult.from,
                to: moveResult.to,
                player: playerColor,
                timestamp: new Date().toISOString(),
                fen: game.chess.fen(),
                moveTime: 0
            };

            game.moveHistory.push(moveRecord);

            // Mettre à jour les statistiques
            this.updateGameStats(gameId, moveResult, 0);

            // Vérifier fin de partie
            if (game.chess.isGameOver()) {
                game.gameState = 'finished';
            }

            return {
                success: true,
                move: moveResult,
                gameState: game.chess.fen()
            };

        } catch (error) {
            console.error('Erreur makeMove:', error);
            return { success: false, error: 'Erreur lors du coup' };
        }
    }

    endGame(gameId, reason, winner = null) {
        const game = this.games.get(gameId);
        if (!game) return;

        game.gameState = 'finished';
        game.endTime = new Date();
        
        let result = '';
        if (reason === 'checkmate') {
            const winnerColor = game.chess.turn() === 'w' ? 'black' : 'white';
            result = `Échec et mat ! ${winnerColor === 'white' ? 'Blancs' : 'Noirs'} gagnent`;
        } else if (reason === 'time') {
            result = `Temps écoulé ! ${winner === 'white' ? 'Blancs' : 'Noirs'} gagnent`;
        } else {
            result = 'Match nul';
        }

        return { result, reason };
    }

    updateGameStats(gameId, moveResult, moveTime) {
        const stats = this.gameStats.get(gameId);
        if (!stats) return;

        stats.moves++;
        if (moveResult.captured) stats.captures++;
        if (moveResult.san.includes('+')) stats.checks++;
        if (moveResult.san.includes('O-O')) stats.castles++;
        if (moveResult.promotion) stats.promotions++;
        
        // Temps de réflexion
        if (moveTime > 0) {
            stats.averageMoveTime = (stats.averageMoveTime * (stats.moves - 1) + moveTime) / stats.moves;
            stats.longestThink = Math.max(stats.longestThink, moveTime);
        }
    }

    getGameOverReason(chess) {
        if (chess.isCheckmate()) return 'checkmate';
        if (chess.isStalemate()) return 'stalemate';
        if (chess.isThreefoldRepetition()) return 'repetition';
        if (chess.isInsufficientMaterial()) return 'insufficient-material';
        if (chess.isDraw()) return 'draw';
        return 'unknown';
    }

    addChatMessage(socketId, gameId, message) {
        const game = this.games.get(gameId);
        if (!game) return false;

        const player = Object.values(game.players).find(p => p.id === socketId);
        const playerName = player ? player.name : 'Spectateur';
        const isSpectator = !player;

        const chatMessage = {
            id: Date.now(),
            player: playerName,
            message: message.trim(),
            timestamp: new Date().toISOString(),
            isSpectator: isSpectator
        };

        game.chat.push(chatMessage);
        
        // Limiter à 100 messages
        if (game.chat.length > 100) {
            game.chat = game.chat.slice(-100);
        }

        return chatMessage;
    }

    getGameAnalysis(gameId) {
        const game = this.games.get(gameId);
        if (!game) return null;

        const stats = this.gameStats.get(gameId);
        
        return {
            moves: game.moveHistory,
            analysis: game.analysis.moves,
            statistics: stats,
            duration: game.endTime ? (game.endTime - game.startTime) / 1000 : null,
            openingName: this.identifyOpening(game.moveHistory.slice(0, 10))
        };
    }

    identifyOpening(moves) {
        // Base de données simplifiée d'ouvertures
        const openings = {
            'e4 e5 Nf3 Nc6 Bb5': 'Partie Espagnole',
            'e4 e5 Nf3 Nc6 Bc4': 'Partie Italienne',
            'd4 d5 c4': 'Gambit Dame',
            'e4 c5': 'Défense Sicilienne',
            'e4 e6': 'Défense Française',
            'e4 c6': 'Défense Caro-Kann',
            'd4 Nf6 c4 g6': 'Défense Indienne du Roi',
            'Nf3 d5 g3': 'Système Réti'
        };

        const moveString = moves.map(m => m.move).join(' ');
        
        for (const [pattern, name] of Object.entries(openings)) {
            if (moveString.startsWith(pattern)) {
                return name;
            }
        }
        
        return 'Ouverture inconnue';
    }

    removePlayer(socketId) {
        const gameId = this.players.get(socketId);
        if (!gameId) return null;

        const game = this.games.get(gameId);
        if (!game) return null;

        // Retirer le joueur
        if (game.players.white?.id === socketId) {
            game.players.white = null;
        } else if (game.players.black?.id === socketId) {
            game.players.black = null;
        } else {
            game.spectators.delete(socketId);
        }

        this.players.delete(socketId);

        // Si un joueur principal se déconnecte, terminer la partie
        if (game.gameState === 'playing' && (!game.players.white || !game.players.black)) {
            this.endGame(gameId, 'disconnect');
        }

        return { gameId, game };
    }

    getGame(gameId) {
        return this.games.get(gameId);
    }

    getAllGames() {
        return Array.from(this.games.values()).map(game => ({
            id: game.id,
            players: game.players,
            gameState: game.gameState,
            moveCount: game.moveHistory.length,
            startTime: game.startTime,
            gameType: game.gameType,
            spectatorCount: game.spectators.size
        }));
    }

    cleanupOldGames() {
        const now = new Date();
        const maxAge = 24 * 60 * 60 * 1000; // 24 heures

        for (const [gameId, game] of this.games.entries()) {
            const gameAge = now - (game.endTime || game.startTime || now);
            if (gameAge > maxAge) {
                this.games.delete(gameId);
                this.gameStats.delete(gameId);
            }
        }
    }
}

module.exports = GameManager;