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
            maxViruses: 10, // Maximum number of viruses at once
            
            // Natural Selection Settings
            naturalSelectionEnabled: true,
            fitnessBasedSurvival: true,
            selectionPressure: 0.1, // How strong natural selection is (0-1)
            traitStabilization: 1000, // Ticks before traits stabilize in population
            geneticDrift: 0.05, // Random genetic changes over time
            environmentalPressure: 0.15 // How much environment affects selection
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

        // Update environment with seasonal changes and disasters
        this.environment.update();
        
        // Generate environmental conditions with new pressures
        const environment = this.generateEnvironment();
        const environmentalPressures = this.environment.getEnvironmentalPressures();

        // Update food system with environmental modifiers
        this.updateFoodSystem(environmentalPressures);
        const food = this.foodManager.getFood();

        // Track cells that need to be removed
        const deadCells = [];
        const newCells = [];

        // Update all cells with environmental effects
        this.cells.forEach((cell, index) => {
            // Apply environmental damage and effects
            this.applyEnvironmentalEffects(cell, environmentalPressures);
            
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

        // Apply natural selection if enabled
        if (this.settings.naturalSelectionEnabled) {
            this.applyNaturalSelection();
        }

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

    updateFoodSystem(environmentalPressures) {
        // Adjust food spawn rate based on environmental conditions
        let foodModifier = environmentalPressures.resourceAvailability;
        
        // Seasonal effects on food
        switch(environmentalPressures.season) {
            case 'spring':
                foodModifier *= 1.3; // Abundant growth
                break;
            case 'summer':
                foodModifier *= 1.1; // Good conditions
                break;
            case 'autumn':
                foodModifier *= 0.9; // Resources declining
                break;
            case 'winter':
                foodModifier *= 0.6; // Scarce resources
                break;
        }
        
        // Environmental toxicity reduces food quality
        foodModifier *= (1.0 - environmentalPressures.toxicity * 0.5);
        
        // Radiation affects food growth
        foodModifier *= (1.0 - environmentalPressures.radiation * 0.3);
        
        // Update food manager with modified spawn rate
        this.foodManager.setSpawnRate(this.settings.foodSpawnRate * foodModifier);
        this.foodManager.update();
    }

    applyEnvironmentalEffects(cell, pressures) {
        let damageDealt = false;
        
        // Temperature effects
        const tempTolerance = cell.traits.temperatureTolerance || 0.5;
        const tempStress = Math.abs(pressures.temperature - tempTolerance);
        if (tempStress > 0.3) {
            const tempDamage = (tempStress - 0.3) * 2;
            cell.traits.health -= tempDamage;
            cell.traits.energy -= tempDamage * 0.5;
            damageDealt = true;
        }
        
        // Toxicity effects
        const toxinResistance = cell.traits.toxinResistance || 0.0;
        const toxinDamage = Math.max(0, pressures.toxicity - toxinResistance) * 3;
        if (toxinDamage > 0) {
            cell.traits.health -= toxinDamage;
            damageDealt = true;
        }
        
        // Radiation effects (causes random mutations)
        const radiationResistance = cell.traits.radiationResistance || 0.0;
        const radiationExposure = Math.max(0, pressures.radiation - radiationResistance);
        if (radiationExposure > 0.1) {
            cell.traits.health -= radiationExposure * 2;
            
            // Chance for radiation-induced mutations
            if (Math.random() < radiationExposure * 0.1) {
                this.applyRadiationMutation(cell);
            }
            damageDealt = true;
        }
        
        // Oxygen level effects
        if (pressures.oxygenLevel < 0.8) {
            const oxygenStress = (0.8 - pressures.oxygenLevel) * 4;
            cell.traits.energy -= oxygenStress;
            cell.traits.speed *= (0.8 + pressures.oxygenLevel * 0.2); // Reduced mobility
        }
        
        // Disaster effects
        pressures.disasterTypes.forEach(disasterType => {
            this.applyDisasterEffects(cell, disasterType);
        });
        
        // Visual feedback for environmental damage
        if (damageDealt && Math.random() < 0.1) {
            this.addEnvironmentalDamageEffect(cell, pressures);
        }
    }

    applyRadiationMutation(cell) {
        // Radiation causes random trait changes
        const traits = Object.keys(cell.traits);
        const randomTrait = traits[Math.floor(Math.random() * traits.length)];
        
        switch(randomTrait) {
            case 'size':
                cell.traits.size = Math.max(4, Math.min(20, 
                    cell.traits.size + (Math.random() - 0.5) * 6));
                break;
            case 'speed':
                cell.traits.speed = Math.max(0.2, Math.min(3.0, 
                    cell.traits.speed + (Math.random() - 0.5) * 1.0));
                break;
            case 'maxHealth':
                const oldHealth = cell.traits.maxHealth;
                cell.traits.maxHealth = Math.max(40, Math.min(160, 
                    oldHealth + (Math.random() - 0.5) * 30));
                // Adjust current health proportionally
                cell.traits.health = (cell.traits.health / oldHealth) * cell.traits.maxHealth;
                break;
        }
        
        console.log(`☢️ ${cell.name} mutated from radiation exposure!`);
    }

    applyDisasterEffects(cell, disasterType) {
        switch(disasterType) {
            case 'meteor':
                // Increased chance of physical damage from debris
                if (Math.random() < 0.01) {
                    cell.traits.health -= 5 + Math.random() * 10;
                }
                break;
                
            case 'plague':
                // Increased infection spread rate
                if (!cell.isInfected && Math.random() < 0.005) {
                    cell.isInfected = true;
                    cell.infectionTimer = 300 + Math.random() * 200;
                    cell.infectionSeverity = 0.5 + Math.random() * 0.5;
                }
                break;
                
            case 'drought':
                // Increased energy consumption
                cell.traits.energy -= 0.5;
                break;
                
            case 'flood':
                // Reduced movement speed
                cell.traits.speed *= 0.95;
                break;
        }
    }

    addEnvironmentalDamageEffect(cell, pressures) {
        // Add visual particles for environmental damage
        const effectColor = pressures.toxicity > 0.3 ? '#00ff00' :
                           pressures.radiation > 0.3 ? '#ffff00' :
                           pressures.temperature > 0.8 ? '#ff6600' :
                           pressures.temperature < 0.2 ? '#66ccff' : '#ffffff';
        
        for (let i = 0; i < 3; i++) {
            cell.particleEffects.push({
                x: cell.x + (Math.random() - 0.5) * cell.radius * 2,
                y: cell.y + (Math.random() - 0.5) * cell.radius * 2,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                size: 1 + Math.random() * 2,
                life: 20,
                maxLife: 20,
                color: effectColor,
                type: 'environmental'
            });
        }
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

        // Calculate evolutionary fitness score
        const fitnessScore = this.calculateEvolutionaryFitness(cell);
        cell.roundStats.fitnessScore = fitnessScore;
        cell.fitnessScore = fitnessScore;

        // Update genetic expression based on current performance
        cell.geneExpression = cell.calculateGeneExpression();

        // Track environmental adaptation
        this.trackEnvironmentalAdaptation(cell);
    }

    calculateEvolutionaryFitness(cell) {
        const stats = cell.roundStats;
        let score = 0;

        // Survival bonus (most important for natural selection)
        score += stats.survivalTime * 3;

        // Reproductive success (key evolutionary factor)
        if (cell.reproduced) {
            score += 100; // Big bonus for successful reproduction
        }

        // Health maintenance (indicates good genes)
        const healthRatio = cell.traits.health / cell.traits.maxHealth;
        score += healthRatio * 50;

        // Energy efficiency (metabolic fitness)
        const energyRatio = cell.traits.energy / cell.traits.maxEnergy;
        score += energyRatio * 30;

        // Colony contribution (social fitness)
        if (cell.colony) {
            score += cell.colony.members.length * 5; // Bonus for larger colonies
            if (cell.isColonyFounder) {
                score += 25; // Extra bonus for colony founders
            }
        }

        // Environmental adaptation bonuses
        if (cell.isInfected && cell.traits.toxinResistance > 0.6) {
            score += 20; // Bonus for virus resistance
        }

        // Role specialization effectiveness
        if (cell.colonyRole === 'sedentary' && cell.colony) {
            // Sedentary cells judged on colony stability
            const avgDistance = this.calculateAverageColonyDistance(cell.colony);
            if (avgDistance < 50) score += 15; // Bonus for tight clusters
        } else if (cell.colonyRole === 'adventurer') {
            // Adventurers judged on exploration and resource gathering
            score += Math.min(stats.distanceTraveled / 10, 30); // Max 30 points for exploration
            score += stats.foodEaten * 2; // Resource gathering bonus
        }

        // Genetic diversity bonus (promotes mutation)
        const mutationCount = cell.mutationHistory ? cell.mutationHistory.length : 0;
        score += Math.min(mutationCount * 2, 10);

        // Age penalty for elder cells (promotes generational turnover)
        if (cell.age > cell.elderAge) {
            score *= 0.8;
        }

        // Apply any fitness bonuses from beneficial mutations
        score += (cell.traits.fitnessBonus || 0) * 100;

        return Math.max(0, score);
    }

    trackEnvironmentalAdaptation(cell) {
        // Track how well cells adapt to current environmental pressures
        const environment = {
            virusCount: this.viruses.length,
            foodScarcity: this.foodManager.getFood().length < 50,
            populationDensity: this.cells.length / (this.width * this.height / 10000),
            averageFitness: this.cells.reduce((sum, c) => sum + (c.fitnessScore || 0), 0) / this.cells.length
        };

        // Update cell's environmental fitness based on current conditions
        if (environment.virusCount > 5 && cell.traits.toxinResistance > 0.7) {
            cell.fitnessScore += 5; // Bonus during viral outbreaks
        }

        if (environment.foodScarcity && cell.traits.size < 10) {
            cell.fitnessScore += 3; // Bonus for small size during food scarcity
        }

        if (environment.populationDensity > 0.1 && cell.colonyRole === 'sedentary') {
            cell.fitnessScore += 2; // Bonus for colony formation in crowded areas
        }
    }

    calculateAverageColonyDistance(colony) {
        if (!colony || colony.members.length < 2) return 0;

        let totalDistance = 0;
        let pairCount = 0;

        for (let i = 0; i < colony.members.length; i++) {
            for (let j = i + 1; j < colony.members.length; j++) {
                const distance = colony.members[i].distanceTo(colony.members[j]);
                totalDistance += distance;
                pairCount++;
            }
        }

        return pairCount > 0 ? totalDistance / pairCount : 0;
    }

    applyNaturalSelection() {
        // Only apply selection pressure when population is above target
        const targetPopulation = this.settings.maxCells * 0.8; // 80% of max capacity
        
        if (this.cells.length > targetPopulation) {
            // Calculate survival probability based on fitness
            const cellsWithFitness = this.cells.map(cell => ({
                cell: cell,
                fitness: cell.fitnessScore || 0,
                age: cell.age,
                health: cell.traits.health / cell.traits.maxHealth
            }));

            // Sort by fitness (highest first)
            cellsWithFitness.sort((a, b) => b.fitness - a.fitness);

            // Determine how many cells to remove
            const excessCells = this.cells.length - targetPopulation;
            const removalCandidates = cellsWithFitness.slice(-excessCells * 2); // Consider bottom 2x cells

            // Apply selection pressure with some randomness
            const cellsToRemove = [];
            
            removalCandidates.forEach((candidate, index) => {
                const survivalProbability = this.calculateSurvivalProbability(candidate, removalCandidates);
                
                if (Math.random() > survivalProbability && cellsToRemove.length < excessCells) {
                    cellsToRemove.push(candidate.cell);
                }
            });

            // Remove the least fit cells
            cellsToRemove.forEach(cell => {
                const index = this.cells.indexOf(cell);
                if (index > -1) {
                    // Convert dead cell to food
                    this.foodManager.spawnFromDeath(cell.x, cell.y, cell.traits.size);
                    this.cells.splice(index, 1);
                }
            });

            if (cellsToRemove.length > 0) {
                console.log(`🧬 Natural selection removed ${cellsToRemove.length} less fit cells`);
                this.trackEvolutionaryPressure(cellsToRemove);
            }
        }

        // Track trait frequency changes over time
        this.trackTraitEvolution();
    }

    calculateSurvivalProbability(candidate, allCandidates) {
        const avgFitness = allCandidates.reduce((sum, c) => sum + c.fitness, 0) / allCandidates.length;
        const fitnessRatio = candidate.fitness / (avgFitness + 1); // Avoid division by zero

        // Base survival probability based on fitness
        let probability = Math.min(fitnessRatio, 2.0) / 2.0; // Normalize to 0-1

        // Age factor - very old cells are more likely to die
        if (candidate.age > candidate.cell.elderAge) {
            probability *= 0.7;
        }

        // Health factor
        probability *= candidate.health;

        // Environmental adaptation bonus
        if (candidate.cell.colony && candidate.cell.colonyRole === 'sedentary') {
            probability *= 1.1; // Slight bonus for colony stability
        }

        // Apply selection pressure
        const selectionStrength = this.settings.selectionPressure;
        probability = 1 - ((1 - probability) * (1 + selectionStrength));

        return Math.max(0.1, Math.min(0.95, probability)); // Keep bounds reasonable
    }

    trackEvolutionaryPressure(removedCells) {
        // Analyze what traits were selected against
        const removedTraits = {
            avgSize: 0,
            avgSpeed: 0,
            avgHealth: 0,
            commonDefense: {},
            commonShape: {}
        };

        removedCells.forEach(cell => {
            removedTraits.avgSize += cell.traits.size;
            removedTraits.avgSpeed += cell.traits.speed;
            removedTraits.avgHealth += cell.traits.maxHealth;
            
            removedTraits.commonDefense[cell.traits.defenseType] = 
                (removedTraits.commonDefense[cell.traits.defenseType] || 0) + 1;
            removedTraits.commonShape[cell.traits.shape] = 
                (removedTraits.commonShape[cell.traits.shape] || 0) + 1;
        });

        removedTraits.avgSize /= removedCells.length;
        removedTraits.avgSpeed /= removedCells.length;
        removedTraits.avgHealth /= removedCells.length;

        // Store for evolution tracking
        this.evolutionHistory = this.evolutionHistory || [];
        this.evolutionHistory.push({
            generation: this.generation,
            tick: this.tick,
            removedTraits: removedTraits,
            populationSize: this.cells.length,
            avgFitness: this.cells.reduce((sum, c) => sum + (c.fitnessScore || 0), 0) / this.cells.length
        });

        // Keep only recent history to prevent memory bloat
        if (this.evolutionHistory.length > 100) {
            this.evolutionHistory.shift();
        }
    }

    trackTraitEvolution() {
        // Update trait frequency statistics every 100 ticks
        if (this.tick % 100 === 0) {
            const traitCounts = {
                defense: {},
                shape: {},
                social: {},
                ability: {}
            };

            this.cells.forEach(cell => {
                traitCounts.defense[cell.traits.defenseType] = 
                    (traitCounts.defense[cell.traits.defenseType] || 0) + 1;
                traitCounts.shape[cell.traits.shape] = 
                    (traitCounts.shape[cell.traits.shape] || 0) + 1;
                traitCounts.social[cell.traits.socialBehavior] = 
                    (traitCounts.social[cell.traits.socialBehavior] || 0) + 1;
                traitCounts.ability[cell.traits.specialAbility] = 
                    (traitCounts.ability[cell.traits.specialAbility] || 0) + 1;
            });

            this.traitFrequencies = this.traitFrequencies || [];
            this.traitFrequencies.push({
                generation: this.generation,
                tick: this.tick,
                traits: traitCounts,
                totalCells: this.cells.length
            });

            // Keep only recent data
            if (this.traitFrequencies.length > 50) {
                this.traitFrequencies.shift();
            }
        }
    }

    endRound() {
        console.log(`🏆 Round ${this.currentRound} ended!`);

        // Calculate final evolutionary fitness scores for all surviving cells
        this.cells.forEach(cell => {
            if (cell.roundStats) {
                cell.roundStats.fitnessScore = this.calculateEvolutionaryFitness(cell);
                cell.fitnessScore = cell.roundStats.fitnessScore;
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