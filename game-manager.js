const ChessEngine = require('./chess-engine');
const { Chess } = require('chess.js');

class GameManager {
    constructor() {
        this.games = new Map();
        this.players = new Map();
        this.gameStats = new Map();
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
            isAIGame: false,
            chat: []
        };

        game.engine.loadFen(game.chess.fen());
        this.games.set(gameId, game);
        this.gameStats.set(gameId, {
            moves: 0,
            captures: 0,
            checks: 0,
            castles: 0,
            promotions: 0
        });

        return game;
    }

    createAIGame(socketId, gameId, playerData, aiDifficulty) {
        const game = {
            id: gameId,
            chess: new Chess(),
            engine: new ChessEngine(),
            players: {},
            spectators: new Set(),
            moveHistory: [],
            gameState: 'playing',
            startTime: new Date(),
            endTime: null,
            isAIGame: true,
            aiDifficulty: aiDifficulty,
            chat: []
        };

        game.engine.difficulty = aiDifficulty;
        game.engine.loadFen(game.chess.fen());

        game.players.white = {
            id: socketId,
            name: playerData.name,
            rating: playerData.rating || 1200,
            isHuman: true
        };

        game.players.black = {
            id: 'ai',
            name: `IA Niveau ${aiDifficulty}`,
            rating: 1000 + (aiDifficulty * 200),
            isAI: true
        };

        this.games.set(gameId, game);
        this.players.set(socketId, gameId);

        this.gameStats.set(gameId, {
            moves: 0,
            captures: 0,
            checks: 0,
            castles: 0,
            promotions: 0
        });

        return { color: 'white', game };
    }

    joinGame(socketId, gameId, playerData) {
        if (!this.games.has(gameId)) {
            this.createGame(gameId);
        }

        const game = this.games.get(gameId);
        this.players.set(socketId, gameId);

        if (!game.players.white) {
            game.players.white = {
                id: socketId,
                name: playerData.name,
                rating: playerData.rating || 1200
            };
            return { color: 'white', game };
        } else if (!game.players.black) {
            game.players.black = {
                id: socketId,
                name: playerData.name,
                rating: playerData.rating || 1200
            };
            
            game.gameState = 'playing';
            game.startTime = new Date();
            
            return { color: 'black', game };
        } else {
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

        const playerColor = game.players.white?.id === socketId ? 'white' : 'black';
        if (!game.players.white || !game.players.black) {
            return { success: false, error: 'Joueurs manquants' };
        }
        
        if (game.chess.turn() !== playerColor.charAt(0)) {
            return { success: false, error: 'Ce n\'est pas votre tour' };
        }

        try {
            const moveResult = game.chess.move(moveData);
            if (!moveResult) {
                return { success: false, error: 'Coup invalide' };
            }

            if (game.engine) {
                game.engine.loadFen(game.chess.fen());
            }

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
            this.updateGameStats(gameId, moveResult, 0);

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

    makeAIMove(gameId, aiMove) {
        const game = this.games.get(gameId);
        if (!game || !game.isAIGame) {
            return { success: false, error: 'Partie IA non trouvée' };
        }

        try {
            const moveResult = game.chess.move(aiMove);
            if (!moveResult) {
                return { success: false, error: 'Coup IA invalide' };
            }

            game.engine.loadFen(game.chess.fen());

            const moveRecord = {
                move: moveResult.san,
                from: moveResult.from,
                to: moveResult.to,
                player: 'black',
                timestamp: new Date().toISOString(),
                fen: game.chess.fen(),
                moveTime: 0,
                isAIMove: true
            };

            game.moveHistory.push(moveRecord);
            this.updateGameStats(gameId, moveResult, 0);

            if (game.chess.isGameOver()) {
                game.gameState = 'finished';
            }

            return {
                success: true,
                move: moveResult,
                gameState: game.chess.fen()
            };

        } catch (error) {
            console.error('Erreur coup IA:', error);
            return { success: false, error: 'Erreur coup IA' };
        }
    }

    updateGameStats(gameId, moveResult, moveTime) {
        const stats = this.gameStats.get(gameId);
        if (!stats) return;

        stats.moves++;
        if (moveResult.captured) stats.captures++;
        if (moveResult.san.includes('+')) stats.checks++;
        if (moveResult.san.includes('O-O')) stats.castles++;
        if (moveResult.promotion) stats.promotions++;
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

        const chatMessage = {
            id: Date.now(),
            player: playerName,
            message: message.trim(),
            timestamp: new Date().toISOString()
        };

        game.chat.push(chatMessage);
        
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
            statistics: stats,
            duration: game.endTime ? (game.endTime - game.startTime) / 1000 : null
        };
    }

    removePlayer(socketId) {
        const gameId = this.players.get(socketId);
        if (!gameId) return null;

        const game = this.games.get(gameId);
        if (!game) return null;

        if (game.players.white?.id === socketId) {
            game.players.white = null;
        } else if (game.players.black?.id === socketId) {
            game.players.black = null;
        } else {
            game.spectators.delete(socketId);
        }

        this.players.delete(socketId);

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
            spectatorCount: game.spectators.size
        }));
    }

    cleanupOldGames() {
        const now = new Date();
        const maxAge = 24 * 60 * 60 * 1000;

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