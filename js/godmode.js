// God Mode controls for Cell Defense Simulator
class GodMode {
    constructor(simulation) {
        this.simulation = simulation;
        this.clickPosition = null;
        this.initializeControls();
        this.initializeCanvas();
    }

    initializeControls() {
        // Resource controls
        document.getElementById('spawnFood')?.addEventListener('click', () => this.spawnFood());
        document.getElementById('famine')?.addEventListener('click', () => this.causeFamine());
        document.getElementById('abundance')?.addEventListener('click', () => this.createAbundance());

        // Disaster controls
        document.getElementById('meteor')?.addEventListener('click', () => this.triggerMeteor());
        document.getElementById('plague')?.addEventListener('click', () => this.triggerPlague());
        document.getElementById('toxicSpill')?.addEventListener('click', () => this.triggerToxicSpill());
        document.getElementById('radiation')?.addEventListener('click', () => this.triggerRadiation());

        // Climate controls
        document.getElementById('heatwave')?.addEventListener('click', () => this.triggerHeatwave());
        document.getElementById('iceage')?.addEventListener('click', () => this.triggerIceAge());
        document.getElementById('normalClimate')?.addEventListener('click', () => this.restoreClimate());

        // Evolution controls
        document.getElementById('massExtinction')?.addEventListener('click', () => this.massExtinction());
        document.getElementById('mutationBoost')?.addEventListener('click', () => this.mutationBoost());
        document.getElementById('superCell')?.addEventListener('click', () => this.createSuperCell());

        // Environmental sliders
        this.initializeSliders();
    }

