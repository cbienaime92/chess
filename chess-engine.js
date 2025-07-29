//chess-engine.js - STOCKFISH CONFIGURÉ POUR ÊTRE FORT
const { Chess } = require('chess.js');
const { spawn } = require('child_process');

class ChessEngine {
    constructor() {
        this.chess = new Chess();
        this.difficulty = 3;
        this.stockfish = null;
        this.isThinking = false;
        this.initStockfish();
    }

    initStockfish() {
        try {
            const stockfishPath = process.env.STOCKFISH_PATH || '/usr/local/bin/stockfish';
            
            console.log(`🐋 Lancement Stockfish optimisé: ${stockfishPath}`);
            
            this.stockfish = spawn(stockfishPath, [], {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            this.stockfish.on('error', (error) => {
                console.error('❌ Erreur Stockfish:', error.message);
                this.stockfish = null;
            });

            this.stockfish.on('spawn', () => {
                console.log('✅ Stockfish lancé - Configuration avancée...');
                this.configureStockfish();
            });

            this.stockfish.on('close', (code) => {
                console.log(`🔄 Stockfish fermé: ${code}`);
                this.stockfish = null;
            });

            if (this.stockfish.stdout) {
                this.stockfish.stdout.on('data', (data) => {
                    const output = data.toString();
                    if (output.includes('uciok')) {
                        console.log('🎯 Stockfish UCI prêt');
                    }
                    if (output.includes('readyok')) {
                        console.log('⚡ Stockfish configuré et optimisé');
                    }
                });
            }

        } catch (error) {
            console.error('❌ Impossible de lancer Stockfish:', error.message);
            this.stockfish = null;
        }
    }

    configureStockfish() {
        // Configuration UCI optimisée
        this.sendCommand('uci');
        
        // Configuration selon le niveau de difficulté
        const config = this.getStockfishConfig();
        
        // Appliquer la configuration
        Object.entries(config).forEach(([option, value]) => {
            this.sendCommand(`setoption name ${option} value ${value}`);
        });
        
        this.sendCommand('isready');
        console.log(`🔧 Stockfish configuré pour niveau ${this.difficulty}`);
    }

    getStockfishConfig() {
        const configs = {
            1: { // Très facile - Stockfish bridé
                'Skill Level': 0,
                'Threads': 1,
                'Hash': 8,
                'MultiPV': 1,
                'Contempt': 0,
                'UCI_LimitStrength': true,
                'UCI_Elo': 800
            },
            2: { // Facile
                'Skill Level': 5,
                'Threads': 1,
                'Hash': 16,
                'MultiPV': 1,
                'Contempt': 0,
                'UCI_LimitStrength': true,
                'UCI_Elo': 1200
            },
            3: { // Moyen
                'Skill Level': 10,
                'Threads': 1,
                'Hash': 32,
                'MultiPV': 1,
                'Contempt': 0,
                'UCI_LimitStrength': true,
                'UCI_Elo': 1600
            },
            4: { // Difficile
                'Skill Level': 15,
                'Threads': 1,
                'Hash': 64,
                'MultiPV': 1,
                'Contempt': 24,
                'UCI_LimitStrength': true,
                'UCI_Elo': 2000
            },
            5: { // Expert - Stockfish à fond
                'Skill Level': 20,
                'Threads': 1,
                'Hash': 128,
                'MultiPV': 1,
                'Contempt': 24,
                'UCI_LimitStrength': false, // Pas de limite !
                'UCI_Elo': 3000
            }
        };

        return configs[this.difficulty] || configs[3];
    }

    sendCommand(command) {
        if (this.stockfish && this.stockfish.stdin && !this.stockfish.killed) {
            try {
                this.stockfish.stdin.write(command + '\n');
                console.log(`📤 UCI: ${command}`);
            } catch (error) {
                console.error('❌ Erreur envoi commande:', error.message);
                this.stockfish = null;
            }
        }
    }

    async getBestMoveStockfish() {
        if (!this.stockfish || this.stockfish.killed) {
            console.log('⚠️ Stockfish indisponible');
            return this.getBestMoveFallback();
        }

        return new Promise((resolve) => {
            if (this.isThinking) {
                console.log('⚠️ Stockfish déjà en train de réfléchir');
                resolve(this.getBestMoveFallback());
                return;
            }

            this.isThinking = true;
            let bestMove = null;
            let responseReceived = false;
            let searchInfo = [];

            const timeoutId = setTimeout(() => {
                if (!responseReceived) {
                    console.log('⏰ Timeout Stockfish après', this.getTimeLimit(), 'ms');
                    this.isThinking = false;
                    this.sendCommand('stop'); // Arrêter la recherche
                    resolve(this.getBestMoveFallback());
                }
            }, this.getTimeLimit() + 3000);

            const dataHandler = (data) => {
                const output = data.toString();
                const lines = output.split('\n');

                for (const line of lines) {
                    // Capturer les infos de recherche
                    if (line.startsWith('info') && line.includes('depth')) {
                        searchInfo.push(line);
                    }
                    
                    if (line.startsWith('bestmove')) {
                        responseReceived = true;
                        const moveMatch = line.match(/bestmove (\w+)/);
                        if (moveMatch) {
                            const moveStr = moveMatch[1];
                            
                            // Vérifier que ce n'est pas un coup de résignation
                            if (moveStr === '(none)' || moveStr === 'resign') {
                                console.log('❌ Stockfish a abandonné');
                                bestMove = null;
                                break;
                            }
                            
                            try {
                                const move = this.chess.move(moveStr);
                                if (move) {
                                    this.chess.undo();
                                    bestMove = move;
                                    
                                    // Log détaillé
                                    const lastInfo = searchInfo[searchInfo.length - 1];
                                    console.log(`🎯 Stockfish niveau ${this.difficulty}: ${bestMove.san}`);
                                    if (lastInfo) {
                                        const depthMatch = lastInfo.match(/depth (\d+)/);
                                        const scoreMatch = lastInfo.match(/score (cp|mate) ([-\d]+)/);
                                        if (depthMatch) console.log(`   Profondeur: ${depthMatch[1]}`);
                                        if (scoreMatch) console.log(`   Évaluation: ${scoreMatch[1]} ${scoreMatch[2]}`);
                                    }
                                    break;
                                }
                            } catch (e) {
                                console.log('❌ Coup Stockfish invalide:', moveStr);
                                bestMove = null;
                            }
                        }
                        break;
                    }
                }

                if (responseReceived) {
                    clearTimeout(timeoutId);
                    this.stockfish.stdout.removeListener('data', dataHandler);
                    this.isThinking = false;
                    
                    if (bestMove) {
                        resolve(bestMove);
                    } else {
                        console.log('⚠️ Aucun coup valide trouvé');
                        resolve(this.getBestMoveFallback());
                    }
                }
            };

            this.stockfish.stdout.on('data', dataHandler);

            // Commande GO optimisée selon le niveau
            this.sendCommand('ucinewgame');
            this.sendCommand(`position fen ${this.chess.fen()}`);
            
            const goCommand = this.getGoCommand();
            console.log(`🚀 Lancement recherche: ${goCommand}`);
            this.sendCommand(goCommand);
        });
    }

    getGoCommand() {
        const commands = {
            1: 'go depth 1 movetime 100',           // Très facile
            2: 'go depth 3 movetime 300',           // Facile
            3: 'go depth 6 movetime 1000',          // Moyen
            4: 'go depth 10 movetime 3000',         // Difficile
            5: 'go depth 15 movetime 8000'          // Expert
        };

        return commands[this.difficulty] || commands[3];
    }

    getTimeLimit() {
        const limits = {
            1: 200,    // 0.2s
            2: 500,    // 0.5s
            3: 1500,   // 1.5s
            4: 4000,   // 4s
            5: 10000   // 10s
        };
        return limits[this.difficulty] || 1500;
    }

    getBestMoveFallback() {
        const moves = this.chess.moves({ verbose: true });
        if (moves.length === 0) return null;

        console.log(`🔄 IA de base niveau ${this.difficulty} (${moves.length} coups)`);

        try {
            // Évaluer tous les coups de manière simple
            const evaluatedMoves = moves.map(move => {
                this.chess.move(move);
                let score = 0;
                
                // Bonus pour les captures
                if (move.captured) {
                    score += this.getPieceValue(move.captured) * 10;
                }
                
                // Bonus pour les échecs
                if (this.chess.inCheck()) {
                    score += 50;
                }
                
                // Malus si on se met en échec
                if (this.chess.turn() !== 'b') { // Notre tour après le coup
                    score -= 200;
                }
                
                // Évaluation de position simple
                score += Math.random() * 20; // Un peu d'aléatoire
                
                this.chess.undo();
                return { move, score };
            });

            // Trier par score décroissant
            evaluatedMoves.sort((a, b) => b.score - a.score);
            
            // Choisir parmi les meilleurs coups selon le niveau
            const topMoves = evaluatedMoves.slice(0, Math.max(1, Math.floor(moves.length / (6 - this.difficulty))));
            const selectedMove = topMoves[Math.floor(Math.random() * topMoves.length)];
            
            console.log(`🎲 Fallback: ${selectedMove.move.san} (score: ${selectedMove.score.toFixed(1)})`);
            return selectedMove.move;

        } catch (error) {
            console.error('❌ Erreur fallback:', error);
            return moves[Math.floor(Math.random() * moves.length)];
        }
    }

    getPieceValue(pieceType) {
        const values = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0 };
        return values[pieceType?.toLowerCase()] || 0;
    }

    async getBestMove() {
        const moves = this.chess.moves({ verbose: true });
        if (moves.length === 0) return null;

        console.log(`🤖 IA niveau ${this.difficulty} - ${moves.length} coups possibles`);

        try {
            if (this.stockfish && !this.stockfish.killed) {
                return await this.getBestMoveStockfish();
            } else {
                console.log('⚠️ Stockfish indisponible, utilisation fallback');
                return this.getBestMoveFallback();
            }
        } catch (error) {
            console.error('❌ Erreur getBestMove:', error);
            return this.getBestMoveFallback();
        }
    }

    // Méthodes de compatibilité inchangées...
    evaluatePosition() {
        if (this.chess.isCheckmate()) {
            return this.chess.turn() === 'w' ? -9999 : 9999;
        }
        if (this.chess.isDraw()) {
            return 0;
        }

        let score = 0;
        const board = this.chess.board();
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

    loadFen(fen) {
        try {
            return this.chess.load(fen);
        } catch (error) {
            console.error('Erreur chargement FEN:', error);
            return false;
        }
    }

    reset() {
        this.chess.reset();
    }

    getState() {
        return {
            fen: this.chess.fen(),
            turn: this.chess.turn(),
            moves: this.chess.moves(),
            history: this.chess.history({ verbose: true }),
            isGameOver: this.chess.isGameOver(),
            isCheck: this.chess.inCheck(),
            isCheckmate: this.chess.isCheckmate(),
            isDraw: this.chess.isDraw(),
            hasStockfish: !!(this.stockfish && !this.stockfish.killed)
        };
    }

    cleanup() {
        if (this.stockfish && !this.stockfish.killed) {
            this.sendCommand('quit');
            setTimeout(() => {
                if (this.stockfish && !this.stockfish.killed) {
                    this.stockfish.kill('SIGTERM');
                }
            }, 1000);
            this.stockfish = null;
        }
    }
}

module.exports = ChessEngine;