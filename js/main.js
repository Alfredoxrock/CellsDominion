// Main game controller
import { Simulation } from './simulation.js';
import { UIManager } from './ui.js';
import { Camera } from './camera.js';

class CellDefenseSimulator {
    constructor() {
        console.log('🚀 CellDefenseSimulator constructor starting...');

        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        console.log('Canvas:', this.canvas);
        console.log('Context:', this.ctx);

        // World and camera settings
        this.worldWidth = 4000; // Large world size
        this.worldHeight = 3000;

        // Game state
        this.isRunning = true;
        this.lastTime = 0;
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS;
        this.errorMessages = [];

        try {
            // Initialize camera system
            console.log('📷 Creating Camera...');
            this.camera = new Camera(this.canvas.width, this.canvas.height, this.worldWidth, this.worldHeight);
            this.camera.centerOn(this.worldWidth / 2, this.worldHeight / 2); // Start centered
            console.log('✅ Camera created');

            // Initialize systems
            console.log('📦 Creating Simulation...');
            this.simulation = new Simulation(this.worldWidth, this.worldHeight);
            console.log('✅ Simulation created');

            console.log('📦 Creating UIManager...');
            this.ui = new UIManager();
            console.log('✅ UIManager created');

            this.init();
        } catch (error) {
            console.error('❌ Constructor error:', error);
            this.errorMessages.push('Constructor: ' + error.message);
            this.drawError();
        }
    }

    drawError() {
        if (this.ctx && this.errorMessages.length > 0) {
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.fillStyle = '#ff0000';
            this.ctx.font = '18px Arial';
            this.ctx.fillText('🚨 ERRORS DETECTED:', 50, 50);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '14px Arial';
            this.errorMessages.forEach((msg, i) => {
                this.ctx.fillText(msg, 50, 80 + (i * 20));
            });
        }
    }

    init() {
        console.log('🧬 Initializing Cell Defense Simulator...');

        try {
            // Set up event listeners
            console.log('📋 Setting up controls...');
            this.setupControls();

            // Initialize simulation with default settings
            console.log('🔄 Resetting simulation...');
            this.resetSimulation();

            // Start game loop
            console.log('🎮 Starting game loop...');
            this.gameLoop();

            console.log('✅ Simulator initialized successfully!');
        } catch (error) {
            console.error('❌ Error during initialization:', error);
            // Draw error on canvas
            this.ctx.fillStyle = '#ff0000';
            this.ctx.font = '20px Arial';
            this.ctx.fillText('Error: ' + error.message, 50, 50);
        }
    }

    setupControls() {
        // Play/Pause button
        document.getElementById('playPause').addEventListener('click', () => {
            this.togglePlayPause();
        });

        // Reset button
        document.getElementById('reset').addEventListener('click', () => {
            this.resetSimulation();
        });

        // Step simulation button
        document.getElementById('stepSimulation').addEventListener('click', () => {
            if (!this.isRunning) {
                this.simulation.update();
                this.render();
                this.ui.updateStats(this.simulation.getStats());
            }
        });

        // Settings sliders
        document.getElementById('cellCount').addEventListener('input', (e) => {
            this.simulation.settings.initialCells = parseInt(e.target.value);
        });

        document.getElementById('foodSpawnRate').addEventListener('input', (e) => {
            this.simulation.settings.foodSpawnRate = parseFloat(e.target.value);
        });

        document.getElementById('mutationRate').addEventListener('input', (e) => {
            this.simulation.settings.mutationRate = parseFloat(e.target.value);
        });

        document.getElementById('simSpeed').addEventListener('input', (e) => {
            this.simulation.settings.simulationSpeed = parseFloat(e.target.value);
        });

        // Tournament controls
        const startTournamentBtn = document.getElementById('startTournament');
        const nextRoundBtn = document.getElementById('nextRound');

        if (startTournamentBtn) {
            startTournamentBtn.addEventListener('click', () => {
                this.startTournament();
            });
        }

        if (nextRoundBtn) {
            nextRoundBtn.addEventListener('click', () => {
                this.simulation.endRound();
            });
        }

        // Camera/Navigation controls
        this.setupCameraControls();
    }

