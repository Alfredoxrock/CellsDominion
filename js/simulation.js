// Main simulation controller - orchestrates all systems
import { Cell, Virus } from './cell.js';
import { FoodManager } from './food.js';
import { Environment } from './environment.js';

class Simulation {
    constructor(width, height) {
        this.width = width;
        this.height = height;

        // Simulation state
        this.cells = [];
        this.viruses = []; // Separate array for viruses
        this.colonies = []; // Array to track active colonies
        this.foodManager = new FoodManager(width, height);
        this.environment = new Environment(width, height);
        this.tick = 0;
        this.generation = 1;
        this.maxGeneration = 1;

        // Round system
        this.currentRound = 1;
        this.maxRounds = 10;
        this.roundDuration = 3000; // ticks per round (50 seconds at 60fps)
        this.roundTick = 0;
        this.roundWinners = [];
        this.allTimeChampions = [];
        this.roundInProgress = false;
        this.roundResults = [];

        // Settings
        this.settings = {
            initialCells: 50, // Start with more cells for larger world
            foodSpawnRate: 2.0, // More food for larger world
            mutationRate: 0.1,
            simulationSpeed: 1.0,
            maxCells: 1000, // Increased from 200 to 1000
            winnersPerRound: 8, // More winners for larger populations
            roundDuration: 3000,
            virusSpawnRate: 0.008, // Chance per tick to spawn a virus (about 1 every 2 seconds)
            maxViruses: 10 // Maximum number of viruses at once
        };

        // Statistics
        this.stats = {
            totalCells: 0,
            generation: 1,
            tick: 0,
            foodCount: 0,
            // Round statistics
            currentRound: 1,
            roundTick: 0,
            roundTimeLeft: this.roundDuration,
            roundWinners: 0,
            roundStatus: 'waiting', // waiting, active, ending, finished
            champions: [],
            traitDistribution: {
                total: 0,
                counts: {
                    spikes: 0,
                    poison: 0,
                    armor: 0,
                    regen: 0,
                    camo: 0
                }
            },
            populationHistory: [],
            extinctions: 0
        };

        console.log('🧬 Simulation initialized');
    }

    reset(newSettings = {}) {
        console.log('🔄 Resetting simulation...');

        // Update settings
        this.settings = { ...this.settings, ...newSettings };

        // Reset state
        this.cells = [];
        this.tick = 0;
        this.generation = 1;
        this.maxGeneration = 1;

        // Reset food system
        this.foodManager.reset();
        this.foodManager.setSpawnRate(this.settings.foodSpawnRate);

        // Spawn initial cells
        this.spawnInitialCells();

        // Reset stats
        this.stats = {
            totalCells: this.cells.length,
            generation: 1,
            tick: 0,
            foodCount: this.foodManager.getFood().length,
            traitDistribution: this.calculateTraitDistribution(),
            populationHistory: [],
            extinctions: 0
        };

        console.log(`✅ Simulation reset with ${this.cells.length} initial cells`);
    }

    spawnInitialCells() {
        for (let i = 0; i < this.settings.initialCells; i++) {
            const x = 50 + Math.random() * (this.width - 100);
            const y = 50 + Math.random() * (this.height - 100);

            // Create cells with random initial traits
            const cell = new Cell(x, y, {
                generation: 1
            });

            this.cells.push(cell);
        }
    }

    update() {
        if (this.settings.simulationSpeed <= 0) return;

        // Apply simulation speed multiplier
        const speedMultiplier = this.settings.simulationSpeed;
        const updates = Math.max(1, Math.floor(speedMultiplier));
        const partialUpdate = speedMultiplier % 1;

        for (let i = 0; i < updates; i++) {
            this.updateSingleStep();
        }

        // Handle partial updates for smooth speed control
        if (partialUpdate > 0 && Math.random() < partialUpdate) {
            this.updateSingleStep();
        }
    }

