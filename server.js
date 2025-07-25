// server.js - Serveur d'échecs avec WebSocket
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Servir les fichiers statiques
app.use(express.static('public'));

// État du jeu
const games = new Map();

class ChessGame {
    constructor(gameId) {
        this.gameId = gameId;
        this.players = [];
        this.currentPlayer = 'white';
        this.board = this.initializeBoard();
        this.gameStatus = 'waiting'; // waiting, active, finished
        this.moves = [];
    }

    initializeBoard() {
        return [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
        ];
    }

    addPlayer(playerId, socketId) {
        if (this.players.length < 2) {
            const color = this.players.length === 0 ? 'white' : 'black';
            this.players.push({ id: playerId, socketId, color });

            if (this.players.length === 2) {
                this.gameStatus = 'active';
            }

            return color;
        }
        return null;
    }

    isValidMove(from, to, color) {
        const [fromRow, fromCol] = from;
        const [toRow, toCol] = to;

        // Vérifications de base
        if (fromRow < 0 || fromRow > 7 || fromCol < 0 || fromCol > 7) return false;
        if (toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) return false;

        const piece = this.board[fromRow][fromCol];
        if (!piece) return false;

        // Vérifier que c'est bien le tour du joueur
        const isWhitePiece = piece === piece.toUpperCase();
        if ((color === 'white' && !isWhitePiece) || (color === 'black' && isWhitePiece)) {
            return false;
        }

        const targetPiece = this.board[toRow][toCol];

        // Ne peut pas capturer ses propres pièces
        if (targetPiece) {
            const isTargetWhite = targetPiece === targetPiece.toUpperCase();
            if ((isWhitePiece && isTargetWhite) || (!isWhitePiece && !isTargetWhite)) {
                return false;
            }
        }

        // Validation basique des mouvements par type de pièce
        const pieceType = piece.toLowerCase();
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);

        switch (pieceType) {
            case 'p': // Pion
                const direction = isWhitePiece ? -1 : 1;
                const startRow = isWhitePiece ? 6 : 1;

                if (fromCol === toCol) { // Mouvement vertical
                    if (targetPiece) return false; // Blocage
                    if (toRow === fromRow + direction) return true;
                    if (fromRow === startRow && toRow === fromRow + 2 * direction && !this.board[fromRow + direction][fromCol]) {
                        return true;
                    }
                } else if (Math.abs(fromCol - toCol) === 1 && toRow === fromRow + direction) {
                    return targetPiece !== null; // Capture en diagonale
                }
                return false;

            case 'r': // Tour
                if (fromRow !== toRow && fromCol !== toCol) return false;
                return this.isPathClear(from, to);

            case 'n': // Cavalier
                return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);

            case 'b': // Fou
                if (rowDiff !== colDiff) return false;
                return this.isPathClear(from, to);

            case 'q': // Dame
                if (fromRow !== toRow && fromCol !== toCol && rowDiff !== colDiff) return false;
                return this.isPathClear(from, to);

            case 'k': // Roi
                return rowDiff <= 1 && colDiff <= 1;

            default:
                return false;
        }
    }

    isPathClear(from, to) {
        const [fromRow, fromCol] = from;
        const [toRow, toCol] = to;

        const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
        const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;

        let currentRow = fromRow + rowStep;
        let currentCol = fromCol + colStep;

        while (currentRow !== toRow || currentCol !== toCol) {
            if (this.board[currentRow][currentCol] !== null) {
                return false;
            }
            currentRow += rowStep;
            currentCol += colStep;
        }

        return true;
    }

    makeMove(from, to, playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || player.color !== this.currentPlayer) {
            return false;
        }

        if (!this.isValidMove(from, to, player.color)) {
            return false;
        }

        const [fromRow, fromCol] = from;
        const [toRow, toCol] = to;

        // Effectuer le mouvement
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];

        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        // Enregistrer le mouvement
        this.moves.push({
            from,
            to,
            piece,
            capturedPiece,
            player: player.color
        });

        // Changer de joueur
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

        return true;
    }
}

// Gestion des connexions WebSocket
io.on('connection', (socket) => {
    console.log('Nouvelle connexion:', socket.id);

    socket.on('join-game', (data) => {
        const { gameId, playerId } = data;

        if (!games.has(gameId)) {
            games.set(gameId, new ChessGame(gameId));
        }

        const game = games.get(gameId);
        const playerColor = game.addPlayer(playerId, socket.id);

        if (playerColor) {
            socket.join(gameId);
            socket.emit('player-assigned', { color: playerColor, gameId });

            // Envoyer l'état du jeu
            io.to(gameId).emit('game-state', {
                board: game.board,
                currentPlayer: game.currentPlayer,
                gameStatus: game.gameStatus,
                players: game.players.map(p => ({ color: p.color, id: p.id }))
            });

            console.log(`Joueur ${playerId} rejoint la partie ${gameId} en tant que ${playerColor}`);
        } else {
            socket.emit('game-full');
        }
    });

    socket.on('make-move', (data) => {
        const { gameId, from, to, playerId } = data;
        const game = games.get(gameId);

        if (game && game.makeMove(from, to, playerId)) {
            // Diffuser le nouvel état du jeu
            io.to(gameId).emit('game-state', {
                board: game.board,
                currentPlayer: game.currentPlayer,
                gameStatus: game.gameStatus,
                lastMove: { from, to }
            });

            console.log(`Mouvement effectué dans la partie ${gameId}:`, from, 'vers', to);
        } else {
            socket.emit('invalid-move');
        }
    });

    socket.on('disconnect', () => {
        console.log('Déconnexion:', socket.id);
        // Gérer la déconnexion des joueurs
        for (const [gameId, game] of games.entries()) {
            const playerIndex = game.players.findIndex(p => p.socketId === socket.id);
            if (playerIndex !== -1) {
                game.players.splice(playerIndex, 1);
                if (game.players.length === 0) {
                    games.delete(gameId);
                } else {
                    game.gameStatus = 'waiting';
                    io.to(gameId).emit('player-disconnected');
                }
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur d'échecs démarré sur le port ${PORT}`);
});