    setupCameraControls() {
        // Zoom controls
        const zoomInBtn = document.getElementById('zoomIn');
        const zoomOutBtn = document.getElementById('zoomOut');

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                this.camera.zoomBy(1.2);
                this.updateZoomDisplay();
            });
        }

        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                this.camera.zoomBy(0.8);
                this.updateZoomDisplay();
            });
        }

        // Pan controls
        const panUp = document.getElementById('panUp');
        const panDown = document.getElementById('panDown');
        const panLeft = document.getElementById('panLeft');
        const panRight = document.getElementById('panRight');
        const panCenter = document.getElementById('panCenter');

        if (panUp) panUp.addEventListener('click', () => this.camera.pan(0, -this.camera.panSpeed));
        if (panDown) panDown.addEventListener('click', () => this.camera.pan(0, this.camera.panSpeed));
        if (panLeft) panLeft.addEventListener('click', () => this.camera.pan(-this.camera.panSpeed, 0));
        if (panRight) panRight.addEventListener('click', () => this.camera.pan(this.camera.panSpeed, 0));
        if (panCenter) {
            panCenter.addEventListener('click', () => {
                this.camera.centerOn(this.worldWidth / 2, this.worldHeight / 2);
            });
        }

        // Mouse controls for canvas
        this.canvas.addEventListener('mousedown', (e) => {
            this.camera.handleMouseDown(e);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            this.camera.handleMouseMove(e);
        });

        this.canvas.addEventListener('mouseup', (e) => {
            this.camera.handleMouseUp(e);
        });

        this.canvas.addEventListener('wheel', (e) => {
            this.camera.handleWheel(e);
            this.updateZoomDisplay();
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            const panSpeed = this.camera.panSpeed;

            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    this.camera.pan(0, -panSpeed);
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    this.camera.pan(0, panSpeed);
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    this.camera.pan(-panSpeed, 0);
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    this.camera.pan(panSpeed, 0);
                    e.preventDefault();
                    break;
                case '+':
                case '=':
                    this.camera.zoomBy(1.1);
                    this.updateZoomDisplay();
                    e.preventDefault();
                    break;
                case '-':
                    this.camera.zoomBy(0.9);
                    this.updateZoomDisplay();
                    e.preventDefault();
                    break;
                case 'c':
                case 'C':
                    this.camera.centerOn(this.worldWidth / 2, this.worldHeight / 2);
                    e.preventDefault();
                    break;
            }
        });
    }

    updateZoomDisplay() {
        const zoomElement = document.getElementById('zoomLevel');
        if (zoomElement) {
            zoomElement.textContent = `${Math.round(this.camera.zoom * 100)}%`;
        }
    }

    startTournament() {
        console.log('🏁 Starting tournament mode!');
        this.simulation.startTournament(10); // 10 rounds
        this.isRunning = true;
        document.getElementById('playPause').textContent = '⏸️ Pause';
    }

    togglePlayPause() {
        this.isRunning = !this.isRunning;
        const button = document.getElementById('playPause');
        button.textContent = this.isRunning ? '⏸️ Pause' : '▶️ Play';
    }

    resetSimulation() {
        console.log('🔄 Resetting simulation...');

        // Get current settings from UI
        const cellCount = parseInt(document.getElementById('cellCount').value);
        const foodSpawnRate = parseFloat(document.getElementById('foodSpawnRate').value);
        const mutationRate = parseFloat(document.getElementById('mutationRate').value);
        const simSpeed = parseFloat(document.getElementById('simSpeed').value);

        // Reset simulation with new settings
        this.simulation.reset({
            initialCells: cellCount,
            foodSpawnRate: foodSpawnRate,
            mutationRate: mutationRate,
            simulationSpeed: simSpeed
        });

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update UI
        this.ui.reset();
        this.ui.updateStats(this.simulation.getStats());

        // Ensure we're in play mode
        this.isRunning = true;
        document.getElementById('playPause').textContent = '⏸️ Pause';
    }

    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;

        if (deltaTime >= this.frameInterval) {
            if (this.isRunning) {
                // Update simulation
                this.simulation.update();

                // Update UI stats
                this.ui.updateStats(this.simulation.getStats());
            }

            // Always render (even when paused)
            this.render();

            this.lastTime = currentTime;
        }

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    render() {
        try {
            // Update camera
            this.camera.update();

            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // Apply camera transformation
            this.camera.applyTransform(this.ctx);

            // Draw background pattern
            this.drawBackground();

            // Render simulation with camera-aware rendering
            this.simulation.render(this.ctx, this.camera);

            // Remove camera transformation
            this.camera.removeTransform(this.ctx);

            // Draw UI overlay info (always on top, not affected by camera)
            this.drawOverlay();
            this.drawCameraInfo();
        } catch (error) {
            console.error('❌ Render error:', error);
            // Draw error on canvas
            this.ctx.fillStyle = '#ff0000';
            this.ctx.font = '16px Arial';
            this.ctx.fillText('Render Error: ' + error.message, 50, 100);
        }
    }

    drawBackground() {
        // Draw subtle grid pattern that covers the world
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        this.ctx.lineWidth = 1;

        const gridSize = 100; // Larger grid for bigger world

        // Calculate visible grid bounds based on camera
        const startX = Math.floor(this.camera.x / gridSize) * gridSize;
        const startY = Math.floor(this.camera.y / gridSize) * gridSize;
        const endX = Math.min(this.worldWidth, this.camera.x + (this.canvas.width / this.camera.zoom) + gridSize);
        const endY = Math.min(this.worldHeight, this.camera.y + (this.canvas.height / this.camera.zoom) + gridSize);

        // Vertical lines
        for (let x = startX; x <= endX; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, Math.max(0, this.camera.y));
            this.ctx.lineTo(x, Math.min(this.worldHeight, this.camera.y + (this.canvas.height / this.camera.zoom)));
            this.ctx.stroke();
        }

        // Horizontal lines  
        for (let y = startY; y <= endY; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(Math.max(0, this.camera.x), y);
            this.ctx.lineTo(Math.min(this.worldWidth, this.camera.x + (this.canvas.width / this.camera.zoom)), y);
            this.ctx.stroke();
        }

        // Draw world boundaries
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(0, 0, this.worldWidth, this.worldHeight);
    }

    drawCameraInfo() {
        // Display camera information in top-right corner
        const info = this.camera.getInfo();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(this.canvas.width - 200, 10, 190, 80);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px monospace';
        this.ctx.fillText(`Camera: (${info.x}, ${info.y})`, this.canvas.width - 190, 30);
        this.ctx.fillText(`Zoom: ${info.zoom}%`, this.canvas.width - 190, 45);
        this.ctx.fillText(`View: ${info.viewWidth}×${info.viewHeight}`, this.canvas.width - 190, 60);
        this.ctx.fillText(`World: ${this.worldWidth}×${this.worldHeight}`, this.canvas.width - 190, 75);
    }

    drawOverlay() {
        // Draw pause overlay if paused
        if (!this.isRunning) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.textAlign = 'left';
        }
    }
}

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CellDefenseSimulator();
});

export { CellDefenseSimulator };