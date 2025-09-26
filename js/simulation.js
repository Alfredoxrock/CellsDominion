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

        // Continuous simulation system (no rounds)
        this.continuousMode = true;

        // Settings for continuous ecosystem - ENHANCED FOR RAPID GROWTH
        this.settings = {
            initialCells: 75, // Increased starting population
            foodSpawnRate: 4.2, // Increased food rate to support rapid growth (was 2.5)
            maxFood: 750, // Increased maximum food particles (was 500)
            mutationRate: 0.12, // Slightly reduced for stability
            geneticDrift: 0.06, // Reduced drift for more stable growth
            simulationSpeed: 1.0,
            minPopulation: 75, // Higher minimum to maintain robust populations  
            maxPopulation: 3500, // Increased carrying capacity (was 2000)
            virusSpawnRate: 0.001, // Much reduced virus pressure for friendlier ecosystem (was 0.003)
            maxViruses: 5, // Significantly reduced max viruses (was 12)

            // Natural ecosystem settings
            naturalSelectionEnabled: true,
            fitnessBasedSurvival: true,
            selectionPressure: 0.05, // Gentler selection for continuous mode
            traitStabilization: 2000,
            environmentalPressure: 0.15,

            // Reproduction settings - ENHANCED FOR FASTER MULTIPLICATION
            reproductionRate: 1.8, // Increased base reproduction multiplier (birth rate)
            mitosisCooldown: 250, // Reduced time between reproduction attempts (was 400)
            energyThreshold: 0.45, // Reduced energy level needed to reproduce (was 0.6)
            foodDependentReproduction: true, // Reproduction depends on food
            predationReproduction: true, // Can reproduce after eating other cells

            // Colony settings
            maxColonySize: 25,
            colonyFormationThreshold: 3 // Min cells needed to form colony
        };

        // Statistics for continuous ecosystem
        this.stats = {
            totalCells: 0,
            generation: 1,
            tick: 0,
            foodCount: 0,
            virusCount: 0,
            // Ecosystem statistics
            currentSeason: 'spring',
            populationGrowthRate: 0,
            extinctions: 0,
            coloniesFormed: 0,
            averageFitness: 0,
            biodiversityIndex: 0,
            traitDistribution: {
                total: 0,
                cellCount: 0,
                virusCount: 0,
                counts: {},
                averages: {},
                ranges: {}
            },
            // Advanced ecosystem metrics
            traitDiversity: {
                shannon: 0,     // Shannon diversity index
                simpson: 0,     // Simpson diversity index
                evenness: 0     // Species evenness
            },
            populationDynamics: {
                birthRate: 0,
                deathRate: 0,
                migrationRate: 0,
                carryingCapacity: 0
            },
            evolutionMetrics: {
                averageMutationRate: 0,
                traitStability: 0,
                adaptationSpeed: 0,
                geneticDrift: 0
            },
            populationHistory: [],
            ecosystemHealth: 100
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

        // Update environment with seasonal changes and disasters
        this.environment.update();

        // Generate environmental conditions with new pressures
        const environment = this.generateEnvironment();
        const environmentalPressures = this.environment.getEnvironmentalPressures();

        // Update food system with environmental modifiers
        this.updateFoodSystem(environmentalPressures);
        const food = this.foodManager.getFood();

        // Track cells that need to be removed and new cells to add
        const deadCells = [];
        const newCells = [];

        // Update all cells with environmental effects
        this.cells.forEach((cell, index) => {
            // Apply environmental damage and effects
            this.applyEnvironmentalEffects(cell, environmentalPressures);

            // Pass global population data to cells for population-aware behavior
            cell.globalPopulation = this.cells.length;
            cell.globalFoodCount = food.length;
            cell.simulation = this; // Pass simulation reference for settings access

            const isAlive = cell.update(this.cells, food, { width: this.width, height: this.height }, environment);

            if (!isAlive || cell.traits.health <= 0) {
                deadCells.push({ cell, index });
            } else {
                // Handle food consumption
                food.forEach(foodParticle => {
                    if (cell.eat(foodParticle)) {
                        // Increase reproduction chances based on food consumed
                        cell.traits.energy = Math.min(cell.traits.maxEnergy, cell.traits.energy + foodParticle.energyValue);
                        cell.lastFoodTime = this.tick;
                    }
                });

                // Handle cell-to-cell interactions (predation, cooperation, etc.)
                this.cells.forEach(other => {
                    if (other !== cell && cell.collidesWith(other)) {
                        this.handleCellInteraction(cell, other, newCells);
                    }
                });

                // Handle continuous reproduction based on resources - ENHANCED SUCCESS RATE
                if (cell.reproduced) {
                    const offspring = this.createOffspring(cell);
                    // Enhanced reproduction success rates for faster population growth
                    const populationPressure = Math.max(0.8, this.cells.length / this.settings.maxPopulation); // Reduced pressure (was 1)
                    const reproductionSuccess = Math.random() < (1.3 / populationPressure); // Enhanced success rate (was 1 / populationPressure)

                    if (offspring && reproductionSuccess) {
                        newCells.push(offspring);
                        this.maxGeneration = Math.max(this.maxGeneration, offspring.generation);
                    } else if (offspring && !reproductionSuccess) {
                        // Failed reproduction due to overcrowding - convert energy back to parent but with less loss
                        cell.traits.energy += offspring.traits.maxEnergy * 0.5; // Reduced energy loss (was 0.3)
                        console.log(`⚠️ Reproduction failed due to overcrowding (pop: ${this.cells.length})`);
                    }
                    cell.reproduced = false; // Reset reproduction flag
                }
            }
        });

        // Remove dead cells and spawn food from their corpses
        deadCells.reverse().forEach(({ cell, index }) => {
            this.foodManager.spawnFromDeath(cell.x, cell.y, cell.traits.size);
            this.cells.splice(index, 1);
        });

        // Add new cells to the ecosystem
        this.cells.push(...newCells);

        // Apply natural selection if enabled and population is high
        if (this.settings.naturalSelectionEnabled && this.cells.length > this.settings.maxPopulation * 0.8) {
            this.applyNaturalSelection();
        }

        // Update viruses
        this.updateViruses(food, environment);

        // Spawn new viruses occasionally
        this.spawnViruses();

        // Update colonies
        this.updateColonies();

        // Check for population control - respawn if extinct or maintain minimum
        this.maintainPopulation();

        // Update generation based on living cells
        if (this.cells.length > 0) {
            this.generation = Math.floor(this.cells.reduce((sum, cell) => sum + cell.generation, 0) / this.cells.length);
        }

        // Update ecosystem statistics
        this.updateEcosystemStats();
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

            // GROWTH ENHANCEMENT 5: Colony growth bonus
            // Large, stable colonies provide protection and shared resources
            if (colony.members.length >= 5) {
                // Share resources among colony members more efficiently
                colony.shareResources();

                // Provide colony stability bonus
                colony.members.forEach(member => {
                    // Health regeneration bonus for colony members
                    if (member.traits.health < member.traits.maxHealth * 0.9) {
                        member.traits.health += 0.5; // Slow health regen in colonies
                    }

                    // Reduced environmental stress
                    member.environmentalStress *= 0.8;
                });
            }

            // GROWTH ENHANCEMENT 6: Colony reproduction coordination
            // Colonies can coordinate reproduction for population booms
            if (colony.members.length >= 8 && Math.random() < 0.05) {
                console.log(`👨‍👩‍👧‍👦 ${colony.id} coordinating reproduction event`);
                colony.members.forEach(member => {
                    if (member.traits.energy > member.traits.maxEnergy * 0.6) {
                        member.reproduced = true; // Trigger coordinated reproduction
                    }
                });
            }
        });

        // Find new colonies that have been formed
        this.cells.forEach(cell => {
            if (cell.colony && !this.colonies.includes(cell.colony)) {
                this.colonies.push(cell.colony);
            }
        });

        // GROWTH ENHANCEMENT 7: Encourage colony formation
        this.encourageColonyFormation();
    }

    // New method to encourage colony formation for population growth
    encourageColonyFormation() {
        if (Math.random() < 0.02) { // 2% chance per tick
            const loners = this.cells.filter(cell => !cell.colony);
            if (loners.length >= 3) {
                // Find potential colony founders
                for (let i = 0; i < loners.length; i++) {
                    const founder = loners[i];
                    const nearbyLoners = loners.filter(cell =>
                        cell !== founder && founder.distanceTo(cell) < 80
                    );

                    if (nearbyLoners.length >= 2) {
                        // Form new colony - import Colony dynamically
                        import('./cell.js').then(module => {
                            const Colony = module.Colony;
                            if (Colony && founder.colony === null) { // Check still needs colony
                                const newColony = new Colony(founder);
                                nearbyLoners.slice(0, 2).forEach(cell => {
                                    if (cell.colony === null) { // Double-check availability
                                        newColony.addMember(cell, founder);
                                    }
                                });
                                console.log(`🏘️ New colony formed with ${newColony.members.length} members`);
                            }
                        }).catch(err => {
                            console.warn('Could not import Colony class:', err);
                        });
                        break;
                    }
                }
            }
        }
    }

    updateFoodSystem(environmentalPressures) {
        // Adjust food spawn rate based on environmental conditions
        let foodModifier = environmentalPressures.resourceAvailability;

        // GROWTH ENHANCEMENT 1: Population-adaptive food scaling
        // More cells = more decomposition and nutrient cycling
        const populationRatio = this.cells.length / this.settings.initialCells;
        let populationBoost = Math.min(2.0, 1 + (populationRatio - 1) * 0.3); // Up to 2x food for large populations

        // FIXED: Boost food for small populations to help recovery
        if (this.cells.length < 80) {
            populationBoost = Math.max(populationBoost, 1.5); // Minimum 1.5x food for small populations
        } else if (this.cells.length < 150) {
            populationBoost = Math.max(populationBoost, 1.2); // Minimum 1.2x food for growing populations
        }

        foodModifier *= populationBoost;

        // GROWTH ENHANCEMENT 2: Ecosystem maturity bonus
        // Older ecosystems become more efficient at resource production
        const ecosystemAge = this.tick / 1000; // Age in thousands of ticks
        const maturityBonus = Math.min(1.5, 1 + ecosystemAge * 0.02); // Up to 1.5x over time
        foodModifier *= maturityBonus;

        // Seasonal effects on food
        switch (environmentalPressures.season) {
            case 'spring':
                foodModifier *= 1.4; // More abundant growth for population booms
                break;
            case 'summer':
                foodModifier *= 1.2; // Better conditions
                break;
            case 'autumn':
                foodModifier *= 0.9; // Resources declining
                break;
            case 'winter':
                foodModifier *= 0.7; // Scarce resources but not too harsh
                break;
        }

        // Environmental toxicity reduces food quality
        foodModifier *= (1.0 - environmentalPressures.toxicity * 0.5);

        // Radiation affects food growth
        foodModifier *= (1.0 - environmentalPressures.radiation * 0.3);

        // GROWTH ENHANCEMENT 3: Colony productivity bonus
        // Large, stable colonies create more favorable local environments
        const largeColonies = this.colonies.filter(col => col.members.length >= 8).length;
        if (largeColonies > 0) {
            const colonyProductivityBonus = 1 + (largeColonies * 0.15); // 15% boost per large colony
            foodModifier *= Math.min(1.8, colonyProductivityBonus);
        }

        // Update food manager with modified spawn rate
        this.foodManager.setSpawnRate(this.settings.foodSpawnRate * foodModifier);
        this.foodManager.setMaxFood(this.settings.maxFood);
        this.foodManager.update();

        // GROWTH ENHANCEMENT 4: Periodic abundance events
        if (Math.random() < 0.003) { // 0.3% chance per tick
            this.triggerAbundanceEvent();
        }

        // GROWTH ENHANCEMENT 9: Reproduction cycle support
        // During high reproduction periods, increase food availability
        const recentReproducers = this.cells.filter(cell =>
            cell.reproduced && this.simulationTime - (cell.lastReproduction || 0) < 100
        );

        if (recentReproducers.length > this.cells.length * 0.15) { // More than 15% recently reproduced
            for (let i = 0; i < Math.floor(recentReproducers.length * 0.5); i++) {
                this.foodManager.spawnFood(); // Extra food for reproductive booms
            }
            console.log(`🍖 Reproductive boom detected - spawning ${Math.floor(recentReproducers.length * 0.5)} extra food (${recentReproducers.length} recent reproducers)`);
        }
    }

    // New method: Abundance events that boost population growth
    triggerAbundanceEvent() {
        console.log('🌺 Abundance event triggered! Food bloom occurring...');

        // Spawn lots of extra food
        for (let i = 0; i < 50; i++) {
            this.foodManager.spawnFood();
        }

        // Temporary reproduction boost for all cells
        this.cells.forEach(cell => {
            cell.abundanceBoost = 300; // 300 ticks of enhanced reproduction
            cell.traits.energy = Math.min(cell.traits.maxEnergy, cell.traits.energy + 20);
        });
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

        switch (randomTrait) {
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
        switch (disasterType) {
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

    // Create offspring from a parent cell
    createOffspring(parent) {
        // Position offspring near parent with slight offset
        const angle = Math.random() * Math.PI * 2;
        const distance = parent.radius * 2 + Math.random() * 10;
        const x = parent.x + Math.cos(angle) * distance;
        const y = parent.y + Math.sin(angle) * distance;

        // Keep within boundaries
        const clampedX = Math.max(parent.radius, Math.min(this.width - parent.radius, x));
        const clampedY = Math.max(parent.radius, Math.min(this.height - parent.radius, y));

        // Create offspring with inherited traits plus mutations
        const offspring = new Cell(clampedX, clampedY, {
            generation: parent.generation + 1,
            parentTraits: parent.traits,
            mutationRate: this.settings.mutationRate
        });
        offspring.simulation = this; // Pass simulation reference for settings access

        // Copy some parent properties
        offspring.colonyRole = parent.colonyRole;
        offspring.homePosition = parent.homePosition;

        // Chance to inherit parent's colony
        if (parent.colony && parent.colony.members.length < this.settings.maxColonySize) {
            if (Math.random() < 0.6) { // 60% chance to join parent's colony
                parent.colony.addMember(offspring, parent);
            }
        }

        // Energy cost to parent
        parent.traits.energy *= 0.7;

        console.log(`🧬 ${parent.name} reproduced: ${offspring.name} (Gen ${offspring.generation})`);

        return offspring;
    }

    // Enhanced cell interaction with COOPERATIVE focus
    handleCellInteraction(cell1, cell2, newCells) {
        if (!cell1.collidesWith(cell2)) return;

        // Check for cooperation opportunities FIRST before any combat
        if (this.attemptCooperation(cell1, cell2)) {
            return; // Skip combat if cooperation occurred
        }

        // Store initial health for tracking changes
        const initialHealth1 = cell1.traits.health;
        const initialHealth2 = cell2.traits.health;

        // Much stricter predation requirements to reduce combat
        if (this.canPredate(cell1, cell2)) {
            this.handlePredation(cell1, cell2, newCells);
            return; // Skip normal combat if predation occurred
        } else if (this.canPredate(cell2, cell1)) {
            this.handlePredation(cell2, cell1, newCells);
            return;
        }

        // FRIENDLY INTERACTION: Reduced combat damage and energy sharing
        let damage1 = 0;
        let damage2 = 0;

        // Much reduced base combat damage for friendliness
        const baseDamage1 = cell1.traits.size * 0.05; // Reduced from 0.15
        const baseDamage2 = cell2.traits.size * 0.05; // Reduced from 0.15

        // Apply aggression modifiers - peaceful cells fight less
        const aggression1 = cell1.traits.aggression || 0.3;
        const aggression2 = cell2.traits.aggression || 0.3;

        damage1 *= aggression1; // Scale damage by aggression
        damage2 *= aggression2;

        // Apply defense-specific interactions with reduced damage
        damage1 = this.calculateDefenseInteraction(cell1, cell2, baseDamage1) * 0.5; // 50% damage reduction
        damage2 = this.calculateDefenseInteraction(cell2, cell1, baseDamage2) * 0.5;

        // Apply minimal damage for friendly ecosystem
        cell1.traits.health -= damage2;
        cell2.traits.health -= damage1;

        // Reduced energy cost for combat
        cell1.traits.energy -= Math.min(1, cell1.traits.energy * 0.01); // Reduced from 0.03
        cell2.traits.energy -= Math.min(1, cell2.traits.energy * 0.01);

        // Handle special combat effects
        this.handleSpecialCombatEffects(cell1, cell2);
    }

    // NEW: Cooperation system for friendly interactions
    attemptCooperation(cell1, cell2) {
        // Check if both cells are cooperative enough
        const social1 = cell1.traits.socialIntelligence || 0.5;
        const social2 = cell2.traits.socialIntelligence || 0.5;
        const altruism1 = cell1.traits.altruism || 0.4;
        const altruism2 = cell2.traits.altruism || 0.4;

        // Higher chance of cooperation for social, altruistic cells
        const cooperationChance = (social1 + social2 + altruism1 + altruism2) / 4;

        if (Math.random() < cooperationChance * 0.6) { // 60% max cooperation chance
            // ENERGY SHARING: Cells with more energy share with those with less
            const totalEnergy = cell1.traits.energy + cell2.traits.energy;
            const avgEnergy = totalEnergy / 2;
            const shareAmount = Math.min(5, Math.abs(cell1.traits.energy - cell2.traits.energy) * 0.1);

            if (cell1.traits.energy > cell2.traits.energy) {
                cell1.traits.energy -= shareAmount;
                cell2.traits.energy += shareAmount;
            } else {
                cell2.traits.energy -= shareAmount;
                cell1.traits.energy += shareAmount;
            }

            // HEALING COOPERATION: Healthy cells help heal injured ones
            if (cell1.traits.health < cell1.traits.maxHealth * 0.7 && cell2.traits.health > cell2.traits.maxHealth * 0.8) {
                const healAmount = Math.min(3, cell2.traits.energy * 0.02);
                cell1.traits.health += healAmount;
                cell2.traits.energy -= healAmount * 0.5;
            } else if (cell2.traits.health < cell2.traits.maxHealth * 0.7 && cell1.traits.health > cell1.traits.maxHealth * 0.8) {
                const healAmount = Math.min(3, cell1.traits.energy * 0.02);
                cell2.traits.health += healAmount;
                cell1.traits.energy -= healAmount * 0.5;
            }

            // MUTUAL GROWTH: Both cells get small growth bonus from cooperation
            cell1.growthPoints += 0.5;
            cell2.growthPoints += 0.5;

            // Add cooperation visual effects
            this.addCooperationEffect(cell1, cell2);

            return true; // Cooperation successful
        }

        return false; // No cooperation
    }

    // Add visual effects for cooperation
    addCooperationEffect(cell1, cell2) {
        // Add heart particles between cooperating cells
        const midX = (cell1.x + cell2.x) / 2;
        const midY = (cell1.y + cell2.y) / 2;

        for (let i = 0; i < 3; i++) {
            cell1.particleEffects.push({
                x: midX + (Math.random() - 0.5) * 20,
                y: midY + (Math.random() - 0.5) * 20,
                color: '#ff69b4', // Pink hearts
                size: 3 + Math.random() * 2,
                life: 30,
                maxLife: 30,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                type: 'heart'
            });
        }
    }

    // Check if one cell can predate another - MUCH STRICTER for friendliness
    canPredate(predator, prey) {
        // Much stricter size requirement - predator must be MUCH larger
        if (predator.traits.size < prey.traits.size * 2.0) return false; // Increased from 1.3

        // Stricter health requirement
        if (predator.traits.health < prey.traits.health * 1.2) return false; // Increased from 0.8

        // High aggression requirement for predation
        if ((predator.traits.aggression || 0.3) < 0.4) return false; // Must be aggressive to predate

        // Energy requirement - must have good energy to hunt
        if (predator.traits.energy < predator.traits.maxEnergy * 0.6) return false;

        // Some defense types make cells unpredatable
        if (prey.traits.defenseType === 'explosive') return false;
        if (prey.traits.defenseType === 'poison' && predator.traits.toxinResistance < 0.7) return false;

        // Predatory abilities increase predation chance
        if (predator.traits.specialAbility === 'parasite') return true;
        if (predator.traits.specialAbility === 'pack_hunter' && predator.defenseStates.packMembers.length > 0) return true;

        return true;
    }

    // Handle predation event
    handlePredation(predator, prey, newCells) {
        console.log(`🦈 ${predator.name} consumed ${prey.name}!`);

        // Predator gains significant energy and health
        const energyGain = Math.min(prey.traits.maxEnergy * 0.8, predator.traits.maxEnergy - predator.traits.energy);
        const healthGain = Math.min(prey.traits.maxHealth * 0.3, predator.traits.maxHealth - predator.traits.health);

        predator.traits.energy += energyGain;
        predator.traits.health += healthGain;

        // Mark prey as dead
        prey.traits.health = 0;

        // Chance for predator to reproduce after successful hunt
        if (this.settings.predationReproduction) {
            // Well-fed predators have high reproduction chance
            const reproductionChance = Math.min(0.7, energyGain / predator.traits.maxEnergy + 0.2);
            const populationPressure = Math.max(1, this.cells.length / this.settings.maxPopulation);
            const adjustedChance = reproductionChance / Math.sqrt(populationPressure); // Reduced chance when crowded

            if (Math.random() < adjustedChance) {
                predator.reproduced = true;
                predator.lastFoodTime = this.tick;

                // Add reproduction effect
                predator.addReproductionEffect();
            }
        }

        // Add predation particle effects
        for (let i = 0; i < 5; i++) {
            predator.particleEffects.push({
                x: predator.x + (Math.random() - 0.5) * predator.radius * 2,
                y: predator.y + (Math.random() - 0.5) * predator.radius * 2,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                size: 2 + Math.random() * 3,
                life: 40,
                maxLife: 40,
                color: '#ff4444',
                type: 'predation'
            });
        }
    }

    // Maintain minimum population and handle extinctions
    maintainPopulation() {
        if (this.cells.length === 0) {
            console.log('💀 Complete extinction! Reseeding ecosystem...');
            this.stats.extinctions++;
            this.spawnInitialCells();
        }
        // Emergency population recovery for severe bottlenecks
        else if (this.cells.length < this.settings.minPopulation * 0.4) {
            console.log(`� CRITICAL POPULATION LEVEL! Adding emergency cells (${this.cells.length} remaining)`);

            const emergencyCells = Math.floor(this.settings.minPopulation * 0.3);
            for (let i = 0; i < emergencyCells; i++) {
                const cell = this.addRandomCell();
                // Give emergency cells a boost to help recovery
                cell.traits.energy = cell.traits.maxEnergy * 0.8;
                cell.traits.health = cell.traits.maxHealth;
                cell.abundanceBoost = 5; // Reproduction bonus
            }
        }
        // Standard population maintenance for moderate decline  
        else if (this.cells.length < this.settings.minPopulation) {
            console.log(`📈 Population below minimum, adding recovery cells (${this.cells.length}/${this.settings.minPopulation})`);

            // Add some new random cells to increase genetic diversity
            const cellsToAdd = Math.min(8, this.settings.minPopulation - this.cells.length);
            for (let i = 0; i < cellsToAdd; i++) {
                const cell = this.addRandomCell();
                // Give recovery cells moderate advantages
                cell.traits.energy = cell.traits.maxEnergy * 0.6;
                cell.abundanceBoost = 3; // Some reproduction bonus
            }
        }
    }

    // Update ecosystem statistics
    updateEcosystemStats() {
        // Calculate population growth rate
        const currentPop = this.cells.length;
        const previousPop = this.stats.populationHistory.length > 0 ?
            this.stats.populationHistory[this.stats.populationHistory.length - 1].population : currentPop;

        this.stats.populationGrowthRate = currentPop - previousPop;

        // Calculate average fitness
        this.stats.averageFitness = this.cells.length > 0 ?
            this.cells.reduce((sum, cell) => sum + (cell.fitnessScore || 0), 0) / this.cells.length : 0;

        // Calculate biodiversity index (trait variety)
        const traitCounts = {};
        this.cells.forEach(cell => {
            const key = `${cell.traits.defenseType}-${cell.traits.shape}-${cell.traits.specialAbility}`;
            traitCounts[key] = (traitCounts[key] || 0) + 1;
        });

        const numUniqueTraits = Object.keys(traitCounts).length;
        this.stats.biodiversityIndex = this.cells.length > 0 ? numUniqueTraits / this.cells.length : 0;

        // Update colony count
        this.stats.coloniesFormed = this.colonies.length;

        // Calculate ecosystem health based on various factors
        let ecosystemHealth = 100;

        // Population health
        if (currentPop < this.settings.minPopulation) ecosystemHealth -= 30;
        if (currentPop > this.settings.maxPopulation * 0.9) ecosystemHealth -= 20; // Overcrowding

        // Biodiversity health
        if (this.stats.biodiversityIndex < 0.1) ecosystemHealth -= 25; // Low diversity

        // Environmental health
        const envPressures = this.environment.getEnvironmentalPressures();
        if (envPressures.toxicity > 0.7) ecosystemHealth -= 20;
        if (envPressures.radiation > 0.5) ecosystemHealth -= 15;

        this.stats.ecosystemHealth = Math.max(0, ecosystemHealth);

        // Update current season
        this.stats.currentSeason = envPressures.season || 'spring';

        // Update basic stats
        this.stats.totalCells = currentPop;
        this.stats.generation = this.generation;
        this.stats.tick = this.tick;
        this.stats.foodCount = this.foodManager.getFood().length;
        this.stats.traitDistribution = this.calculateTraitDistribution();

        // Record population history for charts
        if (this.tick % 20 === 0) { // Every 20 ticks instead of 10 for better performance
            this.stats.populationHistory.push({
                tick: this.tick,
                population: currentPop,
                food: this.stats.foodCount,
                colonies: this.colonies.length,
                avgFitness: this.stats.averageFitness,
                biodiversity: this.stats.biodiversityIndex,
                ecosystemHealth: this.stats.ecosystemHealth
            });

            // Limit history to prevent memory issues
            if (this.stats.populationHistory.length > 500) {
                this.stats.populationHistory = this.stats.populationHistory.slice(-250);
            }
        }
    }

    calculateTraitDistribution() {
        const distribution = {
            total: this.cells.length + this.viruses.length,
            cellCount: this.cells.length,
            virusCount: this.viruses.length,
            counts: {},
            averages: {}, // Track average values for numerical traits
            ranges: {}    // Track min/max ranges for numerical traits
        };

        // Initialize comprehensive trait tracking
        const categoricalTraits = [
            // Defense types
            'spikes', 'poison', 'armor', 'regen', 'camo', 'shield', 'electric', 'magnetic', 'phase', 'swarm', 'mimic', 'explosive', 'viral', 'barrier', 'reflect',
            // Shapes
            'shape-circle', 'shape-triangle', 'shape-square', 'shape-hexagon', 'shape-oval', 'shape-star', 'shape-diamond',
            // Abilities
            'ability-none', 'ability-photosynthesis', 'ability-parasite', 'ability-pack_hunter', 'ability-territorial', 'ability-migratory', 'ability-burrowing', 'ability-leaping', 'ability-splitting', 'ability-fusion', 'ability-time_dilation', 'ability-energy_vampire', 'ability-shape_shift', 'ability-invisibility', 'ability-infection',
            // Life stages
            'stage-juvenile', 'stage-adult', 'stage-elder',
            // Motility types
            'motility-flagellar', 'motility-drift', 'motility-pseudopod', 'motility-ciliary', 'motility-jet'
        ];

        const numericalTraits = [
            // Basic Physical
            'health', 'size', 'speed', 'energy', 'density', 'flexibility', 'transparency', 'luminescence',
            // Metabolic
            'metabolicEfficiency', 'hungerTolerance', 'photosynthesisRate', 'oxygenEfficiency',
            // Environmental Resistance
            'temperatureTolerance', 'pressureResistance', 'toxinResistance', 'osmolarityTolerance',
            // Sensory Systems
            'visionRange', 'visionAcuity', 'chemoreception', 'mechanoreception', 'electroreception', 'magnetoreception', 'thermoreception', 'gravitySensing',
            // Communication/Social
            'pheromoneDetection', 'pheromoneProduction', 'socialIntelligence', 'territoriality', 'altruism', 'groupCoordination',
            // Offensive Capabilities
            'attackPower', 'venomPotency', 'sonicAttack', 'electricalDischarge', 'acidProduction', 'enzymeSecretion',
            // Defensive Systems
            'armorThickness', 'camouflageEfficiency', 'mimicryAccuracy', 'regenerationRate', 'immuneResponse', 'stressResistance',
            // Reproductive
            'fertilityRate', 'parentalCare', 'geneticStability', 'mutationResistance', 'reproductiveStrategy', 'maturationRate',
            // Behavioral
            'aggression', 'curiosity', 'adaptability', 'learningRate', 'memory', 'riskTolerance'
        ];

        // Viral-specific numerical traits
        const viralTraits = [
            'infectivity', 'virulence', 'transmissionRange', 'latencyPeriod', 'hostSpecificity', 'replicationSpeed',
            'antigeneticShift', 'vectorAdaptation', 'heatStability', 'desiccationResistance', 'chemicalResistance',
            'uvResistance', 'phResistance', 'enzymaticResistance', 'hostManipulation', 'dormancyTrigger',
            'burstSize', 'lysisTime', 'chronicInfection', 'crossSpeciesJump', 'metabolicHijacking',
            'energyEfficiency', 'resourceScavenging', 'penetrationPower', 'adhesionStrength'
        ];

        // Initialize categorical counts
        categoricalTraits.forEach(trait => {
            distribution.counts[trait] = 0;
        });

        // Initialize numerical trait tracking
        [...numericalTraits, ...viralTraits].forEach(trait => {
            distribution.averages[trait] = { sum: 0, count: 0, average: 0 };
            distribution.ranges[trait] = { min: Infinity, max: -Infinity };
        });

        // Process all cells
        this.cells.forEach(cell => {
            // Count categorical traits
            if (distribution.counts.hasOwnProperty(cell.traits.defenseType)) {
                distribution.counts[cell.traits.defenseType]++;
            }

            const shapeKey = `shape-${cell.traits.shape}`;
            if (distribution.counts.hasOwnProperty(shapeKey)) {
                distribution.counts[shapeKey]++;
            }

            const abilityKey = `ability-${cell.traits.specialAbility}`;
            if (distribution.counts.hasOwnProperty(abilityKey)) {
                distribution.counts[abilityKey]++;
            }

            const stageKey = `stage-${cell.traits.lifestage || 'adult'}`;
            if (distribution.counts.hasOwnProperty(stageKey)) {
                distribution.counts[stageKey]++;
            }

            // Process numerical traits
            numericalTraits.forEach(trait => {
                const value = cell.traits[trait];
                if (value !== undefined && typeof value === 'number') {
                    distribution.averages[trait].sum += value;
                    distribution.averages[trait].count++;
                    distribution.ranges[trait].min = Math.min(distribution.ranges[trait].min, value);
                    distribution.ranges[trait].max = Math.max(distribution.ranges[trait].max, value);
                }
            });
        });

        // Process all viruses
        this.viruses.forEach(virus => {
            // Count viral categorical traits
            if (distribution.counts.hasOwnProperty(virus.traits.defenseType)) {
                distribution.counts[virus.traits.defenseType]++;
            }

            const shapeKey = `shape-${virus.traits.shape}`;
            if (distribution.counts.hasOwnProperty(shapeKey)) {
                distribution.counts[shapeKey]++;
            }

            const abilityKey = `ability-${virus.traits.specialAbility}`;
            if (distribution.counts.hasOwnProperty(abilityKey)) {
                distribution.counts[abilityKey]++;
            }

            // Process viral numerical traits
            [...numericalTraits, ...viralTraits].forEach(trait => {
                const value = virus.traits[trait];
                if (value !== undefined && typeof value === 'number') {
                    if (!distribution.averages[trait]) {
                        distribution.averages[trait] = { sum: 0, count: 0, average: 0 };
                        distribution.ranges[trait] = { min: Infinity, max: -Infinity };
                    }
                    distribution.averages[trait].sum += value;
                    distribution.averages[trait].count++;
                    distribution.ranges[trait].min = Math.min(distribution.ranges[trait].min, value);
                    distribution.ranges[trait].max = Math.max(distribution.ranges[trait].max, value);
                }
            });
        });

        // Calculate final averages
        Object.keys(distribution.averages).forEach(trait => {
            const data = distribution.averages[trait];
            if (data.count > 0) {
                data.average = data.sum / data.count;
            }

            // Handle cases where no values were found
            if (distribution.ranges[trait].min === Infinity) {
                distribution.ranges[trait].min = 0;
                distribution.ranges[trait].max = 0;
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
        return {
            // Basic stats
            totalCells: this.cells.length,
            generation: this.maxGeneration,
            tick: this.tick,
            foodCount: this.foodManager.getFood().length,
            activeColonies: this.colonies.length,
            populationGrowthRate: this.stats.populationGrowthRate,
            averageFitness: this.stats.averageFitness,

            // Extended ecosystem stats
            ...this.stats,
            currentEnvironment: this.environment.getCurrentConditions(),
            virusCount: this.viruses.length,
            colonyStats: this.getColonyStats(),
            traitDistribution: this.calculateTraitDistribution()
        };
    }

    getColonyStats() {
        return {
            totalColonies: this.colonies.length,
            averageColonySize: this.colonies.length > 0 ?
                this.colonies.reduce((sum, col) => sum + col.members.length, 0) / this.colonies.length : 0,
            largestColony: this.colonies.length > 0 ?
                Math.max(...this.colonies.map(col => col.members.length)) : 0,
            sedentaryCells: this.cells.filter(c => c.colonyRole === 'sedentary').length,
            adventurerCells: this.cells.filter(c => c.colonyRole === 'adventurer').length
        };
    }

    // Additional ecosystem methods
    addRandomCell(x = null, y = null) {
        const spawnX = x !== null ? x : Math.random() * this.width;
        const spawnY = y !== null ? y : Math.random() * this.height;

        const cell = new Cell(spawnX, spawnY, { generation: this.generation });
        cell.simulation = this; // Pass simulation reference for settings access
        this.cells.push(cell);

        console.log(`🆕 Added new cell: ${cell.name} at (${Math.floor(spawnX)}, ${Math.floor(spawnY)})`);
        return cell; // FIX: Return the created cell
    }

    calculateEvolutionaryFitness(cell) {
        let score = 0;

        // 1. Survival fitness - age and health
        score += cell.age * 2; // Reward longevity
        const healthRatio = cell.traits.health / cell.traits.maxHealth;
        score += healthRatio * 40;

        // 2. Metabolic fitness - energy efficiency
        const energyRatio = cell.traits.energy / cell.traits.maxEnergy;
        score += energyRatio * 25;

        // 3. Reproductive success - most important for evolution
        const reproductiveEvents = cell.reproductiveSuccess || 0;
        score += reproductiveEvents * 150; // Big bonus for reproduction

        // 4. Resource acquisition - food gathering ability
        const timeSinceFood = this.tick - (cell.lastFoodTime || 0);
        if (timeSinceFood < 300) { // Recently fed
            score += 30;
        } else if (timeSinceFood < 600) {
            score += 15;
        }

        // 5. Social fitness - colony participation
        if (cell.colony) {
            score += cell.colony.members.length * 3; // Larger colonies = better
            if (cell.isColonyFounder) {
                score += 40; // Bonus for successful colony founding
            }

            // Role effectiveness
            if (cell.colonyRole === 'sedentary' && cell.colony.structure.integrity > 80) {
                score += 20; // Well-maintained structures
            } else if (cell.colonyRole === 'adventurer' && (cell.lastFoodTime || 0) > this.tick - 200) {
                score += 15; // Successful foraging
            }
        }

        // 6. Environmental adaptation
        const envPressures = this.environment.getEnvironmentalPressures();
        if (envPressures.toxicity > 0.5 && cell.traits.toxinResistance > 0.7) {
            score += 25; // Adaptation to toxic environment
        }
        if (envPressures.temperature < 0.3 && cell.traits.temperatureTolerance > 0.8) {
            score += 20; // Cold adaptation
        }
        if (envPressures.temperature > 0.7 && cell.traits.temperatureTolerance > 0.8) {
            score += 20; // Heat adaptation
        }

        // 7. Combat effectiveness and survival
        const combatWins = cell.combatWins || 0;
        const combatLosses = cell.combatLosses || 0;
        if (combatWins > combatLosses) {
            score += (combatWins - combatLosses) * 8;
        }

        // 8. Predation success (for predatory cells)
        const predationSuccess = cell.predationSuccess || 0;
        score += predationSuccess * 50;

        // 9. Size efficiency - balance between size advantages and energy costs
        const optimalSize = 12;
        const sizeDeviation = Math.abs(cell.traits.size - optimalSize);
        score += Math.max(0, 15 - sizeDeviation); // Penalty for being too far from optimal

        // 10. Genetic diversity bonus (encourages mutations)
        const mutationCount = cell.mutationHistory ? cell.mutationHistory.length : 0;
        score += Math.min(mutationCount * 3, 15);

        // 11. Life stage bonuses
        switch (cell.traits.lifestage) {
            case 'adult':
                score += 20; // Prime reproductive age
                break;
            case 'elder':
                score += 10; // Wisdom bonus, but reduced reproductive value
                break;
            case 'juvenile':
                score += 5; // Potential bonus
                break;
        }

        // 12. Defense type effectiveness in current environment
        if (this.viruses.length > 5) {
            // Virus outbreak - favor resistant cells
            if (cell.traits.defenseType === 'poison' || cell.traits.toxinResistance > 0.6) {
                score += 20;
            }
        }

        if (this.cells.length > this.settings.maxPopulation * 0.7) {
            // Crowded conditions - favor efficient cells
            if (cell.traits.size < 10) score += 15; // Small cells do better when crowded
            if (cell.colonyRole === 'sedentary') score += 10; // Cooperative behavior helps
        }

        // Apply fitness bonuses from beneficial mutations
        score += (cell.traits.fitnessBonus || 0) * 80;

        // Normalize score to prevent runaway values
        return Math.max(1, Math.min(1000, score));
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
        // Apply natural selection based on resource scarcity and environmental pressure
        const carryingCapacity = this.settings.maxPopulation * 0.85;
        const currentFood = this.foodManager.getFood().length;
        const currentCells = this.cells.length;

        // Calculate resource pressure - not just population size
        const foodPerCell = currentFood / currentCells;

        // FIXED: More lenient scarcity threshold for small populations
        let scarcityThreshold = 1.5; // Base threshold
        if (currentCells < 100) {
            // Small populations need less food per cell to avoid constant scarcity
            scarcityThreshold = Math.max(0.8, 1.5 - (100 - currentCells) * 0.007);
        }

        const resourceScarcity = foodPerCell < scarcityThreshold;
        const overpopulation = currentCells > carryingCapacity;

        // Natural selection occurs during resource scarcity OR severe overpopulation
        if (resourceScarcity || overpopulation) {
            // Calculate fitness for all cells
            this.cells.forEach(cell => {
                cell.fitnessScore = this.calculateEvolutionaryFitness(cell);
            });

            // Sort by fitness (highest first)
            const sortedCells = [...this.cells].sort((a, b) => b.fitnessScore - a.fitnessScore);

            // Determine removal rate based on severity of crisis
            let removalRate = 0.05; // Base 5% removal rate

            // FIXED: Gentler selection pressure for small populations
            if (currentCells < 80) {
                removalRate *= 0.4; // Much gentler selection for growing populations
            } else if (currentCells < 150) {
                removalRate *= 0.7; // Moderate selection for medium populations
            }

            if (resourceScarcity && overpopulation) {
                removalRate = Math.min(removalRate * 3, 0.12); // Cap at 12% even in crisis
            } else if (resourceScarcity) {
                removalRate = Math.min(removalRate * 1.6, 0.08); // Gentler scarcity selection
            } else if (overpopulation) {
                removalRate = Math.min(removalRate * 1.2, 0.06); // Gentle overcrowding selection
            }

            // Environmental factors affect selection pressure
            const envPressures = this.environment.getEnvironmentalPressures();
            if (envPressures.toxicity > 0.6) removalRate += 0.03; // Toxic environment increases death rate
            if (envPressures.radiation > 0.4) removalRate += 0.02; // Radiation increases death rate
            if (this.viruses.length > 10) removalRate += 0.04; // Disease outbreak increases death rate

            const cellsToRemove = Math.min(
                Math.floor(currentCells * removalRate),
                currentCells - this.settings.minPopulation // Never remove below minimum
            );

            // Apply probabilistic selection - even low fitness cells have some chance to survive
            const removedCells = [];

            // GROWTH ENHANCEMENT 8: Protect reproductive and colony members
            const protectedCells = new Set();
            this.cells.forEach(cell => {
                // Protect recently reproduced cells (they're contributing to growth)
                if (cell.reproduced && this.simulationTime - (cell.lastReproduction || 0) < 200) {
                    protectedCells.add(cell);
                }

                // Protect members of large, stable colonies
                if (cell.colony && cell.colony.members.length >= 5) {
                    protectedCells.add(cell);
                }

                // Protect cells with exceptional fitness (top 10%)
                if (cell.fitnessScore > (this.stats.averageFitness || 1) * 1.5) {
                    protectedCells.add(cell);
                }
            });

            const removalCandidates = sortedCells.filter(cell => !protectedCells.has(cell))
                .slice(-Math.floor(sortedCells.length * 0.4)); // Consider bottom 40% of unprotected

            for (let i = 0; i < cellsToRemove && removalCandidates.length > 0; i++) {
                // Weight removal probability by fitness (worse fitness = higher removal chance)
                const fitnessWeights = removalCandidates.map(cell => {
                    const avgFitness = this.stats.averageFitness || 1;
                    return Math.max(0.1, avgFitness - cell.fitnessScore + Math.random() * 10); // Add randomness
                });

                const totalWeight = fitnessWeights.reduce((sum, w) => sum + w, 0);
                let randomValue = Math.random() * totalWeight;

                for (let j = 0; j < removalCandidates.length; j++) {
                    randomValue -= fitnessWeights[j];
                    if (randomValue <= 0) {
                        removedCells.push(removalCandidates[j]);
                        removalCandidates.splice(j, 1);
                        break;
                    }
                }
            }

            // Remove the selected cells and convert them to food
            removedCells.forEach(cell => {
                const index = this.cells.indexOf(cell);
                if (index > -1) {
                    // Convert dead cell to food - more food during crisis helps survivors
                    this.foodManager.spawnFromDeath(cell.x, cell.y, cell.traits.size * 2);
                    this.cells.splice(index, 1);
                }
            });

            if (removedCells.length > 0) {
                const reason = resourceScarcity && overpopulation ? 'crisis' :
                    resourceScarcity ? 'starvation' :
                        overpopulation ? 'overcrowding' : 'environmental';
                console.log(`💀 Natural selection removed ${removedCells.length} cells due to ${reason} (pop: ${this.cells.length}, food: ${currentFood})`);
            }
        }
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