    updateSingleStep() {
        this.tick++;
        this.roundTick++;

        // Check for round progression
        this.updateRoundSystem();

        // Generate environmental conditions
        const environment = this.generateEnvironment();

        // Update food system
        this.foodManager.update();
        const food = this.foodManager.getFood();

        // Track cells that need to be removed
        const deadCells = [];
        const newCells = [];

        // Update all cells with environmental effects
        this.cells.forEach((cell, index) => {
            const isAlive = cell.update(this.cells, food, { width: this.width, height: this.height }, environment);

            // Track cell performance for round scoring
            if (isAlive) {
                this.updateCellScore(cell);
            }

            if (!isAlive || cell.traits.health <= 0) {
                deadCells.push({ cell, index });
            } else {
                // Handle food consumption
                food.forEach(foodParticle => {
                    if (cell.eat(foodParticle)) {
                        cell.roundStats.foodEaten++;
                    }
                });

                // Handle cell combat with new defense mechanisms
                this.cells.forEach(other => {
                    if (other !== cell && cell.collidesWith(other)) {
                        this.handleCellInteraction(cell, other);
                    }
                });

                // Handle reproduction
                if (cell.reproduced) {
                    const offspring = cell.reproduce(this.settings.mutationRate);
                    if (offspring && this.cells.length < this.settings.maxCells) {
                        newCells.push(offspring);
                        this.maxGeneration = Math.max(this.maxGeneration, offspring.generation);
                    }
                }
            }
        });

        // Remove dead cells and spawn food from their corpses
        deadCells.reverse().forEach(({ cell, index }) => {
            this.foodManager.spawnFromDeath(cell.x, cell.y, cell.traits.size);
            this.cells.splice(index, 1);
        });

        // Add new cells
        this.cells.push(...newCells);

        // Update viruses
        this.updateViruses(food, environment);

        // Spawn new viruses occasionally
        this.spawnViruses();

        // Update colonies
        this.updateColonies();

        // Check for extinction and respawn if needed
        if (this.cells.length === 0) {
            console.log('💀 Population extinct! Respawning...');
            this.stats.extinctions++;
            this.spawnInitialCells();
        }

        // Update generation based on living cells
        if (this.cells.length > 0) {
            this.generation = Math.floor(this.cells.reduce((sum, cell) => sum + cell.generation, 0) / this.cells.length);
        }

        // Apply poison damage
        this.applyPoisonEffects();

        // Update statistics
        this.updateStats();
    }

    updateViruses(food, environment) {
        const deadViruses = [];

        // Update each virus
        this.viruses.forEach((virus, index) => {
            const isAlive = virus.update(this.cells, food, this.width, this.height);

            if (!isAlive || virus.traits.health <= 0) {
                deadViruses.push(index);
            }
        });

        // Remove dead viruses
        deadViruses.reverse().forEach(index => {
            this.viruses.splice(index, 1);
        });
    }

    spawnViruses() {
        if (this.viruses.length >= this.settings.maxViruses) return;
        if (this.cells.length < 10) return; // Need some cells to justify virus spawning

        if (Math.random() < this.settings.virusSpawnRate) {
            const x = Math.random() * this.width;
            const y = Math.random() * this.height;

            const virus = new Virus(x, y);
            this.viruses.push(virus);

            console.log(`🦠 New virus spawned: ${virus.name}`);
        }
    }

    updateColonies() {
        // Update existing colonies
        this.colonies.forEach((colony, index) => {
            if (colony.members.length === 0) {
                // Remove empty colonies
                this.colonies.splice(index, 1);
                return;
            }

            // Update colony structure
            colony.updateStructure();

            // Share resources among colony members
            if (colony.members.length > 1) {
                colony.shareResources();
            }
        });

        // Find new colonies that have been formed
        this.cells.forEach(cell => {
            if (cell.colony && !this.colonies.includes(cell.colony)) {
                this.colonies.push(cell.colony);
            }
        });
    }