    initializeCanvas() {
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.addEventListener('click', (e) => {
                const rect = canvas.getBoundingClientRect();
                this.clickPosition = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
            });
        }
    }

    initializeSliders() {
        const tempSlider = document.getElementById('tempSlider');
        const toxicSlider = document.getElementById('toxicSlider');
        const radiationSlider = document.getElementById('radiationSlider');

        if (tempSlider) {
            tempSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                document.getElementById('tempValue').textContent = value + '%';
                this.simulation.environment.temperature = value / 100;
            });
        }

        if (toxicSlider) {
            toxicSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                document.getElementById('toxicValue').textContent = value + '%';
                this.simulation.environment.toxicity = value / 100;
            });
        }

        if (radiationSlider) {
            radiationSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                document.getElementById('radiationValue').textContent = value + '%';
                this.simulation.environment.radiation = value / 100;
            });
        }
    }

    // Resource controls
    spawnFood() {
        const position = this.clickPosition || this.getRandomPosition();
        console.log('🍎 God spawned food!');

        // Spawn multiple food particles
        for (let i = 0; i < 10; i++) {
            this.simulation.foodManager.spawnAt(
                position.x + (Math.random() - 0.5) * 100,
                position.y + (Math.random() - 0.5) * 100,
                8 + Math.random() * 12 // Large food particles
            );
        }
        this.clickPosition = null;
    }

    causeFamine() {
        console.log('💀 God caused a famine!');
        this.simulation.environment.resourceAvailability = 0.1;
        this.simulation.settings.foodSpawnRate = 0.1;
        this.simulation.foodManager.setSpawnRate(0.1);

        // Remove existing food
        const food = this.simulation.foodManager.getFood();
        food.forEach(f => f.consumed = true);
    }

    createAbundance() {
        console.log('🌾 God created abundance!');
        this.simulation.environment.resourceAvailability = 2.0;
        this.simulation.settings.foodSpawnRate = 10.0;
        this.simulation.foodManager.setSpawnRate(10.0);

        // Spawn lots of food everywhere
        for (let i = 0; i < 100; i++) {
            this.simulation.foodManager.spawnAt(
                Math.random() * this.simulation.width,
                Math.random() * this.simulation.height,
                5 + Math.random() * 10
            );
        }
    }

    // Disaster controls
    triggerMeteor() {
        const position = this.clickPosition || this.getRandomPosition();
        console.log('☄️ God triggered a meteor strike!');

        this.simulation.environment.triggerRandomDisaster = () => {
            return {
                type: 'meteor',
                x: position.x,
                y: position.y,
                radius: 150 + Math.random() * 100,
                intensity: 0.8 + Math.random() * 0.2,
                duration: 600,
                age: 0
            };
        };

        const disaster = this.simulation.environment.triggerRandomDisaster();
        this.simulation.environment.disasters.push(disaster);
        this.clickPosition = null;
    }

    triggerPlague() {
        console.log('🦠 God triggered a plague outbreak!');

        // Infect random cells
        const cellsToInfect = Math.min(10, Math.floor(this.simulation.cells.length * 0.3));
        for (let i = 0; i < cellsToInfect; i++) {
            const cell = this.simulation.cells[Math.floor(Math.random() * this.simulation.cells.length)];
            if (cell && !cell.isInfected) {
                cell.isInfected = true;
                cell.infectionTimer = 400 + Math.random() * 200;
                cell.infectionSeverity = 0.7 + Math.random() * 0.3;
            }
        }
    }

    triggerToxicSpill() {
        const position = this.clickPosition || this.getRandomPosition();
        console.log('☢️ God triggered a toxic spill!');

        // Add toxic hazard zone
        this.simulation.environment.hazardZones.push({
            x: position.x,
            y: position.y,
            radius: 120,
            type: 'acid',
            intensity: 0.9,
            pulsePhase: 0,
            temporary: true,
            lifetime: 1000
        });

        this.simulation.environment.toxicity = Math.min(1.0, this.simulation.environment.toxicity + 0.3);
        this.clickPosition = null;
    }

    triggerRadiation() {
        console.log('☢️ God triggered a radiation storm!');
        this.simulation.environment.radiation = Math.min(1.0, this.simulation.environment.radiation + 0.5);

        // Cause random mutations in all cells
        this.simulation.cells.forEach(cell => {
            if (Math.random() < 0.3) {
                this.simulation.applyRadiationMutation(cell);
            }
        });
    }

    // Climate controls
    triggerHeatwave() {
        console.log('🔥 God triggered a heatwave!');
        this.simulation.environment.temperature = 0.9;
        this.simulation.environment.humidity = 0.2;

        // Add heat damage to cells
        this.simulation.cells.forEach(cell => {
            if (cell.traits.temperatureTolerance < 0.7) {
                cell.traits.health -= 10;
                cell.traits.energy -= 15;
            }
        });
    }

    triggerIceAge() {
        console.log('🧊 God triggered an ice age!');
        this.simulation.environment.temperature = 0.1;
        this.simulation.environment.resourceAvailability = 0.3;
        this.simulation.settings.foodSpawnRate *= 0.2;

        // Slow down all cells
        this.simulation.cells.forEach(cell => {
            cell.traits.speed *= 0.6;
            if (cell.traits.temperatureTolerance < 0.4) {
                cell.traits.health -= 15;
            }
        });
    }

    restoreClimate() {
        console.log('🌍 God restored normal climate!');
        this.simulation.environment.temperature = 0.5;
        this.simulation.environment.humidity = 0.5;
        this.simulation.environment.resourceAvailability = 1.0;
        this.simulation.environment.toxicity = 0.0;
        this.simulation.environment.radiation = 0.0;
        this.simulation.settings.foodSpawnRate = 2.0;
        this.simulation.foodManager.setSpawnRate(2.0);
    }

    // Evolution controls
    massExtinction() {
        console.log('💀 God triggered mass extinction!');

        const survivorCount = Math.max(5, Math.floor(this.simulation.cells.length * 0.1));
        const survivors = this.simulation.cells
            .sort((a, b) => (b.fitnessScore || 0) - (a.fitnessScore || 0))
            .slice(0, survivorCount);

        // Remove all but the fittest
        this.simulation.cells = survivors;

        // Add environmental damage
        this.simulation.environment.toxicity = 0.8;
        this.simulation.environment.radiation = 0.6;
    }

    mutationBoost() {
        console.log('🧬 God boosted mutations!');

        // Temporarily increase mutation rate
        const oldRate = this.simulation.settings.mutationRate;
        this.simulation.settings.mutationRate = 0.8;

        // Trigger mutations in all cells
        this.simulation.cells.forEach(cell => {
            if (Math.random() < 0.5) {
                const mutatedTraits = cell.mutate(0.8);
                Object.assign(cell.traits, mutatedTraits);
                cell.dna = mutatedTraits.dna;
            }
        });

        // Restore normal rate after 5 seconds
        setTimeout(() => {
            this.simulation.settings.mutationRate = oldRate;
        }, 5000);
    }

    createSuperCell() {
        const position = this.clickPosition || this.getRandomPosition();
        console.log('💫 God created a super cell!');

        // Create cell with amazing traits
        const superTraits = {
            size: 18,
            speed: 3.0,
            maxHealth: 200,
            health: 200,
            maxEnergy: 150,
            energy: 150,
            defenseType: 'shield',
            shape: 'star',
            specialAbility: 'fusion',
            socialBehavior: 'cooperative',
            temperatureTolerance: 0.9,
            toxinResistance: 0.8,
            radiationResistance: 0.7,
            visionRange: 120,
            generation: this.simulation.generation + 10,
            fitnessBonus: 5.0
        };

        const superCell = new Cell(position.x, position.y, superTraits);
        superCell.name = "🌟 Divine Creation";
        superCell.colonyRole = 'builder';
        this.simulation.cells.push(superCell);
        this.clickPosition = null;
    }

    getRandomPosition() {
        return {
            x: 100 + Math.random() * (this.simulation.width - 200),
            y: 100 + Math.random() * (this.simulation.height - 200)
        };
    }
}

export { GodMode };