// chess-engine.js - Moteur d'échecs avancé avec IA simple
const { Chess } = require('chess.js');

class ChessEngine {
    constructor() {
        this.chess = new Chess();
        this.difficulty = 3; // 1-5
    }

    // Évaluation de position basique
    evaluatePosition() {
        if (this.chess.isCheckmate()) {
            return this.chess.turn() === 'w' ? -9999 : 9999;
        }
        if (this.chess.isDraw()) {
            return 0;
        }

        let score = 0;
        const board = this.chess.board();
        
        // Valeurs des pièces
        const pieceValues = {
            'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0,
            'P': -1, 'N': -3, 'B': -3, 'R': -5, 'Q': -9, 'K': 0
        };

        // Tables de position pour encourager le développement
        const pawnTable = [
            [0,  0,  0,  0,  0,  0,  0,  0],
            [50, 50, 50, 50, 50, 50, 50, 50],
            [10, 10, 20, 30, 30, 20, 10, 10],
            [5,  5, 10, 25, 25, 10,  5,  5],
            [0,  0,  0, 20, 20,  0,  0,  0],
            [5, -5,-10,  0,  0,-10, -5,  5],
            [5, 10, 10,-20,-20, 10, 10,  5],
            [0,  0,  0,  0,  0,  0,  0,  0]
        ];

        const knightTable = [
            [-50,-40,-30,-30,-30,-30,-40,-50],
            [-40,-20,  0,  0,  0,  0,-20,-40],
            [-30,  0, 10, 15, 15, 10,  0,-30],
            [-30,  5, 15, 20, 20, 15,  5,-30],
            [-30,  0, 15, 20, 20, 15,  0,-30],
            [-30,  5, 10, 15, 15, 10,  5,-30],
            [-40,-20,  0,  5,  5,  0,-20,-40],
            [-50,-40,-30,-30,-30,-30,-40,-50]
        ];

        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const piece = board[rank][file];
                if (piece) {
                    score += pieceValues[piece.type] * (piece.color === 'w' ? -1 : 1);
                    
                    // Bonus de position
                    if (piece.type === 'p') {
                        const tableRank = piece.color === 'w' ? 7 - rank : rank;
                        score += (pawnTable[tableRank][file] / 100) * (piece.color === 'w' ? -1 : 1);
                    } else if (piece.type === 'n') {
                        const tableRank = piece.color === 'w' ? 7 - rank : rank;
                        score += (knightTable[tableRank][file] / 100) * (piece.color === 'w' ? -1 : 1);
                    }
                }
            }
        }

        return score;
    }

    // Algorithme minimax avec élagage alpha-beta
    minimax(depth, alpha, beta, maximizingPlayer) {
        if (depth === 0 || this.chess.isGameOver()) {
            return this.evaluatePosition();
        }

        const moves = this.chess.moves({ verbose: true });
        
        if (maximizingPlayer) {
            let maxEvaluation = -Infinity;
            for (const move of moves) {
                this.chess.move(move);
                const currentEvaluation = this.minimax(depth - 1, alpha, beta, false);
                this.chess.undo();
                maxEvaluation = Math.max(maxEvaluation, currentEvaluation);
                alpha = Math.max(alpha, currentEvaluation);
                if (beta <= alpha) break; // Élagage alpha-beta
            }
            return maxEvaluation;
        } else {
            let minEvaluation = Infinity;
            for (const move of moves) {
                this.chess.move(move);
                const currentEvaluation = this.minimax(depth - 1, alpha, beta, true);
                this.chess.undo();
                minEvaluation = Math.min(minEvaluation, currentEvaluation);
                beta = Math.min(beta, currentEvaluation);
                if (beta <= alpha) break; // Élagage alpha-beta
            }
            return minEvaluation;
        }
    }

    // Trouver le meilleur coup
    getBestMove() {
        const moves = this.chess.moves({ verbose: true });
        if (moves.length === 0) return null;

        let bestMove = moves[0];
        let bestValue = this.chess.turn() === 'b' ? -Infinity : Infinity;

        for (const move of moves) {
            this.chess.move(move);
            const value = this.minimax(this.difficulty, -Infinity, Infinity, this.chess.turn() === 'b');
            this.chess.undo();

            if (this.chess.turn() === 'b' && value > bestValue) {
                bestValue = value;
                bestMove = move;
            } else if (this.chess.turn() === 'w' && value < bestValue) {
                bestValue = value;
                bestMove = move;
            }
        }

        return bestMove;
    }

    // Analyser une position
    analyzePosition() {
        const positionEvaluation = this.evaluatePosition();
        const moves = this.chess.moves({ verbose: true });
        const bestMove = this.getBestMove();
        
        return {
            evaluation: positionEvaluation,
            bestMove: bestMove,
            moveCount: moves.length,
            isCheck: this.chess.inCheck(),
            isCheckmate: this.chess.isCheckmate(),
            isDraw: this.chess.isDraw(),
            fen: this.chess.fen()
        };
    }

    // Obtenir des suggestions de coups
    getSuggestions(count = 3) {
        const moves = this.chess.moves({ verbose: true });
        const suggestions = [];

        for (const move of moves) {
            this.chess.move(move);
            const positionEvaluation = this.evaluatePosition();
            this.chess.undo();
            
            suggestions.push({
                move: move,
                evaluation: positionEvaluation,
                notation: move.san
            });
        }

        // Trier par évaluation
        suggestions.sort((a, b) => {
            return this.chess.turn() === 'b' ? b.evaluation - a.evaluation : a.evaluation - b.evaluation;
        });

        return suggestions.slice(0, count);
    }

    // Charger une position FEN
    loadFen(fen) {
        return this.chess.load(fen);
    }

    // Réinitialiser
    reset() {
        this.chess.reset();
    }

    // Obtenir l'état actuel
    getState() {
        return {
            fen: this.chess.fen(),
            turn: this.chess.turn(),
            moves: this.chess.moves(),
            history: this.chess.history({ verbose: true }),
            isGameOver: this.chess.isGameOver(),
            isCheck: this.chess.inCheck(),
            isCheckmate: this.chess.isCheckmate(),
            isDraw: this.chess.isDraw()
        };
    }
}

module.exports = ChessEngine;