    applyPoisonEffects() {
        this.cells.forEach(cell => {
            if (cell.traits.defenseType !== 'poison') return;
            if (cell.defenseStates.poisonAura <= 0) return;

            const poisonRadius = cell.radius + 20;

            this.cells.forEach(target => {
                if (target === cell) return;

                const dx = target.x - cell.x;
                const dy = target.y - cell.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < poisonRadius) {
                    target.traits.health -= 0.3; // Poison damage over time
                    target.traits.energy -= 0.2; // Also drains energy
                }
            });
        });
    }

    updateStats() {
        this.stats.totalCells = this.cells.length;
        this.stats.generation = this.generation;
        this.stats.tick = this.tick;
        this.stats.foodCount = this.foodManager.getFood().length;
        this.stats.traitDistribution = this.calculateTraitDistribution();

        // Record population history for charts
        if (this.tick % 10 === 0) {
            this.stats.populationHistory.push({
                tick: this.tick,
                population: this.cells.length,
                food: this.stats.foodCount
            });

            // Limit history to prevent memory issues
            if (this.stats.populationHistory.length > 1000) {
                this.stats.populationHistory = this.stats.populationHistory.slice(-500);
            }
        }
    }

    calculateTraitDistribution() {
        const distribution = {
            total: this.cells.length,
            counts: {}
        };

        // Initialize all possible trait counts
        const allTraits = [
            // Defense types
            'spikes', 'poison', 'armor', 'regen', 'camo', 'shield', 'electric', 'magnetic', 'phase', 'swarm', 'mimic', 'explosive', 'viral', 'barrier', 'reflect',
            // Shapes (with shape- prefix to match HTML)
            'shape-circle', 'shape-triangle', 'shape-square', 'shape-hexagon', 'shape-oval', 'shape-star', 'shape-diamond',
            // Abilities (with ability- prefix to match HTML) 
            'ability-none', 'ability-photosynthesis', 'ability-parasite', 'ability-pack_hunter', 'ability-territorial', 'ability-migratory', 'ability-burrowing', 'ability-leaping', 'ability-splitting', 'ability-fusion', 'ability-time_dilation', 'ability-energy_vampire', 'ability-shape_shift', 'ability-invisibility',
            // Life stages (with stage- prefix to match HTML)
            'stage-juvenile', 'stage-adult', 'stage-elder'
        ];

        // Initialize all counts to zero
        allTraits.forEach(trait => {
            distribution.counts[trait] = 0;
        });

        // Count actual traits from cells
        this.cells.forEach(cell => {
            // Count defense types directly
            if (distribution.counts.hasOwnProperty(cell.traits.defenseType)) {
                distribution.counts[cell.traits.defenseType]++;
            }

            // Count shapes with prefix
            const shapeKey = `shape-${cell.traits.shape}`;
            if (distribution.counts.hasOwnProperty(shapeKey)) {
                distribution.counts[shapeKey]++;
            }

            // Count abilities with prefix
            const abilityKey = `ability-${cell.traits.specialAbility}`;
            if (distribution.counts.hasOwnProperty(abilityKey)) {
                distribution.counts[abilityKey]++;
            }

            // Count life stages with prefix  
            const stageKey = `stage-${cell.traits.lifestage}`;
            if (distribution.counts.hasOwnProperty(stageKey)) {
                distribution.counts[stageKey]++;
            }
        });

        return distribution;
    }

    render(ctx) {
        // Render food first (background layer)
        this.foodManager.render(ctx);

        // Render colonies (background structures)
        this.colonies.forEach(colony => colony.render(ctx));

        // Render cells
        this.cells.forEach(cell => cell.render(ctx));

        // Render viruses (foreground - they should be visible)
        this.viruses.forEach(virus => virus.render(ctx));

        // Render debug info if needed
        if (this.showDebugInfo) {
            this.renderDebugInfo(ctx);
        }
    }

    renderDebugInfo(ctx) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '12px Arial';
        ctx.fillText(`Cells: ${this.cells.length}`, 10, 20);
        ctx.fillText(`Food: ${this.foodManager.getFood().length}`, 10, 35);
        ctx.fillText(`Tick: ${this.tick}`, 10, 50);
        ctx.fillText(`Gen: ${this.generation}`, 10, 65);
    }

    getStats() {
        // Update round statistics
        this.stats.currentRound = this.currentRound;
        this.stats.roundTick = this.roundTick;
        this.stats.roundTimeLeft = this.roundDuration - this.roundTick;
        this.stats.roundWinners = this.roundWinners.length;
        this.stats.roundStatus = this.getRoundStatus();
        this.stats.champions = this.allTimeChampions.slice(-5); // Show last 5 champions

        return { ...this.stats };
    }

    // Round System Methods
    updateRoundSystem() {
        if (this.roundTick >= this.roundDuration) {
            this.endRound();
        }

        // Update round status
        if (this.roundTick < 300) { // First 5 seconds
            this.stats.roundStatus = 'starting';
        } else if (this.roundTick >= this.roundDuration - 300) { // Last 5 seconds
            this.stats.roundStatus = 'ending';
        } else {
            this.stats.roundStatus = 'active';
        }
    }

    updateCellScore(cell) {
        // Initialize round stats if not present
        if (!cell.roundStats) {
            cell.roundStats = {
                survivalTime: 0,
                foodEaten: 0,
                combatWins: 0,
                damageTaken: 0,
                distanceTraveled: 0,
                fitnessScore: 0,
                lastX: cell.x,
                lastY: cell.y
            };
        }

        // Update survival time
        cell.roundStats.survivalTime++;

        // Update distance traveled
        const distance = Math.sqrt(
            Math.pow(cell.x - cell.roundStats.lastX, 2) +
            Math.pow(cell.y - cell.roundStats.lastY, 2)
        );
        cell.roundStats.distanceTraveled += distance;
        cell.roundStats.lastX = cell.x;
        cell.roundStats.lastY = cell.y;

        // Calculate fitness score
        cell.roundStats.fitnessScore = this.calculateFitnessScore(cell);
    }

    calculateFitnessScore(cell) {
        const stats = cell.roundStats;
        let score = 0;

        // Survival bonus (most important)
        score += stats.survivalTime * 2;

        // Health bonus
        score += (cell.traits.health / cell.traits.maxHealth) * 100;

        // Energy bonus  
        score += (cell.traits.energy / cell.traits.maxEnergy) * 50;

        // Food consumption bonus
        score += stats.foodEaten * 25;

        // Combat performance
        score += stats.combatWins * 50;
        score -= stats.damageTaken * 0.5;

        // Movement bonus (exploration)
        score += Math.min(stats.distanceTraveled * 0.1, 100);

        // Size and age bonuses
        score += cell.traits.size * 5;
        score += cell.age * 0.1;

        return Math.max(0, score);
    }

    endRound() {
        console.log(`🏆 Round ${this.currentRound} ended!`);

        // Calculate final scores for all surviving cells
        this.cells.forEach(cell => {
            if (cell.roundStats) {
                cell.roundStats.fitnessScore = this.calculateFitnessScore(cell);
            }
        });

        // Select winners based on fitness score
        const survivors = this.cells
            .filter(cell => cell.roundStats && cell.traits.health > 0)
            .sort((a, b) => b.roundStats.fitnessScore - a.roundStats.fitnessScore);

        const numWinners = Math.min(this.settings.winnersPerRound, survivors.length);
        this.roundWinners = survivors.slice(0, numWinners);

        // Store round results
        this.roundResults.push({
            round: this.currentRound,
            winners: this.roundWinners.map(cell => ({
                id: cell.id || `cell-${Math.random()}`,
                shape: cell.traits.shape,
                defenseType: cell.traits.defenseType,
                specialAbility: cell.traits.specialAbility,
                fitnessScore: cell.roundStats.fitnessScore,
                survivalTime: cell.roundStats.survivalTime
            })),
            totalParticipants: this.cells.length,
            roundDuration: this.roundTick
        });

        // Add top winner to all-time champions
        if (this.roundWinners.length > 0) {
            this.allTimeChampions.push({
                ...this.roundWinners[0].traits,
                round: this.currentRound,
                fitnessScore: this.roundWinners[0].roundStats.fitnessScore,
                timestamp: Date.now()
            });
        }

        // Prepare for next round
        this.startNextRound();
    }

    startNextRound() {
        this.currentRound++;
        this.roundTick = 0;

        // Clear current cells
        this.cells = [];

        if (this.currentRound <= this.maxRounds && this.roundWinners.length > 0) {
            console.log(`🚀 Starting Round ${this.currentRound} with ${this.roundWinners.length} winners from previous round`);

            // Add winners to new round
            this.roundWinners.forEach(winner => {
                // Reset position and stats for new round
                const newCell = new Cell(
                    50 + Math.random() * (this.width - 100),
                    50 + Math.random() * (this.height - 100),
                    { ...winner.traits, generation: this.generation + 1 }
                );
                this.cells.push(newCell);
            });

            // Fill remaining slots with new random cells
            const remainingSlots = this.settings.initialCells - this.roundWinners.length;
            for (let i = 0; i < remainingSlots; i++) {
                this.addRandomCell();
            }

            // Increase difficulty slightly each round
            this.increaseDifficulty();

        } else {
            // Tournament finished
            console.log('🏆 TOURNAMENT FINISHED! 🏆');
            this.stats.roundStatus = 'tournament_complete';
            this.announceChampion();
        }
    }

    increaseDifficulty() {
        // Increase food scarcity
        this.settings.foodSpawnRate = Math.max(0.3, this.settings.foodSpawnRate - 0.05);

        // Reduce round duration slightly
        this.roundDuration = Math.max(2000, this.roundDuration - 100);
        this.settings.roundDuration = this.roundDuration;
    }

    announceChampion() {
        if (this.allTimeChampions.length > 0) {
            const champion = this.allTimeChampions[this.allTimeChampions.length - 1];
            console.log('👑 ULTIMATE CHAMPION:', champion);
            this.stats.ultimateChampion = champion;
        }
    }

    getRoundStatus() {
        if (this.currentRound > this.maxRounds) return 'tournament_complete';
        if (this.roundTick < 300) return 'starting';
        if (this.roundTick >= this.roundDuration - 300) return 'ending';
        return 'active';
    }

    // Methods to start tournament
    startTournament(rounds = 10) {
        this.currentRound = 1;
        this.maxRounds = rounds;
        this.roundTick = 0;
        this.roundWinners = [];
        this.allTimeChampions = [];
        this.roundResults = [];
        this.stats.roundStatus = 'starting';

        console.log(`🏁 Tournament started! ${rounds} rounds`);
        this.reset();
    }

    // Additional methods for experimentation
    addRandomCell(x = null, y = null) {
        const spawnX = x !== null ? x : Math.random() * this.width;
        const spawnY = y !== null ? y : Math.random() * this.height;

        const cell = new Cell(spawnX, spawnY, { generation: this.generation });
        this.cells.push(cell);
    }

    killRandomCell() {
        if (this.cells.length > 0) {
            const randomIndex = Math.floor(Math.random() * this.cells.length);
            const cell = this.cells[randomIndex];
            this.foodManager.spawnFromDeath(cell.x, cell.y, cell.traits.size);
            this.cells.splice(randomIndex, 1);
        }
    }

    setMutationRate(rate) {
        this.settings.mutationRate = Math.max(0, Math.min(1, rate));
    }

    setFoodSpawnRate(rate) {
        this.settings.foodSpawnRate = rate;
        this.foodManager.setSpawnRate(rate);
    }

    // Evolution experiments
    introduceDisease() {
        // Randomly damage some cells to simulate disease
        const affectedCount = Math.floor(this.cells.length * 0.2);
        for (let i = 0; i < affectedCount; i++) {
            const randomIndex = Math.floor(Math.random() * this.cells.length);
            this.cells[randomIndex].traits.health *= 0.7;
        }
    }

    foodScarce() {
        // Remove most food to simulate scarcity
        this.foodManager.food = this.foodManager.food.slice(0, Math.floor(this.foodManager.food.length * 0.3));
    }

    foodAbundance() {
        // Spawn lots of food
        for (let i = 0; i < 50; i++) {
            this.foodManager.spawnFood();
        }
    }

    // New environmental system
    generateEnvironment() {
        // Create dynamic environmental conditions
        const time = this.tick * 0.01;

        return {
            temperature: 0.5 + Math.sin(time * 0.05) * 0.3, // Oscillates between 0.2-0.8
            acidity: 0.3 + Math.sin(time * 0.03 + 1) * 0.2, // Oscillates between 0.1-0.5
            radiation: Math.max(0, 0.1 + Math.sin(time * 0.02 + 2) * 0.15), // 0-0.25
            magneticField: Math.sin(time * 0.04) * 0.5, // -0.5 to 0.5
            electricField: Math.cos(time * 0.06) * 0.3, // -0.3 to 0.3
            currentX: Math.sin(time * 0.01) * 0.2, // Water/air currents
            currentY: Math.cos(time * 0.015) * 0.2
        };
    }

    // Enhanced cell interaction system
    handleCellInteraction(cell1, cell2) {
        // Basic collision check
        if (!cell1.collidesWith(cell2)) return;

        // Store initial health for combat tracking
        const initialHealth1 = cell1.traits.health;
        const initialHealth2 = cell2.traits.health;

        // Handle different types of interactions based on defense types
        let damage1 = 0;
        let damage2 = 0;

        // Calculate base combat damage
        const baseDamage1 = cell1.traits.size * 0.2;
        const baseDamage2 = cell2.traits.size * 0.2;

        // Apply defense-specific interactions
        damage1 = this.calculateDefenseInteraction(cell1, cell2, baseDamage1);
        damage2 = this.calculateDefenseInteraction(cell2, cell1, baseDamage2);

        // Apply damage
        cell1.traits.health -= damage2;
        cell2.traits.health -= damage1;

        // Track combat stats for rounds
        if (cell1.roundStats) {
            cell1.roundStats.damageTaken += damage2;
            if (damage1 > damage2) cell1.roundStats.combatWins++;
        }
        if (cell2.roundStats) {
            cell2.roundStats.damageTaken += damage1;
            if (damage2 > damage1) cell2.roundStats.combatWins++;
        }

        // Energy cost for combat
        cell1.traits.energy -= Math.min(3, cell1.traits.energy * 0.05);
        cell2.traits.energy -= Math.min(3, cell2.traits.energy * 0.05);

        // Handle special combat effects
        this.handleSpecialCombatEffects(cell1, cell2);
    }

    calculateDefenseInteraction(attacker, defender, baseDamage) {
        let finalDamage = baseDamage;

        // Defender's defense modifies incoming damage
        switch (defender.traits.defenseType) {
            case 'armor':
                finalDamage *= 0.5;
                break;
            case 'shield':
                if (defender.defenseStates.shieldEnergy > 20) {
                    finalDamage *= 0.3;
                    defender.defenseStates.shieldEnergy -= 10;
                } else {
                    finalDamage *= 0.8;
                }
                break;
            case 'phase':
                if (defender.defenseStates.phaseShift > 30) {
                    finalDamage *= 0.1; // Nearly immune when phased
                }
                break;
            case 'reflect':
                if (defender.defenseStates.reflectCharge > 20) {
                    attacker.traits.health -= finalDamage * 0.5; // Reflect damage
                    defender.defenseStates.reflectCharge -= 15;
                }
                break;
        }

        // Attacker's offensive bonuses
        switch (attacker.traits.defenseType) {
            case 'spikes':
                defender.traits.health -= attacker.defenseStates.spikesDamage;
                break;
            case 'electric':
                if (attacker.defenseStates.electricCharge > 70) {
                    finalDamage *= 1.5;
                    defender.traits.energy -= 5; // Electric shock drains energy
                }
                break;
            case 'explosive':
                if (attacker.traits.health < attacker.traits.maxHealth * 0.3) {
                    finalDamage *= 2.0; // Desperate explosion damage
                }
                break;
        }

        // Shape-based combat modifiers
        const shapeAdvantages = {
            triangle: { vs: ['circle'], multiplier: 1.2 },
            square: { vs: ['triangle'], multiplier: 1.2 },
            star: { vs: ['square'], multiplier: 1.3 },
            hexagon: { vs: ['star'], multiplier: 1.1 }
        };

        const attackerShape = attacker.traits.shape;
        const defenderShape = defender.traits.shape;

        if (shapeAdvantages[attackerShape] &&
            shapeAdvantages[attackerShape].vs.includes(defenderShape)) {
            finalDamage *= shapeAdvantages[attackerShape].multiplier;
        }

        return Math.max(0, finalDamage);
    }

    handleSpecialCombatEffects(cell1, cell2) {
        // Poison spreading
        if (cell1.traits.defenseType === 'poison') {
            cell1.defenseStates.poisonAura = 120;
            cell2.traits.health -= 1; // Poison damage over time marker
        }

        // Viral transmission
        if (cell1.traits.defenseType === 'viral' && cell1.defenseStates.viralLoad > 50) {
            cell2.defenseStates.viralLoad += 30;
            cell2.traits.toxinResistance -= 0.1; // Weakens immune system
        }

        // Magnetic field disruption
        if (cell1.traits.defenseType === 'magnetic' && cell2.traits.magneticSensitivity > 0.3) {
            const disruptionForce = cell1.defenseStates.magneticField * 0.1;
            cell2.vx += (Math.random() - 0.5) * disruptionForce;
            cell2.vy += (Math.random() - 0.5) * disruptionForce;
        }

        // Swarm coordination
        if (cell1.traits.defenseType === 'swarm' && cell2.traits.defenseType === 'swarm') {
            // Friendly swarm cells don't fight, they coordinate
            cell1.traits.health += 1;
            cell2.traits.health += 1;
            return; // No combat damage between swarm members
        }

        // Pack hunting bonus
        if (cell1.traits.specialAbility === 'pack_hunter' && cell1.defenseStates.packMembers.length > 0) {
            const packBonus = Math.min(2, cell1.defenseStates.packMembers.length * 0.5);
            cell2.traits.health -= packBonus;
        }

        // Parasitic behavior
        if (cell1.traits.specialAbility === 'parasite' && cell1.traits.size < cell2.traits.size) {
            cell1.defenseStates.parasiteHost = cell2;
        }
    }

    // Environmental event triggers
    triggerEnvironmentalEvent(eventType) {
        switch (eventType) {
            case 'solar_flare':
                // High radiation burst
                this.cells.forEach(cell => {
                    if (cell.traits.radiationResistance < 0.6) {
                        cell.traits.health -= 15;
                    }
                    // But also increases mutation chance
                    if (Math.random() < 0.1) {
                        cell.randomBeneficialMutation();
                    }
                });
                break;

            case 'acid_rain':
                // High acidity event
                this.cells.forEach(cell => {
                    if (cell.traits.acidTolerance < 0.7) {
                        cell.traits.health -= 8;
                        cell.traits.energy -= 5;
                    }
                });
                break;

            case 'ice_age':
                // Low temperature event
                this.cells.forEach(cell => {
                    if (cell.traits.temperatureTolerance < 0.8) {
                        cell.traits.energy -= 10;
                        cell.traits.speed *= 0.7; // Slower in cold
                    }
                });
                break;

            case 'magnetic_storm':
                // Disrupts magnetic-sensitive cells
                this.cells.forEach(cell => {
                    if (cell.traits.magneticSensitivity > 0.4) {
                        cell.vx += (Math.random() - 0.5) * 2;
                        cell.vy += (Math.random() - 0.5) * 2;
                    }
                });
                break;
        }
    }
}

export { Simulation };