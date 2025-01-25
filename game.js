class Tetris {
    constructor() {
        this.canvas = document.getElementById('gameBoard');
        this.nextCanvas = document.getElementById('nextPiece');
        this.ctx = this.canvas.getContext('2d');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        // Enable faster rendering
        this.ctx.imageSmoothingEnabled = false;
        this.nextCtx.imageSmoothingEnabled = false;
        
        this.setupCanvas();
        this.initGame();
        this.bindEvents();
        this.loadHighScores();
        
        // Request animation frame for smooth rendering
        this.lastRender = 0;
        this.lastDrop = 0;
        this.animate();
    }

    animate(timestamp = 0) {
        // Calculate time passed
        const elapsed = timestamp - this.lastRender;
        
        // Update piece position if enough time has passed
        if (!this.isPaused && !this.gameOver) {
            if (timestamp - this.lastDrop >= this.dropInterval) {
                this.movePiece(0, 1);
                this.lastDrop = timestamp;
            }
        }

        // Render the game
        this.draw();
        
        // Schedule next frame
        this.lastRender = timestamp;
        requestAnimationFrame(this.animate.bind(this));
    }

    setupCanvas() {
        // Main game board
        this.canvas.width = 300;
        this.canvas.height = 600;
        
        // Next piece preview
        this.nextCanvas.width = 100;
        this.nextCanvas.height = 100;
        
        // Setup block size
        this.blockSize = 30;
        this.cols = this.canvas.width / this.blockSize;
        this.rows = this.canvas.height / this.blockSize;
    }

    initGame() {
        // Game state
        this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.gameOver = false;
        this.isPaused = false;
        
        // Tetromino colors
        this.colors = [
            null,
            '#FF0000', // Red
            '#00FF00', // Green
            '#0000FF', // Blue
            '#FFFF00', // Yellow
            '#00FFFF', // Cyan
            '#FF00FF', // Magenta
            '#FFA500'  // Orange
        ];

        // Tetromino shapes
        this.shapes = {
            I: [[1, 1, 1, 1]],
            J: [[1, 0, 0], [1, 1, 1]],
            L: [[0, 0, 1], [1, 1, 1]],
            O: [[1, 1], [1, 1]],
            S: [[0, 1, 1], [1, 1, 0]],
            T: [[0, 1, 0], [1, 1, 1]],
            Z: [[1, 1, 0], [0, 1, 1]]
        };

        this.createNewPiece();
        this.createNextPiece();
        this.updateSpeed();
    }

    bindEvents() {
        const gameContainer = document.querySelector('.game-container');
        
        // Key state tracking for responsive controls
        this.keyStates = new Set();
        
        // Handle key events only when game container is focused
        const handleKeyDown = (e) => {
            // Only handle game controls when the game container is focused
            if (document.activeElement === gameContainer && [32, 37, 38, 39, 40].includes(e.keyCode)) {
                e.preventDefault();
                
                if (!this.gameOver && !this.isPaused && !this.keyStates.has(e.keyCode)) {
                    this.keyStates.add(e.keyCode);
                    this.handleGameInput(e.keyCode);
                }
            }
        };

        const handleKeyUp = (e) => {
            if ([32, 37, 38, 39, 40].includes(e.keyCode)) {
                this.keyStates.delete(e.keyCode);
            }
        };

        // Add event listeners
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        // Focus handling
        gameContainer.addEventListener('click', () => gameContainer.focus());
        gameContainer.addEventListener('blur', () => {
            // Clear key states when losing focus
            this.keyStates.clear();
        });

        // Other controls
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());
        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.level = parseInt(e.target.value);
            this.updateSpeed();
        });
    }

    handleGameInput(keyCode) {
        switch(keyCode) {
            case 37: // Left
                this.movePiece(-1, 0);
                break;
            case 39: // Right
                this.movePiece(1, 0);
                break;
            case 40: // Down
                this.movePiece(0, 1);
                break;
            case 38: // Up (Rotate)
                this.rotatePiece();
                break;
            case 32: // Space (Hard drop)
                this.hardDrop();
                break;
        }
    }

    updateSpeed() {
        // Make the game 2x faster by doubling the speed reduction per level
        // Base speed is 1000ms, reduce by 200ms per level (doubled from original 100ms)
        this.dropInterval = Math.max(50, 1000 - (this.level * 200));
    }

    createNewPiece() {
        if (this.nextPiece) {
            this.currentPiece = this.nextPiece;
        } else {
            const shapes = Object.keys(this.shapes);
            const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
            this.currentPiece = {
                shape: this.shapes[randomShape],
                color: this.colors[Math.floor(Math.random() * (this.colors.length - 1)) + 1],
                x: Math.floor(this.cols / 2) - Math.floor(this.shapes[randomShape][0].length / 2),
                y: 0
            };
        }
        this.createNextPiece();
    }

    createNextPiece() {
        const shapes = Object.keys(this.shapes);
        const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
        this.nextPiece = {
            shape: this.shapes[randomShape],
            color: this.colors[Math.floor(Math.random() * (this.colors.length - 1)) + 1],
            x: 0,
            y: 0
        };
        this.drawNextPiece();
    }

    drawNextPiece() {
        this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        const blockSize = 20;
        const offsetX = (this.nextCanvas.width - this.nextPiece.shape[0].length * blockSize) / 2;
        const offsetY = (this.nextCanvas.height - this.nextPiece.shape.length * blockSize) / 2;

        this.nextPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    this.nextCtx.fillStyle = this.nextPiece.color;
                    this.nextCtx.fillRect(offsetX + x * blockSize, offsetY + y * blockSize, blockSize - 1, blockSize - 1);
                }
            });
        });
    }

    movePiece(dx, dy) {
        this.currentPiece.x += dx;
        this.currentPiece.y += dy;

        if (this.collision()) {
            this.currentPiece.x -= dx;
            this.currentPiece.y -= dy;
            
            if (dy > 0) {
                this.lockPiece();
                this.clearLines();
                this.createNewPiece();
                
                if (this.collision()) {
                    this.gameOver = true;
                }
            }
            return false;
        }
        return true;
    }

    rotatePiece() {
        const originalShape = this.currentPiece.shape;
        const rotated = this.currentPiece.shape[0].map((_, i) =>
            this.currentPiece.shape.map(row => row[i]).reverse()
        );
        
        this.currentPiece.shape = rotated;
        
        if (this.collision()) {
            this.currentPiece.shape = originalShape;
        }
    }

    hardDrop() {
        while (this.movePiece(0, 1)) {}
    }

    collision() {
        return this.currentPiece.shape.some((row, dy) =>
            row.some((value, dx) => {
                if (!value) return false;
                const newX = this.currentPiece.x + dx;
                const newY = this.currentPiece.y + dy;
                return (
                    newX < 0 ||
                    newX >= this.cols ||
                    newY >= this.rows ||
                    (newY >= 0 && this.board[newY][newX])
                );
            })
        );
    }

    lockPiece() {
        this.currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    const boardY = this.currentPiece.y + y;
                    const boardX = this.currentPiece.x + x;
                    if (boardY >= 0) {
                        this.board[boardY][boardX] = this.currentPiece.color;
                    }
                }
            });
        });

        // Check for game over after locking piece
        if (this.currentPiece.y <= 0) {
            this.gameOver = true;
            this.endGame();
            return;
        }
    }

    endGame() {
        clearInterval(this.gameLoop);
        this.gameLoop = null;
        this.checkHighScore(this.score);
        this.draw(); // Draw final state with game over message
    }

    clearLines() {
        let linesCleared = 0;
        
        for (let y = this.rows - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== 0)) {
                this.board.splice(y, 1);
                this.board.unshift(Array(this.cols).fill(0));
                linesCleared++;
                y++;
            }
        }

        if (linesCleared > 0) {
            this.lines += linesCleared;
            this.score += linesCleared * 100 * this.level;
            document.getElementById('score').textContent = this.score;
            document.getElementById('lines').textContent = this.lines;
            
            // Level up every 10 lines
            const newLevel = Math.floor(this.lines / 10) + 1;
            if (newLevel > this.level) {
                this.level = newLevel;
                document.getElementById('level').textContent = this.level;
                this.updateSpeed();
            }
        }
    }

    draw() {
        // Clear canvas with a single operation
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw board - batch similar colors
        const colorGroups = new Map();
        this.board.forEach((row, y) => {
            row.forEach((color, x) => {
                if (color) {
                    if (!colorGroups.has(color)) {
                        colorGroups.set(color, []);
                    }
                    colorGroups.get(color).push({x, y});
                }
            });
        });

        // Draw each color group
        colorGroups.forEach((positions, color) => {
            this.ctx.fillStyle = color;
            positions.forEach(({x, y}) => {
                this.ctx.fillRect(
                    x * this.blockSize,
                    y * this.blockSize,
                    this.blockSize - 1,
                    this.blockSize - 1
                );
            });
        });

        // Draw current piece
        if (this.currentPiece) {
            this.ctx.fillStyle = this.currentPiece.color;
            this.currentPiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        this.ctx.fillRect(
                            (this.currentPiece.x + x) * this.blockSize,
                            (this.currentPiece.y + y) * this.blockSize,
                            this.blockSize - 1,
                            this.blockSize - 1
                        );
                    }
                });
            });
        }

        // Draw grid
        this.drawGrid();

        // Draw game over
        if (this.gameOver) {
            this.drawGameOver();
        }
    }

    drawBlock(x, y, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(
            x * this.blockSize,
            y * this.blockSize,
            this.blockSize - 1,
            this.blockSize - 1
        );
    }

    drawGrid() {
        this.ctx.strokeStyle = '#CCCCCC';
        this.ctx.lineWidth = 0.5;

        // Vertical lines
        for (let x = 0; x <= this.cols; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.blockSize, 0);
            this.ctx.lineTo(x * this.blockSize, this.canvas.height);
            this.ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= this.rows; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.blockSize);
            this.ctx.lineTo(this.canvas.width, y * this.blockSize);
            this.ctx.stroke();
        }
    }

    drawGameOver() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '30px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 40);
        this.ctx.fillText('Press Reset to play again', this.canvas.width / 2, this.canvas.height / 2 + 80);
    }

    loadHighScores() {
        this.highScores = JSON.parse(localStorage.getItem('tetrisHighScores')) || [];
        this.updateHighScoresDisplay();
    }

    updateHighScoresDisplay() {
        const highScoresList = document.getElementById('highScoresList');
        highScoresList.innerHTML = '';
        
        this.highScores
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
            .forEach((score, index) => {
                const scoreItem = document.createElement('div');
                scoreItem.className = 'score-item';
                scoreItem.innerHTML = `
                    <span>#${index + 1} ${score.name}</span>
                    <span>${score.score}</span>
                `;
                highScoresList.appendChild(scoreItem);
            });
    }

    checkHighScore(score) {
        const lowestScore = this.highScores.length < 10 ? 0 : 
            Math.min(...this.highScores.map(s => s.score));
        
        if (this.highScores.length < 10 || score > lowestScore) {
            const form = document.getElementById('newHighScoreForm');
            const input = document.getElementById('playerName');
            form.classList.remove('hidden');
            input.value = ''; // Clear any previous input
            input.focus();

            // Remove any existing event listeners
            const saveButton = document.getElementById('saveScore');
            const newSaveButton = saveButton.cloneNode(true);
            saveButton.parentNode.replaceChild(newSaveButton, saveButton);

            // Add new event listener
            newSaveButton.addEventListener('click', () => {
                const name = input.value.trim() || 'Anonymous';
                this.highScores.push({ name, score });
                this.highScores.sort((a, b) => b.score - a.score);
                if (this.highScores.length > 10) {
                    this.highScores.pop();
                }
                localStorage.setItem('tetrisHighScores', JSON.stringify(this.highScores));
                this.updateHighScoresDisplay();
                form.classList.add('hidden');
            });
        }
    }

    startGame() {
        if (!this.gameLoop) {
            this.resetGame();
            this.lastDrop = performance.now();
            this.gameLoop = true;
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        document.getElementById('pauseBtn').textContent = this.isPaused ? 'Resume' : 'Pause';
    }

    resetGame() {
        clearInterval(this.gameLoop);
        this.gameLoop = null;
        this.initGame();
        document.getElementById('newHighScoreForm').classList.add('hidden');
        this.draw();
    }
}

// Start the game when the window loads
window.addEventListener('load', () => {
    const game = new Tetris();
    game.draw();
});
