//chess-engine.js
const { Chess } = require('chess.js');

class ChessEngine {
    constructor() {
        this.chess = new Chess();
        this.difficulty = 3;
    }

    // Évaluation simple et rapide
    evaluatePosition() {
        if (this.chess.isCheckmate()) {
            return this.chess.turn() === 'w' ? -9999 : 9999;
        }
        if (this.chess.isDraw()) {
            return 0;
        }

        let score = 0;
        const board = this.chess.board();
        
        // Valeurs des pièces seulement
        const pieceValues = {
            'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0,
            'P': -1, 'N': -3, 'B': -3, 'R': -5, 'Q': -9, 'K': 0
        };

        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const piece = board[rank][file];
                if (piece) {
                    score += pieceValues[piece.type] * (piece.color === 'w' ? -1 : 1);
                }
            }
        }

        return score;
    }

    // IA ULTRA-SIMPLE selon le niveau
    getBestMove() {
        const moves = this.chess.moves({ verbose: true });
        if (moves.length === 0) return null;

        console.log(`🤖 IA niveau ${this.difficulty} - ${moves.length} coups possibles`);

        try {
            if (this.difficulty === 1) {
                // Niveau 1: Complètement aléatoire
                const randomMove = moves[Math.floor(Math.random() * moves.length)];
                console.log(`🎲 Niveau 1 - Coup aléatoire: ${randomMove.san}`);
                return randomMove;
            }

            if (this.difficulty === 2) {
                // Niveau 2: Préfère les captures
                const captures = moves.filter(move => move.captured);
                if (captures.length > 0) {
                    const randomCapture = captures[Math.floor(Math.random() * captures.length)];
                    console.log(`⚔️ Niveau 2 - Capture: ${randomCapture.san}`);
                    return randomCapture;
                }
                // Sinon coup aléatoire
                const randomMove = moves[Math.floor(Math.random() * moves.length)];
                console.log(`🎲 Niveau 2 - Coup aléatoire: ${randomMove.san}`);
                return randomMove;
            }

            // Niveau 3-5: Évaluation simple (1 coup à l'avance maximum)
            let bestMove = moves[0];
            let bestScore = this.chess.turn() === 'b' ? -Infinity : Infinity;

            for (const move of moves) {
                // Jouer le coup temporairement
                this.chess.move(move);
                const score = this.evaluatePosition();
                this.chess.undo();

                if (this.chess.turn() === 'b' && score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                } else if (this.chess.turn() === 'w' && score < bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }

            console.log(`🧠 Niveau ${this.difficulty} - Meilleur coup: ${bestMove.san} (score: ${bestScore})`);
            return bestMove;

        } catch (error) {
            console.error('❌ Erreur dans getBestMove:', error);
            // En cas d'erreur, retourner un coup aléatoire
            const fallbackMove = moves[Math.floor(Math.random() * moves.length)];
            console.log(`🆘 Coup de secours: ${fallbackMove.san}`);
            return fallbackMove;
        }
    }

    // Analyser une position (simplifié)
    analyzePosition() {
        const evaluation = this.evaluatePosition();
        const moves = this.chess.moves({ verbose: true });
        const bestMove = this.getBestMove();
        
        return {
            evaluation: evaluation,
            bestMove: bestMove,
            moveCount: moves.length,
            isCheck: this.chess.inCheck(),
            isCheckmate: this.chess.isCheckmate(),
            isDraw: this.chess.isDraw(),
            fen: this.chess.fen()
        };
    }

    // Suggestions rapides
    getSuggestions(count = 3) {
        const moves = this.chess.moves({ verbose: true });
        const suggestions = [];

        // Prendre les premiers coups disponibles avec évaluation simple
        for (let i = 0; i < Math.min(count, moves.length); i++) {
            const move = moves[i];
            this.chess.move(move);
            const evaluation = this.evaluatePosition();
            this.chess.undo();
            
            suggestions.push({
                move: move,
                evaluation: evaluation,
                notation: move.san
            });
        }

        return suggestions;
    }

    // Charger une position FEN
    loadFen(fen) {
        try {
            return this.chess.load(fen);
        } catch (error) {
            console.error('Erreur chargement FEN:', error);
            return false;
        }
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