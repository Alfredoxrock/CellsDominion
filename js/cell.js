// Enhanced Cell class - The heart of our evolutionary simulation with shapes and advanced abilities

// Name generation for cells
class CellNameGenerator {
    static prefixes = [
        'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa',
        'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon',
        'Phi', 'Chi', 'Psi', 'Omega', 'Nova', 'Stellar', 'Cosmic', 'Quantum', 'Plasma', 'Ion',
        'Nebula', 'Pulsar', 'Quasar', 'Vortex', 'Matrix', 'Helix', 'Prism', 'Echo', 'Flux', 'Apex'
    ];

    static suffixes = [
        'Prime', 'Core', 'Genesis', 'Nexus', 'Void', 'Star', 'Ray', 'Wave', 'Force', 'Light',
        'Dark', 'Ghost', 'Shadow', 'Flame', 'Ice', 'Storm', 'Wind', 'Earth', 'Metal', 'Crystal',
        'Spark', 'Bolt', 'Surge', 'Pulse', 'Beat', 'Flow', 'Stream', 'Tide', 'Nova', 'Sol'
    ];

    static generate(parentName = null, mutationChance = 0.3) {
        if (parentName && Math.random() > mutationChance) {
            // Inherit parent name with small variation (Roman numeral or variant)
            const variants = ['II', 'III', 'Jr', 'Neo', 'X', 'Plus', 'Max', 'Pro'];
            const variant = variants[Math.floor(Math.random() * variants.length)];
            return `${parentName}-${variant}`;
        }

        // Generate new name
        const prefix = this.prefixes[Math.floor(Math.random() * this.prefixes.length)];
        const suffix = this.suffixes[Math.floor(Math.random() * this.suffixes.length)];
        const number = Math.floor(Math.random() * 999) + 1;

        return `${prefix}-${suffix}-${number.toString().padStart(3, '0')}`;
    }
}

// Colony class for managing cell structures
class Colony {
    constructor(founderCell) {
        this.id = `Colony-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        this.members = [founderCell];
        this.founder = founderCell;
        this.bonds = new Map(); // cell1_id -> cell2_id bonds
        this.sharedResources = {
            energy: 0,
            materials: 0
        };
        this.structure = {
            center: { x: founderCell.x, y: founderCell.y },
            radius: founderCell.radius * 2,
            integrity: 100
        };

        founderCell.colony = this;
        founderCell.isColonyFounder = true;
    }

    addMember(cell, bondWith) {
        if (this.members.includes(cell)) return false;
        if (this.members.length >= 20) return false; // Max colony size

        this.members.push(cell);
        cell.colony = this;

        if (bondWith && this.members.includes(bondWith)) {
            this.createBond(cell, bondWith);
        }

        this.updateStructure();
        return true;
    }

    removeMember(cell) {
        const index = this.members.indexOf(cell);
        if (index === -1) return false;

        this.members.splice(index, 1);
        cell.colony = null;

        // Remove all bonds involving this cell
        this.bonds.forEach((bond, key) => {
            if (bond.includes(cell.id)) {
                this.bonds.delete(key);
            }
        });

        // Remove from other cells' bond arrays
        cell.bonds = [];

        this.updateStructure();
        return true;
    }

    createBond(cell1, cell2) {
        if (!this.members.includes(cell1) || !this.members.includes(cell2)) return false;
        if (cell1.bonds.length >= cell1.maxBonds || cell2.bonds.length >= cell2.maxBonds) return false;

        const bondKey = `${Math.min(cell1.id, cell2.id)}_${Math.max(cell1.id, cell2.id)}`;
        if (this.bonds.has(bondKey)) return false;

        this.bonds.set(bondKey, { cell1: cell1.id, cell2: cell2.id, strength: 1.0, age: 0 });
        cell1.bonds.push(cell2.id);
        cell2.bonds.push(cell1.id);
        cell1.bondStrength.set(cell2.id, 1.0);
        cell2.bondStrength.set(cell1.id, 1.0);

        return true;
    }

    updateStructure() {
        if (this.members.length === 0) return;

        // Calculate center of mass
        let totalX = 0, totalY = 0, totalMass = 0;
        for (const member of this.members) {
            const mass = member.mass;
            totalX += member.x * mass;
            totalY += member.y * mass;
            totalMass += mass;
        }

        this.structure.center.x = totalX / totalMass;
        this.structure.center.y = totalY / totalMass;

        // Calculate structure radius (max distance from center)
        let maxDistance = 0;
        for (const member of this.members) {
            const dist = Math.sqrt(
                Math.pow(member.x - this.structure.center.x, 2) +
                Math.pow(member.y - this.structure.center.y, 2)
            ) + member.radius;
            maxDistance = Math.max(maxDistance, dist);
        }
        this.structure.radius = maxDistance;
    }

    shareResources() {
        // Pool energy and distribute it
        let totalEnergy = 0;
        let totalCapacity = 0;

        for (const member of this.members) {
            totalEnergy += member.traits.energy;
            totalCapacity += member.traits.maxEnergy;
        }

        // Keep 90% for members, 10% for colony reserves
        const sharedEnergy = totalEnergy * 0.1;
        const individualEnergy = (totalEnergy * 0.9) / this.members.length;

        this.sharedResources.energy = sharedEnergy;

        for (const member of this.members) {
            // Balance energy across colony members
            const targetEnergy = Math.min(individualEnergy, member.traits.maxEnergy);
            if (member.traits.energy < targetEnergy) {
                const energyDiff = Math.min(targetEnergy - member.traits.energy, sharedEnergy);
                member.traits.energy += energyDiff;
                this.sharedResources.energy -= energyDiff;
            }
        }
    }

    render(ctx) {
        // Draw colony structure outline
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(this.structure.center.x, this.structure.center.y, this.structure.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw bonds between cells
        this.bonds.forEach((bond) => {
            const cell1 = this.members.find(m => m.id === bond.cell1);
            const cell2 = this.members.find(m => m.id === bond.cell2);

            if (cell1 && cell2) {
                ctx.strokeStyle = `rgba(0, 255, 136, ${bond.strength * 0.8})`;
                ctx.lineWidth = bond.strength * 3;
                ctx.beginPath();
                ctx.moveTo(cell1.x, cell1.y);
                ctx.lineTo(cell2.x, cell2.y);
                ctx.stroke();
            }
        });

        // Draw colony name
        ctx.font = '14px "Orbitron", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#00ff88';
        ctx.fillText(
            this.id.split('-')[0],
            this.structure.center.x,
            this.structure.center.y - this.structure.radius - 20
        );
    }
}

class Cell {
    constructor(x, y, traits = {}) {
        // Position and movement
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2; // Random initial velocity
        this.vy = (Math.random() - 0.5) * 2;
        this.rotation = Math.random() * Math.PI * 2; // For non-circular shapes

        // Cell identity
        this.id = `cell_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        this.name = traits.name || CellNameGenerator.generate(traits.parentName, 0.7);
        this.showName = true;
        this.nameVisibilityTimer = 0;

        // Infection status
        this.isVirus = false;
        this.isInfected = false;
        this.infectionTimer = 0;
        this.infectionSeverity = 0;
        this.infectedBy = null;

        // Core traits (DNA) - Enhanced with many new features
        this.traits = {
            // Basic physical traits
            health: traits.health || 80 + Math.random() * 40, // 80-120
            maxHealth: traits.maxHealth || traits.health || 100,
            size: traits.size || 8 + Math.random() * 8, // 8-16 radius
            speed: traits.speed || 0.5 + Math.random() * 1.5, // 0.5-2.0
            energy: traits.energy || 60 + Math.random() * 40, // 60-100
            maxEnergy: traits.maxEnergy || traits.energy || 80,

            // Shape and defense
            shape: traits.shape || this.randomShape(),
            defenseType: traits.defenseType || this.randomDefenseType(),

            // New advanced traits
            specialAbility: traits.specialAbility || this.randomSpecialAbility(),
            metabolismType: traits.metabolismType || this.randomMetabolismType(),
            socialBehavior: traits.socialBehavior || this.randomSocialBehavior(),
            lifestage: traits.lifestage || 'juvenile',

            // Environmental adaptations
            temperatureTolerance: traits.temperatureTolerance || 0.3 + Math.random() * 0.4,
            acidTolerance: traits.acidTolerance || 0.3 + Math.random() * 0.4,
            radiationResistance: traits.radiationResistance || 0.2 + Math.random() * 0.3,

            // Sensory and communication
            visionRange: traits.visionRange || 40 + Math.random() * 60, // 40-100
            communicationRange: traits.communicationRange || 30 + Math.random() * 50,
            pheromoneProduction: traits.pheromoneProduction || 0.1 + Math.random() * 0.4,

            // Advanced abilities
            toxinResistance: traits.toxinResistance || Math.random() * 0.5,
            magneticSensitivity: traits.magneticSensitivity || Math.random() * 0.4,
            electrogenesis: traits.electrogenesis || Math.random() * 0.3,

            ...traits
        };

        // Derived properties based on shape
        this.radius = this.traits.size;
        this.mass = this.calculateMass();
        this.hitbox = this.calculateHitbox();

        // Enhanced state variables
        this.age = 0;
        this.generation = traits.generation || 1;
        this.reproduced = false;
        this.target = null;
        this.lastReproduction = 0;
        this.allies = []; // For pack behavior
        this.territory = null; // For territorial cells

        // Colony/Structure system
        this.colony = null; // Reference to colony this cell belongs to
        this.bonds = []; // Direct bonds with neighboring cells
        this.maxBonds = 4; // Maximum number of bonds a cell can form
        this.bondStrength = new Map(); // Strength of bonds with other cells
        this.isColonyFounder = false;

        // Colony role specialization
        this.colonyRole = traits.colonyRole || this.determineInitialRole();
        this.roleDecisionTimer = 0;
        this.homePosition = { x: this.x, y: this.y }; // Home base for sedentary cells
        this.maxDistanceFromHome = 100; // How far adventurers can roam
        this.explorationTarget = null;

        // Round tournament stats
        this.roundStats = {
            survivalTime: 0,
            foodEaten: 0,
            combatWins: 0,
            damageTaken: 0,
            distanceTraveled: 0,
            fitnessScore: 0,
            lastX: this.x,
            lastY: this.y,
            roundStartHealth: this.traits.health,
            roundStartEnergy: this.traits.energy
        };

        // Lifecycle progression
        this.maturityAge = 200 + Math.random() * 200; // 200-400 ticks to adult
        this.elderAge = 1000 + Math.random() * 500; // 1000-1500 ticks to elder

        // Enhanced defense mechanism states
        this.defenseStates = {
            // Original defenses
            poisonAura: 0,
            regenCooldown: 0,
            camouflageActive: 0,
            spikesDamage: this.traits.size * 0.3,

            // New defense states
            shieldEnergy: 0,
            electricCharge: 0,
            magneticField: 0,
            phaseShift: 0,
            swarmSignal: 0,
            mimicTarget: null,
            explosivePower: this.traits.size * 0.5,
            viralLoad: 0,

            // Special ability states
            photosynthesisRate: 0,
            parasiteHost: null,
            packMembers: [],
            territoryRadius: this.traits.size * 8,
            migrationTarget: null
        };

        // Communication and social states
        this.pheromones = [];
        this.receivedSignals = [];
        this.socialConnections = new Set();

        // Visual properties - now shape-dependent
        this.color = this.getColorByTraits();
        this.opacity = 1.0;
        this.glowIntensity = 0;
        this.particleEffects = [];
    }

    // Enhanced random generation methods
    randomShape() {
        const shapes = ['circle', 'triangle', 'square', 'hexagon', 'oval', 'star', 'diamond'];
        return shapes[Math.floor(Math.random() * shapes.length)];
    }

    randomDefenseType() {
        const types = [
            // Original defenses
            'spikes', 'poison', 'armor', 'regen', 'camo',
            // New advanced defenses
            'shield', 'electric', 'magnetic', 'phase', 'swarm',
            'mimic', 'explosive', 'viral', 'barrier', 'reflect'
        ];
        return types[Math.floor(Math.random() * types.length)];
    }

    randomSpecialAbility() {
        const abilities = [
            'none', 'photosynthesis', 'parasite', 'pack_hunter', 'territorial',
            'migratory', 'burrowing', 'leaping', 'splitting', 'fusion',
            'time_dilation', 'energy_vampire', 'shape_shift', 'invisibility'
        ];
        return abilities[Math.floor(Math.random() * abilities.length)];
    }

    randomMetabolismType() {
        const types = ['normal', 'efficient', 'burst', 'parasitic', 'photosynthetic'];
        return types[Math.floor(Math.random() * types.length)];
    }

    randomSocialBehavior() {
        const behaviors = ['solitary', 'cooperative', 'aggressive', 'territorial', 'pack'];
        return behaviors[Math.floor(Math.random() * behaviors.length)];
    }

    determineInitialRole() {
        // Determine initial colony role based on traits
        const speed = this.traits.speed;
        const socialBehavior = this.traits.socialBehavior;
        const specialAbility = this.traits.specialAbility;

        // Adventurers are typically faster, pack hunters, or migratory
        if (speed > 2.5 ||
            socialBehavior === 'pack' ||
            specialAbility === 'migratory' ||
            specialAbility === 'pack_hunter') {
            return Math.random() < 0.7 ? 'adventurer' : 'sedentary';
        }

        // Sedentary cells are territorial, have defensive abilities, or photosynthetic
        if (socialBehavior === 'territorial' ||
            this.traits.defenseType !== 'none' ||
            specialAbility === 'photosynthesis' ||
            specialAbility === 'burrowing') {
            return Math.random() < 0.7 ? 'sedentary' : 'adventurer';
        }

        // Default: random with slight bias toward adventurer
        return Math.random() < 0.6 ? 'adventurer' : 'sedentary';
    }

    calculateMass() {
        const shapeMultipliers = {
            circle: 1.0,
            triangle: 0.7,
            square: 1.2,
            hexagon: 1.1,
            oval: 0.9,
            star: 0.8,
            diamond: 0.85
        };
        return (this.traits.size / 4) * (shapeMultipliers[this.traits.shape] || 1.0);
    }

    calculateHitbox() {
        // Different shapes have different collision areas
        const shapeFactors = {
            circle: 1.0,
            triangle: 0.9,
            square: 1.1,
            hexagon: 1.05,
            oval: 1.0,
            star: 0.8,
            diamond: 0.95
        };
        return this.radius * (shapeFactors[this.traits.shape] || 1.0);
    }

    getColorByTraits() {
        // Base color determined by defense type
        const defenseColors = {
            // Original
            spikes: '#ff6b6b',    // Red
            poison: '#51cf66',    // Green
            armor: '#748ffc',     // Blue
            regen: '#ff9ff3',     // Pink
            camo: '#69db7c',      // Light Green

            // New defenses
            shield: '#4dabf7',    // Light Blue
            electric: '#ffd43b',  // Yellow
            magnetic: '#9775fa',  // Purple
            phase: '#495057',     // Gray
            swarm: '#fd7e14',     // Orange
            mimic: '#20c997',     // Teal
            explosive: '#fa5252', // Bright Red
            viral: '#37b24d',     // Dark Green
            barrier: '#868e96',   // Silver
            reflect: '#e64980'    // Magenta
        };

        let baseColor = defenseColors[this.traits.defenseType] || '#ffffff';

        // Modify color based on special abilities
        if (this.traits.specialAbility === 'photosynthesis') {
            baseColor = this.blendColors(baseColor, '#40c057', 0.3);
        } else if (this.traits.specialAbility === 'parasite') {
            baseColor = this.blendColors(baseColor, '#7c2d12', 0.4);
        }

        return baseColor;
    }

    blendColors(color1, color2, ratio) {
        // Simple color blending utility
        const hex = (color) => parseInt(color.slice(1), 16);
        const r1 = (hex(color1) >> 16) & 255;
        const g1 = (hex(color1) >> 8) & 255;
        const b1 = hex(color1) & 255;
        const r2 = (hex(color2) >> 16) & 255;
        const g2 = (hex(color2) >> 8) & 255;
        const b2 = hex(color2) & 255;

        const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
        const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
        const b = Math.round(b1 * (1 - ratio) + b2 * ratio);

        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    update(cells, food, boundaries, environment = {}) {
        this.age++;

        // Lifecycle progression
        this.updateLifecycle();

        // Handle infection effects
        this.handleInfection();

        // Environmental effects
        this.applyEnvironmentalEffects(environment);

        // Metabolism and energy drain
        const energyDrain = this.calculateEnergyDrain();
        this.traits.energy -= energyDrain;

        // Special ability effects
        this.applySpecialAbilities(cells, food);

        // Die if out of energy or health
        if (this.traits.energy <= 0 || this.traits.health <= 0) {
            return false; // Signal death
        }

        // Apply defense mechanisms (enhanced)
        this.applyDefenseMechanisms(cells);

        // Social behavior and communication
        this.processCommunication(cells);

        // Enhanced AI behavior
        this.makeDecisions(cells, food, environment);

        // Movement with shape-specific physics
        this.move(boundaries);

        // Update visual effects
        this.updateVisualEffects();

        // Update particle effects
        this.updateParticleEffects();

        return true; // Still alive
    }

    updateLifecycle() {
        if (this.age > this.maturityAge && this.traits.lifestage === 'juvenile') {
            this.traits.lifestage = 'adult';
            this.traits.maxHealth *= 1.2;
            this.traits.health = this.traits.maxHealth;
            this.traits.maxEnergy *= 1.15;
        } else if (this.age > this.elderAge && this.traits.lifestage === 'adult') {
            this.traits.lifestage = 'elder';
            this.traits.speed *= 0.7; // Slower but wiser
            this.traits.visionRange *= 1.5; // Better perception
        }
    }

    handleInfection() {
        if (!this.isInfected) return;

        this.infectionTimer--;

        // Apply infection damage over time
        const damagePerTick = this.infectionSeverity * 0.5;
        this.traits.health -= damagePerTick;
        this.traits.energy -= damagePerTick * 0.3;

        // Visual infection effects
        if (this.infectionTimer % 20 === 0) {
            // Add sickness particles
            for (let i = 0; i < 3; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 0.5 + Math.random() * 1;

                this.particleEffects.push({
                    x: this.x,
                    y: this.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 1 + Math.random() * 2,
                    life: 30,
                    maxLife: 30,
                    color: '#66ff66',
                    type: 'sickness'
                });
            }
        }

        // Recovery or death
        if (this.infectionTimer <= 0) {
            // Cell either recovers or dies
            const survivalChance = (this.traits.health / this.traits.maxHealth) * 0.7 + this.traits.toxinResistance * 0.3;

            if (Math.random() < survivalChance) {
                // Successful recovery
                this.isInfected = false;
                this.infectionTimer = 0;
                this.infectionSeverity = 0;
                this.infectedBy = null;

                // Gain some immunity (increased toxin resistance)
                this.traits.toxinResistance = Math.min(0.9, this.traits.toxinResistance + 0.1);

                console.log(`${this.name} recovered from infection!`);
            } else {
                // Death from infection
                this.traits.health = 0;
                console.log(`${this.name} died from infection by ${this.infectedBy}`);
            }
        }
    }

    applyEnvironmentalEffects(environment) {
        // Temperature effects
        if (environment.temperature) {
            const tempDiff = Math.abs(environment.temperature - 0.5);
            if (tempDiff > this.traits.temperatureTolerance) {
                this.traits.health -= (tempDiff - this.traits.temperatureTolerance) * 2;
            }
        }

        // Acid effects
        if (environment.acidity > this.traits.acidTolerance) {
            this.traits.health -= (environment.acidity - this.traits.acidTolerance) * 3;
        }

        // Radiation effects
        if (environment.radiation > this.traits.radiationResistance) {
            this.traits.health -= (environment.radiation - this.traits.radiationResistance) * 1.5;
            // Radiation can cause beneficial mutations too
            if (Math.random() < 0.01) {
                this.randomBeneficialMutation();
            }
        }
    }

    calculateEnergyDrain() {
        let baseDrain = 0.1 + (this.traits.size * 0.01);

        // Metabolism type effects
        switch (this.traits.metabolismType) {
            case 'efficient':
                baseDrain *= 0.7;
                break;
            case 'burst':
                baseDrain *= 1.5;
                break;
            case 'photosynthetic':
                baseDrain *= 0.5; // Much more efficient
                break;
        }

        // Shape affects energy efficiency
        const shapeEfficiency = {
            circle: 1.0,
            triangle: 0.9,
            square: 1.1,
            hexagon: 0.95,
            oval: 1.05,
            star: 1.2,
            diamond: 1.0
        };

        baseDrain *= (shapeEfficiency[this.traits.shape] || 1.0);

        // Lifestage effects
        if (this.traits.lifestage === 'juvenile') {
            baseDrain *= 0.8; // Young need less energy
        } else if (this.traits.lifestage === 'elder') {
            baseDrain *= 1.3; // Old need more energy
        }

        return baseDrain;
    }

    applyDefenseMechanisms(cells) {
        switch (this.traits.defenseType) {
            // Original defense types
            case 'regen':
                this.defenseStates.regenCooldown--;
                if (this.defenseStates.regenCooldown <= 0 && this.traits.health < this.traits.maxHealth) {
                    this.traits.health += 0.5; // Slow regeneration
                    this.traits.energy -= 0.2; // Costs energy
                    this.defenseStates.regenCooldown = 60; // 1 second at 60fps
                }
                break;

            case 'poison':
                this.defenseStates.poisonAura = Math.max(0, this.defenseStates.poisonAura - 1);
                break;

            case 'camo':
                const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                if (speed < 0.5) {
                    this.defenseStates.camouflageActive = Math.min(60, this.defenseStates.camouflageActive + 1);
                } else {
                    this.defenseStates.camouflageActive = Math.max(0, this.defenseStates.camouflageActive - 2);
                }
                this.opacity = 1.0 - (this.defenseStates.camouflageActive / 120);
                break;

            // New advanced defense types
            case 'shield':
                this.defenseStates.shieldEnergy = Math.min(100, this.defenseStates.shieldEnergy + 0.5);
                if (this.traits.energy > 5) {
                    this.traits.energy -= 0.1; // Shield maintenance cost
                }
                break;

            case 'electric':
                this.defenseStates.electricCharge += 0.8;
                if (this.defenseStates.electricCharge > 100) {
                    this.defenseStates.electricCharge = 100;
                    // Electric discharge damages nearby cells
                    this.electricDischarge(cells);
                }
                break;

            case 'magnetic':
                this.defenseStates.magneticField = Math.min(80, this.defenseStates.magneticField + 0.6);
                this.applyMagneticEffects(cells);
                break;

            case 'phase':
                this.defenseStates.phaseShift += 0.3;
                if (this.defenseStates.phaseShift > 60) {
                    this.opacity = 0.3; // Phase out
                    this.defenseStates.phaseShift = 0;
                } else {
                    this.opacity = 1.0;
                }
                break;

            case 'swarm':
                this.defenseStates.swarmSignal++;
                if (this.defenseStates.swarmSignal > 120) {
                    this.callSwarm(cells);
                    this.defenseStates.swarmSignal = 0;
                }
                break;

            case 'mimic':
                if (this.defenseStates.mimicTarget) {
                    this.mimicBehavior(this.defenseStates.mimicTarget);
                } else {
                    this.findMimicTarget(cells);
                }
                break;

            case 'explosive':
                this.defenseStates.explosivePower += 0.2;
                if (this.traits.health < this.traits.maxHealth * 0.2) {
                    // Low health triggers explosion
                    this.explode(cells);
                    return false; // Cell dies in explosion
                }
                break;

            case 'viral':
                this.defenseStates.viralLoad += 0.3;
                if (this.defenseStates.viralLoad > 80) {
                    this.spreadVirus(cells);
                    this.defenseStates.viralLoad = 0;
                }
                break;

            case 'barrier':
                // Creates temporary barriers around the cell
                this.maintainBarrier();
                break;

            case 'reflect':
                // Reflects damage back to attackers
                this.chargeReflection();
                break;
        }
    }

    // New defense mechanism implementations
    electricDischarge(cells) {
        const dischargeRadius = this.radius + 25;
        cells.forEach(target => {
            if (target === this) return;

            const distance = this.distanceTo(target);
            if (distance < dischargeRadius) {
                const damage = 15 * (1 - distance / dischargeRadius);
                target.traits.health -= damage;
                target.traits.energy -= damage * 0.5;
                this.createParticleEffect('electric', target.x, target.y);
            }
        });
        this.defenseStates.electricCharge = 0;
        this.traits.energy -= 8; // High energy cost for discharge
    }

    applyMagneticEffects(cells) {
        const magneticRadius = this.radius + 40;
        cells.forEach(target => {
            if (target === this) return;

            const distance = this.distanceTo(target);
            if (distance < magneticRadius && target.traits.magneticSensitivity > 0) {
                // Pull or repel based on magnetic sensitivity
                const force = 0.2 * target.traits.magneticSensitivity;
                const angle = Math.atan2(target.y - this.y, target.x - this.x);

                if (this.defenseStates.magneticField > 40) {
                    // Attractive field
                    target.vx -= Math.cos(angle) * force;
                    target.vy -= Math.sin(angle) * force;
                } else {
                    // Repulsive field
                    target.vx += Math.cos(angle) * force;
                    target.vy += Math.sin(angle) * force;
                }
            }
        });
    }

    callSwarm(cells) {
        // Signal other swarm cells to converge
        cells.forEach(cell => {
            if (cell.traits.defenseType === 'swarm' && this.distanceTo(cell) < 200) {
                cell.target = this.target || this;
                cell.defenseStates.swarmSignal = 60; // Synchronize swarm
            }
        });
    }

    findMimicTarget(cells) {
        // Find the most successful cell nearby to mimic
        let bestTarget = null;
        let bestFitness = 0;

        cells.forEach(cell => {
            if (cell === this) return;
            if (this.distanceTo(cell) > this.traits.visionRange) return;

            const fitness = cell.traits.health + cell.traits.energy + cell.age * 0.01;
            if (fitness > bestFitness) {
                bestFitness = fitness;
                bestTarget = cell;
            }
        });

        this.defenseStates.mimicTarget = bestTarget;
    }

    mimicBehavior(target) {
        // Copy target's movement and behavior patterns
        if (!target || target.traits.health <= 0) {
            this.defenseStates.mimicTarget = null;
            return;
        }

        const influence = 0.1;
        this.vx += (target.vx - this.vx) * influence;
        this.vy += (target.vy - this.vy) * influence;

        // Slowly adapt some traits
        if (Math.random() < 0.001) {
            this.traits.speed += (target.traits.speed - this.traits.speed) * 0.05;
        }
    }

    explode(cells) {
        const explosionRadius = this.radius + this.defenseStates.explosivePower;
        cells.forEach(target => {
            if (target === this) return;

            const distance = this.distanceTo(target);
            if (distance < explosionRadius) {
                const damage = this.defenseStates.explosivePower * (1 - distance / explosionRadius);
                target.traits.health -= damage;

                // Knockback effect
                const angle = Math.atan2(target.y - this.y, target.x - this.x);
                const knockback = damage * 0.2;
                target.vx += Math.cos(angle) * knockback;
                target.vy += Math.sin(angle) * knockback;
            }
        });

        // Create explosion particle effect
        this.createParticleEffect('explosion', this.x, this.y);
    }

    spreadVirus(cells) {
        const viralRadius = this.radius + 30;
        cells.forEach(target => {
            if (target === this) return;
            if (target.traits.toxinResistance > 0.7) return; // Immune cells

            const distance = this.distanceTo(target);
            if (distance < viralRadius) {
                // Infect target
                target.defenseStates.viralLoad += 20;
                target.traits.health -= 2;
                target.traits.energy -= 3;

                // Chance to change target's behavior
                if (Math.random() < 0.1) {
                    target.traits.socialBehavior = 'aggressive';
                }
            }
        });
    }

    maintainBarrier() {
        // Barrier reduces incoming damage and movement
        this.traits.energy -= 0.05;
        this.barrier = {
            active: true,
            strength: this.traits.size * 0.8,
            radius: this.radius + 8
        };
    }

    chargeReflection() {
        // Store energy for reflecting damage
        if (this.defenseStates.reflectCharge < 50) {
            this.defenseStates.reflectCharge += 0.4;
            this.traits.energy -= 0.02;
        }
    }

    // Special abilities implementation
    applySpecialAbilities(cells, food) {
        switch (this.traits.specialAbility) {
            case 'photosynthesis':
                // Generate energy from light (simulated)
                this.traits.energy += 0.3 * (1 - this.opacity); // More energy when visible
                break;

            case 'parasite':
                this.parasiteBehavior(cells);
                break;

            case 'pack_hunter':
                this.packHuntingBehavior(cells);
                break;

            case 'territorial':
                this.territorialBehavior(cells);
                break;

            case 'migratory':
                this.migratoryBehavior();
                break;

            case 'burrowing':
                this.burrowingBehavior();
                break;

            case 'leaping':
                this.leapingBehavior(cells);
                break;

            case 'splitting':
                this.splittingBehavior();
                break;

            case 'fusion':
                this.fusionBehavior(cells);
                break;

            case 'energy_vampire':
                this.energyVampireBehavior(cells);
                break;

            case 'shape_shift':
                this.shapeShiftBehavior();
                break;

            case 'time_dilation':
                this.timeDilationBehavior();
                break;
        }
    }

    parasiteBehavior(cells) {
        if (this.defenseStates.parasiteHost) {
            const host = this.defenseStates.parasiteHost;
            if (host.traits.health > 0 && this.distanceTo(host) < this.radius + host.radius + 5) {
                // Drain host's energy and health
                const drainAmount = 0.8;
                host.traits.energy -= drainAmount;
                host.traits.health -= drainAmount * 0.3;
                this.traits.energy += drainAmount * 0.7;
                this.traits.health += drainAmount * 0.2;
                return;
            } else {
                this.defenseStates.parasiteHost = null;
            }
        }

        // Find new host
        const nearbyCell = this.findNearestCell(cells, this.traits.visionRange);
        if (nearbyCell && nearbyCell.traits.size > this.traits.size * 0.8) {
            this.defenseStates.parasiteHost = nearbyCell;
            this.target = nearbyCell;
        }
    }

    packHuntingBehavior(cells) {
        // Find pack members
        this.defenseStates.packMembers = cells.filter(cell =>
            cell !== this &&
            cell.traits.specialAbility === 'pack_hunter' &&
            this.distanceTo(cell) < this.traits.communicationRange
        );

        if (this.defenseStates.packMembers.length > 0) {
            // Coordinate pack hunting
            if (!this.target) {
                // Find common target
                const commonTarget = this.findPackTarget(cells);
                if (commonTarget) {
                    this.target = commonTarget;
                    this.defenseStates.packMembers.forEach(member => {
                        member.target = commonTarget;
                    });
                }
            }

            // Pack hunting bonus
            this.traits.speed *= 1.1;
            this.traits.health += 0.1; // Pack support
        }
    }

    territorialBehavior(cells) {
        if (!this.territory) {
            this.territory = { x: this.x, y: this.y, radius: this.defenseStates.territoryRadius };
        }

        // Defend territory
        cells.forEach(intruder => {
            if (intruder === this) return;

            const distanceFromCenter = Math.sqrt(
                (intruder.x - this.territory.x) ** 2 +
                (intruder.y - this.territory.y) ** 2
            );

            if (distanceFromCenter < this.territory.radius) {
                // Aggressive behavior towards intruders
                this.target = intruder;
                this.traits.health += 0.2; // Territory defense bonus
            }
        });
    }

    migratoryBehavior() {
        if (!this.defenseStates.migrationTarget ||
            this.distanceToPoint(this.defenseStates.migrationTarget.x, this.defenseStates.migrationTarget.y) < 20) {
            // Set new migration target
            this.defenseStates.migrationTarget = {
                x: Math.random() * 1000,
                y: Math.random() * 700
            };
        }

        // Move towards migration target
        this.moveTowards(this.defenseStates.migrationTarget.x, this.defenseStates.migrationTarget.y);
        this.traits.energy -= 0.05; // Migration is tiring
    }

    burrowingBehavior() {
        if (this.traits.energy < this.traits.maxEnergy * 0.3) {
            // Burrow to save energy
            this.opacity = 0.3;
            this.vx *= 0.5;
            this.vy *= 0.5;
            this.traits.energy += 0.1; // Rest bonus
        }
    }

    leapingBehavior(cells) {
        if (this.target && Math.random() < 0.05) {
            // Sudden leap towards target
            const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
            const leapPower = this.traits.speed * 3;
            this.vx += Math.cos(angle) * leapPower;
            this.vy += Math.sin(angle) * leapPower;
            this.traits.energy -= 2; // Leaping costs energy
        }
    }

    splittingBehavior() {
        if (this.traits.energy > this.traits.maxEnergy * 0.9 &&
            this.traits.size > 12 &&
            Math.random() < 0.001) {
            this.reproduced = true; // Trigger splitting reproduction
            this.traits.size *= 0.7; // Parent gets smaller
        }
    }

    fusionBehavior(cells) {
        const nearbyFusionCells = cells.filter(cell =>
            cell !== this &&
            cell.traits.specialAbility === 'fusion' &&
            this.distanceTo(cell) < this.radius + cell.radius + 2 &&
            cell.traits.size + this.traits.size < 25
        );

        if (nearbyFusionCells.length > 0 && Math.random() < 0.01) {
            const partner = nearbyFusionCells[0];
            // Merge traits
            this.traits.size += partner.traits.size * 0.3;
            this.traits.health += partner.traits.health * 0.2;
            this.traits.energy += partner.traits.energy * 0.3;
            partner.traits.health = 0; // Partner is consumed
        }
    }

    energyVampireBehavior(cells) {
        cells.forEach(victim => {
            if (victim === this) return;
            if (this.distanceTo(victim) < this.radius + victim.radius + 10) {
                const drainAmount = 0.5;
                victim.traits.energy -= drainAmount;
                this.traits.energy += drainAmount * 0.8;
                this.createParticleEffect('energy_drain', victim.x, victim.y);
            }
        });
    }

    shapeShiftBehavior() {
        if (Math.random() < 0.005) {
            // Randomly change shape
            this.traits.shape = this.randomShape();
            this.hitbox = this.calculateHitbox();
            this.mass = this.calculateMass();
        }
    }

    timeDilationBehavior() {
        if (this.traits.energy > this.traits.maxEnergy * 0.7) {
            // Accelerate time perception (act faster)
            this.traits.speed *= 1.2;
            this.traits.energy -= 0.3;
        }
    }

    // Communication and social behavior
    processCommunication(cells) {
        // Emit pheromones
        if (this.traits.pheromoneProduction > 0 && Math.random() < this.traits.pheromoneProduction) {
            this.emitPheromone();
        }

        // Process received signals
        this.processSignals(cells);

        // Update social connections
        this.updateSocialConnections(cells);
    }

    emitPheromone() {
        const pheromone = {
            x: this.x,
            y: this.y,
            type: this.getCurrentEmotionalState(),
            strength: this.traits.pheromoneProduction,
            age: 0,
            maxAge: 300 + Math.random() * 200
        };
        this.pheromones.push(pheromone);
    }

    processSignals(cells) {
        // Process pheromone signals from nearby cells
        cells.forEach(otherCell => {
            if (otherCell === this) return;

            const distance = this.distanceTo(otherCell);
            if (distance < this.traits.communicationRange) {
                // Receive pheromone signals
                otherCell.pheromones.forEach(pheromone => {
                    const signalStrength = pheromone.strength * (1 - distance / this.traits.communicationRange);
                    this.processPheromoneSignal(pheromone.type, signalStrength, otherCell);
                });
            }
        });
    }

    processPheromoneSignal(signalType, strength, sender) {
        switch (signalType) {
            case 'danger':
                // Move away from danger signals
                if (strength > 0.3) {
                    const dx = this.x - sender.x;
                    const dy = this.y - sender.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance > 0) {
                        this.vx += (dx / distance) * strength * 0.5;
                        this.vy += (dy / distance) * strength * 0.5;
                    }
                }
                break;

            case 'hungry':
                // Share food location if we know any
                if (this.target && strength > 0.4) {
                    // Signal food location to hungry cell
                    const foodDirection = {
                        x: this.target.x - sender.x,
                        y: this.target.y - sender.y
                    };
                    const distance = Math.sqrt(foodDirection.x * foodDirection.x + foodDirection.y * foodDirection.y);
                    if (distance > 0) {
                        sender.vx += (foodDirection.x / distance) * strength * 0.3;
                        sender.vy += (foodDirection.y / distance) * strength * 0.3;
                    }
                }
                break;

            case 'mating':
                // Attract compatible cells for reproduction
                if (this.traits.energy > this.traits.maxEnergy * 0.7 && strength > 0.5) {
                    const dx = sender.x - this.x;
                    const dy = sender.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance > 0) {
                        this.vx += (dx / distance) * strength * 0.2;
                        this.vy += (dy / distance) * strength * 0.2;
                    }
                }
                break;
        }
    }

    updateSocialConnections(cells) {
        // Update connections with nearby cells for pack behaviors
        if (this.traits.specialAbility === 'pack_hunter') {
            this.packMembers = cells.filter(cell =>
                cell !== this &&
                cell.traits.specialAbility === 'pack_hunter' &&
                this.distanceTo(cell) < 80
            );
        }

        // Colony formation and management
        this.updateColonyBehavior(cells);
    }

    updateColonyBehavior(cells) {
        // Don't form colonies if already in one and it's stable (but allow more activity for clustering)
        if (this.colony && this.colony.members.length > 1 && Math.random() > 0.02) return;

        // Role-based colony behavior
        const bondingDistance = this.colonyRole === 'sedentary' ? 80 : 100; // Sedentary cells cluster tighter
        const formationChance = this.colonyRole === 'sedentary' ? 0.08 : 0.03; // Sedentary cells more likely to form colonies

        // Look for nearby cells to form bonds with
        const nearbyCells = cells.filter(cell =>
            cell !== this &&
            cell.traits.defenseType === this.traits.defenseType && // Similar defense types bond better
            this.distanceTo(cell) < bondingDistance &&
            (!this.colony || !cell.colony || this.colony === cell.colony) && // Not in different colonies
            // Prefer same roles for stronger colonies, but allow mixed
            (this.colonyRole === cell.colonyRole || Math.random() < 0.3)
        );

        if (nearbyCells.length === 0) return;

        // If not in a colony, consider founding one
        if (!this.colony && this.traits.energy > this.traits.maxEnergy * 0.5) {
            const candidate = nearbyCells.find(cell => !cell.colony);
            if (candidate && Math.random() < formationChance) {
                this.foundColony(candidate);
            }
        }

        // If in a colony, consider inviting nearby cells
        const maxColonySize = this.colonyRole === 'sedentary' ? 12 : 8; // Sedentary colonies can be larger
        if (this.colony && this.isColonyFounder && this.colony.members.length < maxColonySize) {
            const candidate = nearbyCells.find(cell => !cell.colony);
            if (candidate && Math.random() < 0.04) { // Increased invitation rate
                this.colony.addMember(candidate, this);
                // Update home position for new members to cluster around colony center
                if (candidate.colonyRole === 'sedentary') {
                    candidate.homePosition = { x: this.x, y: this.y };
                }
            }
        }

        // Enhanced bond management with role consideration
        if (this.colony) {
            this.colony.bonds.forEach((bond, key) => {
                bond.age++;
                const cell1 = this.colony.members.find(m => m.id === bond.cell1);
                const cell2 = this.colony.members.find(m => m.id === bond.cell2);

                if (cell1 && cell2) {
                    const distance = cell1.distanceTo(cell2);
                    const maxDistance = (cell1.colonyRole === 'sedentary' && cell2.colonyRole === 'sedentary') ? 60 : 100;

                    if (distance > maxDistance) {
                        bond.strength -= 0.015; // Faster decay for distant bonds
                    } else if (distance < 30) {
                        bond.strength = Math.min(1.0, bond.strength + 0.01); // Faster strengthening when close
                    }

                    // Remove weak bonds
                    if (bond.strength <= 0) {
                        this.colony.bonds.delete(key);
                        if (cell1 && cell2) {
                            cell1.bonds = cell1.bonds.filter(id => id !== cell2.id);
                            cell2.bonds = cell2.bonds.filter(id => id !== cell1.id);
                            cell1.bondStrength.delete(cell2.id);
                            cell2.bondStrength.delete(cell1.id);
                        }
                    }
                }
            });
        }
    }

    foundColony(partnerCell) {
        if (this.colony || partnerCell.colony) return false;

        const newColony = new Colony(this);
        newColony.addMember(partnerCell, this);

        console.log(`${this.name} founded colony ${newColony.id} with ${partnerCell.name}`);
        return true;
    }

    getCurrentEmotionalState() {
        if (this.traits.energy < this.traits.maxEnergy * 0.3) return 'hungry';
        if (this.traits.health < this.traits.maxHealth * 0.4) return 'danger';
        if (this.target) return 'hunting';
        if (this.reproduced) return 'mating';
        return 'neutral';
    }

    // Utility methods
    distanceTo(other) {
        return Math.sqrt((other.x - this.x) ** 2 + (other.y - this.y) ** 2);
    }

    distanceToPoint(x, y) {
        return Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2);
    }

    findNearestCell(cells, maxRange) {
        let nearest = null;
        let shortestDistance = maxRange;

        cells.forEach(cell => {
            if (cell === this) return;
            const distance = this.distanceTo(cell);
            if (distance < shortestDistance) {
                shortestDistance = distance;
                nearest = cell;
            }
        });

        return nearest;
    }

    findPackTarget(cells) {
        // Find the largest cell within pack range
        let bestTarget = null;
        let bestSize = 0;

        cells.forEach(cell => {
            if (cell.traits.specialAbility === 'pack_hunter') return;
            if (this.distanceTo(cell) > this.traits.visionRange) return;

            if (cell.traits.size > bestSize) {
                bestSize = cell.traits.size;
                bestTarget = cell;
            }
        });

        return bestTarget;
    }

    createParticleEffect(type, x, y) {
        this.particleEffects.push({
            type: type,
            x: x,
            y: y,
            age: 0,
            maxAge: 30,
            intensity: 1.0
        });
    }

    updateParticleEffects() {
        this.particleEffects = this.particleEffects.filter(effect => {
            effect.age++;
            effect.intensity = 1 - (effect.age / effect.maxAge);
            return effect.age < effect.maxAge;
        });
    }

    randomBeneficialMutation() {
        const mutations = [
            () => this.traits.speed += 0.1,
            () => this.traits.maxHealth += 5,
            () => this.traits.maxEnergy += 3,
            () => this.traits.visionRange += 5,
            () => this.traits.toxinResistance += 0.05
        ];

        const mutation = mutations[Math.floor(Math.random() * mutations.length)];
        mutation();
    }

    makeDecisions(cells, food) {
        // Clear previous target if it's no longer valid
        if (this.target && (this.target.consumed || this.target.health <= 0)) {
            this.target = null;
        }

        // Decision priority:
        // 1. Low energy -> find food
        // 2. High energy + find food -> reproduce
        // 3. Enemy nearby -> fight or flee
        // 4. Random movement

        const energyRatio = this.traits.energy / this.traits.maxEnergy;

        if (energyRatio < 0.4) {
            // Desperately need food
            this.seekFood(food);
        } else if (energyRatio > 0.8 && this.age > 300) {
            // Ready to reproduce
            this.considerReproduction();
        } else {
            // Look for opportunities (food or conflict)
            this.evaluateEnvironment(cells, food);
        }

        // Apply role-based movement when no target
        if (!this.target) {
            this.applyRoleBasedMovement();
        }
    }

    applyRoleBasedMovement() {
        if (this.colonyRole === 'sedentary') {
            // Sedentary cells stay near their home position
            const distanceFromHome = Math.sqrt(
                (this.x - this.homePosition.x) ** 2 +
                (this.y - this.homePosition.y) ** 2
            );

            if (distanceFromHome > 50) {
                // Return towards home
                this.moveTowards(this.homePosition.x, this.homePosition.y);
            } else {
                // Small random movements around home
                this.vx += (Math.random() - 0.5) * 0.05;
                this.vy += (Math.random() - 0.5) * 0.05;
            }
        } else if (this.colonyRole === 'adventurer') {
            // Adventurers explore more actively
            if (!this.explorationTarget || Math.random() < 0.01) {
                // Set new exploration target
                const angle = Math.random() * Math.PI * 2;
                const distance = 100 + Math.random() * this.maxDistanceFromHome;
                this.explorationTarget = {
                    x: this.homePosition.x + Math.cos(angle) * distance,
                    y: this.homePosition.y + Math.sin(angle) * distance
                };
            }

            if (this.explorationTarget) {
                const distanceToTarget = Math.sqrt(
                    (this.x - this.explorationTarget.x) ** 2 +
                    (this.y - this.explorationTarget.y) ** 2
                );

                if (distanceToTarget > 20) {
                    this.moveTowards(this.explorationTarget.x, this.explorationTarget.y);
                } else {
                    // Reached target, clear it to get new one
                    this.explorationTarget = null;
                }
            }
        } else {
            // Default random movement for unspecialized cells
            this.vx += (Math.random() - 0.5) * 0.1;
            this.vy += (Math.random() - 0.5) * 0.1;
        }
    }

    seekFood(food) {
        let closestFood = null;
        let closestDistance = Infinity;

        food.forEach(particle => {
            if (particle.consumed) return;

            const dx = particle.x - this.x;
            const dy = particle.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestFood = particle;
            }
        });

        if (closestFood) {
            this.target = closestFood;
            this.moveTowards(closestFood.x, closestFood.y);
        }
    }

    evaluateEnvironment(cells, food) {
        // Look for nearby threats and opportunities
        const detectionRadius = this.traits.size * 4;

        let threats = [];
        let weakTargets = [];

        cells.forEach(other => {
            if (other === this) return;

            const dx = other.x - this.x;
            const dy = other.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < detectionRadius) {
                // Factor in camouflage
                const detectionChance = other.traits.defenseType === 'camo'
                    ? 0.5 + (other.defenseStates.camouflageActive / 120) * 0.4
                    : 1.0;

                if (Math.random() > detectionChance) return;

                if (other.traits.size > this.traits.size * 1.2) {
                    threats.push({ cell: other, distance });
                } else if (other.traits.size < this.traits.size * 0.8) {
                    weakTargets.push({ cell: other, distance });
                }
            }
        });

        // Decision making based on threats and opportunities
        if (threats.length > 0 && this.traits.energy > 20) {
            // Flee from strongest threat
            const strongestThreat = threats.sort((a, b) => b.cell.traits.size - a.cell.traits.size)[0];
            this.fleeFrom(strongestThreat.cell);
        } else if (weakTargets.length > 0 && this.traits.energy > 40) {
            // Attack weakest target
            const weakestTarget = weakTargets.sort((a, b) => a.cell.traits.size - b.cell.traits.size)[0];
            this.target = weakestTarget.cell;
            this.moveTowards(weakestTarget.cell.x, weakestTarget.cell.y);
        } else {
            // Just look for food
            this.seekFood(food);
        }
    }

    moveTowards(targetX, targetY) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            const force = 0.3;
            this.vx += (dx / distance) * force;
            this.vy += (dy / distance) * force;
        }
    }

    fleeFrom(threat) {
        const dx = this.x - threat.x;
        const dy = this.y - threat.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            const force = 0.5; // Stronger flee response
            this.vx += (dx / distance) * force;
            this.vy += (dy / distance) * force;
        }
    }

    move(boundaries) {
        // Apply velocity with speed limit
        const maxSpeed = this.traits.speed;
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);

        if (currentSpeed > maxSpeed) {
            this.vx = (this.vx / currentSpeed) * maxSpeed;
            this.vy = (this.vy / currentSpeed) * maxSpeed;
        }

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Apply friction
        this.vx *= 0.98;
        this.vy *= 0.98;

        // Bounce off boundaries
        if (this.x - this.radius < 0 || this.x + this.radius > boundaries.width) {
            this.vx *= -0.8;
            this.x = Math.max(this.radius, Math.min(boundaries.width - this.radius, this.x));
        }

        if (this.y - this.radius < 0 || this.y + this.radius > boundaries.height) {
            this.vy *= -0.8;
            this.y = Math.max(this.radius, Math.min(boundaries.height - this.radius, this.y));
        }
    }

    considerReproduction() {
        const energyRatio = this.traits.energy / this.traits.maxEnergy;
        const healthRatio = this.traits.health / this.traits.maxHealth;
        const timeSinceLastReproduction = this.age - this.lastReproduction;

        // Enhanced duplication system - much more aggressive reproduction
        let reproductionCooldown = 400; // Reduced base cooldown (was 600)
        let energyThreshold = 0.75;     // Lowered energy requirement (was 0.8)

        // Well-fed cells reproduce much more frequently
        if (energyRatio > 0.85) {
            reproductionCooldown = 180; // Very fast reproduction (was 300)
            energyThreshold = 0.8;      // Still reasonable energy requirement
        }

        // Super well-fed cells reproduce extremely frequently (rapid duplication)
        if (energyRatio > 0.95) {
            reproductionCooldown = 100; // Ultra-fast reproduction (was 200)
            energyThreshold = 0.85;     // Higher energy requirement for rapid reproduction
        }

        // Colony members reproduce more aggressively to grow the colony
        if (this.colony && this.colony.members.length < 15) {
            reproductionCooldown *= 0.6; // 40% faster reproduction in colonies
            energyThreshold -= 0.05;      // Lower energy threshold for colony growth
        }

        // Sedentary cells focus on reproduction
        if (this.colonyRole === 'sedentary') {
            reproductionCooldown *= 0.4; // 60% faster reproduction for sedentary cells
            energyThreshold -= 0.1;       // Much lower energy threshold
        }

        // Healthy cells reproduce more easily
        if (healthRatio > 0.9) {
            reproductionCooldown *= 0.7; // 30% faster reproduction (was 0.8)
        }

        // Adult cells reproduce better than juveniles
        if (this.traits.lifestage === 'adult') {
            reproductionCooldown *= 0.6; // Adults reproduce 40% faster (was 30%)
        }

        // Elder cells can still reproduce but slower
        if (this.traits.lifestage === 'elder') {
            reproductionCooldown *= 1.3; // Elders reproduce 30% slower
        }
        if (this.traits.lifestage === 'adult') {
            reproductionCooldown *= 0.7; // Adults reproduce 30% faster
        }

        // Check if ready to reproduce
        if (timeSinceLastReproduction > reproductionCooldown &&
            energyRatio > energyThreshold &&
            healthRatio > 0.5) {

            this.reproduced = true;
            this.lastReproduction = this.age;

            // Energy cost scales with how well-fed the cell is
            const energyCost = energyRatio > 0.95 ? 0.7 : 0.6; // More energy cost for rapid reproduction
            this.traits.energy *= energyCost;

            // Role-based reproduction behavior
            this.handleRoleBasedReproduction();

            // Visual feedback for reproduction
            this.addReproductionEffect();
        }
    }

    handleRoleBasedReproduction() {
        if (this.colonyRole === 'sedentary' && this.colony) {
            // Sedentary cells tend to produce more sedentary offspring
            // and place them close to the colony center
            const offspring = this.createOffspring();
            if (offspring) {
                offspring.colonyRole = Math.random() < 0.8 ? 'sedentary' : 'adventurer';
                offspring.homePosition = { x: this.x, y: this.y };

                // Try to add offspring to the same colony
                if (this.colony.members.length < 12) {
                    this.colony.addMember(offspring, this);
                }
            }
        } else if (this.colonyRole === 'adventurer') {
            // Adventurers might reproduce in remote locations
            const offspring = this.createOffspring();
            if (offspring) {
                offspring.colonyRole = Math.random() < 0.6 ? 'adventurer' : 'sedentary';
                offspring.homePosition = { x: offspring.x, y: offspring.y };

                // Adventurers might start new colonies if far from home
                const distanceFromHome = Math.sqrt(
                    (this.x - this.homePosition.x) ** 2 +
                    (this.y - this.homePosition.y) ** 2
                );

                if (distanceFromHome > this.maxDistanceFromHome * 0.8 &&
                    !this.colony && Math.random() < 0.3) {
                    // Found new outpost colony
                    const newColony = new Colony(offspring);
                    offspring.isColonyFounder = true;
                }
            }
        }
    }

    createOffspring() {
        // This method should be implemented in simulation.js to actually create the offspring
        // Here we just return a conceptual offspring for role assignment
        // The actual creation happens in the simulation
        return null;
    }

    addReproductionEffect() {
        // Add particle effects to show reproduction/duplication
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const distance = this.radius + 10;
            this.particleEffects.push({
                x: this.x + Math.cos(angle) * distance,
                y: this.y + Math.sin(angle) * distance,
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2,
                size: 3,
                life: 30,
                maxLife: 30,
                color: '#00ff88',
                type: 'reproduction'
            });
        }
    }

    updateVisualEffects() {
        // Update effects based on defense type
        if (this.traits.defenseType === 'poison' && this.defenseStates.poisonAura > 0) {
            this.defenseStates.poisonAura--;
        }
    }

    // Combat and interaction methods
    canEat(food) {
        const dx = food.x - this.x;
        const dy = food.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.radius + food.radius;
    }

    eat(food) {
        if (this.canEat(food) && !food.consumed) {
            food.consumed = true;
            this.traits.energy += food.energyValue;
            this.traits.energy = Math.min(this.traits.energy, this.traits.maxEnergy);
            return true;
        }
        return false;
    }

    collidesWith(other) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.radius + other.radius;
    }

    fight(other) {
        if (!this.collidesWith(other)) return false;

        // Calculate damage based on size and defense types
        let damage = this.traits.size * 0.2;
        let otherDamage = other.traits.size * 0.2;

        // Apply defense modifiers
        switch (other.traits.defenseType) {
            case 'armor':
                damage *= 0.5; // Armor reduces incoming damage
                break;
            case 'spikes':
                this.traits.health -= other.defenseStates.spikesDamage; // Spikes damage attacker
                break;
        }

        switch (this.traits.defenseType) {
            case 'armor':
                otherDamage *= 0.5;
                break;
            case 'spikes':
                other.traits.health -= this.defenseStates.spikesDamage;
                break;
            case 'poison':
                // Poison creates lingering damage aura
                this.defenseStates.poisonAura = 120;
                break;
        }

        // Apply damage
        other.traits.health -= damage;
        this.traits.health -= otherDamage;

        // Energy cost for fighting
        this.traits.energy -= 2;
        other.traits.energy -= 2;

        return true;
    }

    // Rendering
    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        // Draw special auras and fields first (background layer)
        this.renderAuras(ctx);

        // Draw particle effects
        this.renderParticleEffects(ctx);

        // Draw main cell body with shape
        this.renderCellBody(ctx);

        // Draw defense-specific visuals
        this.renderDefenseVisuals(ctx);

        // Draw special ability indicators
        this.renderSpecialAbilityEffects(ctx);

        // Draw infection effects
        this.renderInfectionEffects(ctx);

        // Draw lifecycle indicators
        this.renderLifecycleIndicators(ctx);

        // Draw health bar
        this.renderHealthBar(ctx);

        // Draw energy indicator
        this.renderEnergyIndicator(ctx);

        // Draw communication indicators
        this.renderCommunicationEffects(ctx);

        // Draw cell name
        this.renderName(ctx);

        ctx.restore();
    }

    renderCellBody(ctx) {
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.getOutlineColor();
        ctx.lineWidth = 2;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        switch (this.traits.shape) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;

            case 'triangle':
                this.renderTriangle(ctx);
                break;

            case 'square':
                this.renderSquare(ctx);
                break;

            case 'hexagon':
                this.renderHexagon(ctx);
                break;

            case 'oval':
                this.renderOval(ctx);
                break;

            case 'star':
                this.renderStar(ctx);
                break;

            case 'diamond':
                this.renderDiamond(ctx);
                break;
        }

        ctx.restore();
    }

    renderTriangle(ctx) {
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * this.radius;
            const y = Math.sin(angle) * this.radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    renderSquare(ctx) {
        const half = this.radius * 0.8;
        ctx.beginPath();
        ctx.rect(-half, -half, half * 2, half * 2);
        ctx.fill();
        ctx.stroke();
    }

    renderHexagon(ctx) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const x = Math.cos(angle) * this.radius;
            const y = Math.sin(angle) * this.radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    renderOval(ctx) {
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius, this.radius * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    renderStar(ctx) {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const radius = (i % 2 === 0) ? this.radius : this.radius * 0.5;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    renderDiamond(ctx) {
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(this.radius * 0.7, 0);
        ctx.lineTo(0, this.radius);
        ctx.lineTo(-this.radius * 0.7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    getOutlineColor() {
        // Different outline colors based on lifestage
        switch (this.traits.lifestage) {
            case 'juvenile': return '#ffffff';
            case 'adult': return '#ffd700';
            case 'elder': return '#c0c0c0';
            default: return '#ffffff';
        }
    }

    renderAuras(ctx) {
        // Render various auras and fields
        if (this.traits.defenseType === 'poison' && this.defenseStates.poisonAura > 0) {
            this.renderPoisonAura(ctx);
        }

        if (this.traits.defenseType === 'electric' && this.defenseStates.electricCharge > 50) {
            this.renderElectricField(ctx);
        }

        if (this.traits.defenseType === 'magnetic') {
            this.renderMagneticField(ctx);
        }

        if (this.traits.defenseType === 'shield' && this.defenseStates.shieldEnergy > 0) {
            this.renderShield(ctx);
        }

        if (this.barrier && this.barrier.active) {
            this.renderBarrier(ctx);
        }
    }

    renderPoisonAura(ctx) {
        const auraRadius = this.radius + 15;
        const gradient = ctx.createRadialGradient(this.x, this.y, this.radius, this.x, this.y, auraRadius);
        gradient.addColorStop(0, 'rgba(81, 207, 102, 0.3)');
        gradient.addColorStop(1, 'rgba(81, 207, 102, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, auraRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    renderElectricField(ctx) {
        const fieldRadius = this.radius + 20;
        const intensity = this.defenseStates.electricCharge / 100;

        ctx.strokeStyle = `rgba(255, 212, 59, ${intensity * 0.8})`;
        ctx.lineWidth = 2;

        // Draw electric arcs
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + Date.now() * 0.01;
            const startX = this.x + Math.cos(angle) * this.radius;
            const startY = this.y + Math.sin(angle) * this.radius;
            const endX = this.x + Math.cos(angle) * fieldRadius;
            const endY = this.y + Math.sin(angle) * fieldRadius;

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
    }

    renderMagneticField(ctx) {
        const fieldRadius = this.radius + 30;
        const intensity = this.defenseStates.magneticField / 80;

        ctx.strokeStyle = `rgba(151, 117, 250, ${intensity * 0.6})`;
        ctx.lineWidth = 1;

        // Draw magnetic field lines
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5 + i * 3, angle, angle + Math.PI);
            ctx.stroke();
        }
    }

    renderShield(ctx) {
        const shieldRadius = this.radius + 8;
        const intensity = this.defenseStates.shieldEnergy / 100;

        ctx.strokeStyle = `rgba(77, 171, 247, ${intensity * 0.7})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, shieldRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Shield particles
        if (Math.random() < 0.3) {
            ctx.fillStyle = `rgba(77, 171, 247, ${intensity * 0.5})`;
            for (let i = 0; i < 3; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = shieldRadius + Math.random() * 5;
                const x = this.x + Math.cos(angle) * distance;
                const y = this.y + Math.sin(angle) * distance;
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    renderBarrier(ctx) {
        ctx.strokeStyle = 'rgba(134, 142, 150, 0.8)';
        ctx.lineWidth = 4;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.barrier.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    renderDefenseVisuals(ctx) {
        switch (this.traits.defenseType) {
            case 'spikes':
                this.renderSpikes(ctx);
                break;
            case 'armor':
                this.renderArmor(ctx);
                break;
            case 'regen':
                this.renderRegen(ctx);
                break;
            case 'explosive':
                this.renderExplosiveIndicator(ctx);
                break;
            case 'viral':
                this.renderViralIndicator(ctx);
                break;
            case 'phase':
                if (this.defenseStates.phaseShift > 30) {
                    this.renderPhaseEffect(ctx);
                }
                break;
            case 'reflect':
                this.renderReflectEffect(ctx);
                break;
        }
    }

    renderInfectionEffects(ctx) {
        if (!this.isInfected) return;

        // Pulsing sickness aura
        const infectionPulse = Math.sin(this.age * 0.3) * 0.5 + 0.5;
        const auraRadius = this.radius + 8 + infectionPulse * 5;

        ctx.strokeStyle = `rgba(102, 255, 102, ${0.4 + infectionPulse * 0.3})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(this.x, this.y, auraRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Infection severity indicator
        const severityBar = this.infectionSeverity;
        ctx.fillStyle = 'rgba(102, 255, 102, 0.8)';
        ctx.fillRect(this.x - 15, this.y - this.radius - 20, 30 * severityBar, 3);

        // Border for severity bar
        ctx.strokeStyle = 'rgba(102, 255, 102, 1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x - 15, this.y - this.radius - 20, 30, 3);

        // Infection timer countdown
        if (this.infectionTimer > 0) {
            const timeLeft = Math.ceil(this.infectionTimer / 60); // Convert to seconds
            ctx.font = '10px "Orbitron", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#66ff66';
            ctx.fillText(`Infected: ${timeLeft}s`, this.x, this.y - this.radius - 35);
        }
    }

    renderSpikes(ctx) {
        ctx.strokeStyle = '#ff4757';
        ctx.lineWidth = 2;

        const spikeCount = this.traits.shape === 'triangle' ? 6 : 8;
        for (let i = 0; i < spikeCount; i++) {
            const angle = (i / spikeCount) * Math.PI * 2 + this.rotation;
            const innerRadius = this.hitbox - 2;
            const outerRadius = this.hitbox + 4;

            const innerX = this.x + Math.cos(angle) * innerRadius;
            const innerY = this.y + Math.sin(angle) * innerRadius;
            const outerX = this.x + Math.cos(angle) * outerRadius;
            const outerY = this.y + Math.sin(angle) * outerRadius;

            ctx.beginPath();
            ctx.moveTo(innerX, innerY);
            ctx.lineTo(outerX, outerY);
            ctx.stroke();
        }
    }

    renderArmor(ctx) {
        ctx.strokeStyle = '#5f27cd';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
        ctx.stroke();
    }

    renderRegen(ctx) {
        if (this.defenseStates.regenCooldown <= 10 && this.traits.health < this.traits.maxHealth) {
            // Draw healing sparkles
            ctx.fillStyle = '#ff9ff3';
            for (let i = 0; i < 4; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * this.radius;
                const sparkleX = this.x + Math.cos(angle) * distance;
                const sparkleY = this.y + Math.sin(angle) * distance;

                ctx.beginPath();
                ctx.arc(sparkleX, sparkleY, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    renderExplosiveIndicator(ctx) {
        if (this.traits.health < this.traits.maxHealth * 0.3) {
            // Danger warning - blinking red
            const intensity = Math.sin(Date.now() * 0.02) * 0.5 + 0.5;
            ctx.strokeStyle = `rgba(250, 82, 82, ${intensity})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    renderViralIndicator(ctx) {
        if (this.defenseStates.viralLoad > 40) {
            // Green viral particles
            ctx.fillStyle = 'rgba(55, 178, 77, 0.6)';
            for (let i = 0; i < 3; i++) {
                const angle = Date.now() * 0.005 + i * (Math.PI * 2 / 3);
                const distance = this.radius + 8;
                const x = this.x + Math.cos(angle) * distance;
                const y = this.y + Math.sin(angle) * distance;

                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    renderPhaseEffect(ctx) {
        // Ethereal outline effect
        ctx.strokeStyle = 'rgba(73, 80, 87, 0.8)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    renderReflectEffect(ctx) {
        if (this.defenseStates.reflectCharge > 25) {
            // Mirror-like gleam effect
            const intensity = this.defenseStates.reflectCharge / 50;
            ctx.strokeStyle = `rgba(230, 73, 128, ${intensity * 0.8})`;
            ctx.lineWidth = 2;

            // Draw reflection lines
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2 + Date.now() * 0.01;
                const x1 = this.x + Math.cos(angle) * (this.radius - 3);
                const y1 = this.y + Math.sin(angle) * (this.radius - 3);
                const x2 = this.x + Math.cos(angle) * (this.radius + 3);
                const y2 = this.y + Math.sin(angle) * (this.radius + 3);

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }
    }

    renderSpecialAbilityEffects(ctx) {
        switch (this.traits.specialAbility) {
            case 'photosynthesis':
                this.renderPhotosynthesisEffect(ctx);
                break;
            case 'parasite':
                this.renderParasiteEffect(ctx);
                break;
            case 'pack_hunter':
                this.renderPackEffect(ctx);
                break;
            case 'territorial':
                this.renderTerritoryEffect(ctx);
                break;
            case 'energy_vampire':
                this.renderVampireEffect(ctx);
                break;
        }
    }

    renderPhotosynthesisEffect(ctx) {
        // Green energy particles
        if (Math.random() < 0.2) {
            ctx.fillStyle = 'rgba(64, 192, 87, 0.6)';
            for (let i = 0; i < 2; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = this.radius + Math.random() * 10;
                const x = this.x + Math.cos(angle) * distance;
                const y = this.y + Math.sin(angle) * distance;

                ctx.beginPath();
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    renderParasiteEffect(ctx) {
        if (this.defenseStates.parasiteHost) {
            // Draw connection to host
            ctx.strokeStyle = 'rgba(124, 45, 18, 0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 2]);
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.defenseStates.parasiteHost.x, this.defenseStates.parasiteHost.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    renderPackEffect(ctx) {
        if (this.defenseStates.packMembers.length > 0) {
            // Draw pack connections
            ctx.strokeStyle = 'rgba(253, 126, 20, 0.4)';
            ctx.lineWidth = 1;

            this.defenseStates.packMembers.forEach(member => {
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(member.x, member.y);
                ctx.stroke();
            });
        }
    }

    renderTerritoryEffect(ctx) {
        if (this.territory && this.traits.energy > this.traits.maxEnergy * 0.5) {
            // Draw territory boundary
            ctx.strokeStyle = 'rgba(255, 107, 107, 0.2)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 10]);
            ctx.beginPath();
            ctx.arc(this.territory.x, this.territory.y, this.territory.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    renderVampireEffect(ctx) {
        // Dark energy tendrils
        if (Math.random() < 0.1) {
            ctx.strokeStyle = 'rgba(139, 69, 19, 0.6)';
            ctx.lineWidth = 1;

            for (let i = 0; i < 3; i++) {
                const angle = Math.random() * Math.PI * 2;
                const length = this.radius + Math.random() * 15;
                const x = this.x + Math.cos(angle) * length;
                const y = this.y + Math.sin(angle) * length;

                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(x, y);
                ctx.stroke();
            }
        }
    }

    renderLifecycleIndicators(ctx) {
        // Age-based visual indicators
        if (this.traits.lifestage === 'elder') {
            // Wisdom aura for elders
            ctx.strokeStyle = 'rgba(192, 192, 192, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 12, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    renderParticleEffects(ctx) {
        this.particleEffects.forEach(effect => {
            const oldAlpha = ctx.globalAlpha;
            ctx.globalAlpha = effect.intensity * this.opacity;

            switch (effect.type) {
                case 'electric':
                    ctx.fillStyle = '#ffd43b';
                    ctx.beginPath();
                    ctx.arc(effect.x, effect.y, 2, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'explosion':
                    const explosionRadius = (1 - effect.intensity) * 20;
                    ctx.strokeStyle = '#fa5252';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(effect.x, effect.y, explosionRadius, 0, Math.PI * 2);
                    ctx.stroke();
                    break;

                case 'energy_drain':
                    ctx.fillStyle = '#8e44ad';
                    ctx.beginPath();
                    ctx.arc(effect.x, effect.y, 3, 0, Math.PI * 2);
                    ctx.fill();
                    break;
            }

            ctx.globalAlpha = oldAlpha; // Restore
        });
    }

    renderCommunicationEffects(ctx) {
        // Draw pheromone clouds
        this.pheromones.forEach(pheromone => {
            const age = pheromone.age / pheromone.maxAge;
            const alpha = (1 - age) * 0.3;
            const radius = 5 + age * 15;

            const oldAlpha = ctx.globalAlpha;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = 'rgba(150, 150, 255, 1)';
            ctx.beginPath();
            ctx.arc(pheromone.x, pheromone.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = oldAlpha;

            pheromone.age++;
        });

        // Remove old pheromones
        this.pheromones = this.pheromones.filter(p => p.age < p.maxAge);
    }

    renderName(ctx) {
        if (!this.showName) return;

        // Position name above the cell
        const nameY = this.y - this.radius - 25;

        // Set up text style
        ctx.font = '12px "Orbitron", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Measure text width for background
        const textWidth = ctx.measureText(this.name).width;
        const padding = 4;

        // Draw semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(
            this.x - textWidth / 2 - padding,
            nameY - 8,
            textWidth + padding * 2,
            16
        );

        // Draw border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            this.x - textWidth / 2 - padding,
            nameY - 8,
            textWidth + padding * 2,
            16
        );

        // Draw the name text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(this.name, this.x, nameY);

        // Add generation indicator
        if (this.generation > 1) {
            ctx.font = '10px "Orbitron", monospace';
            ctx.fillStyle = '#00ff88';
            ctx.fillText(`Gen ${this.generation}`, this.x, nameY + 15);
        }
    }

    renderHealthBar(ctx) {
        const barWidth = this.radius * 2;
        const barHeight = 4;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.radius - 8;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Health
        const healthRatio = Math.max(0, this.traits.health / this.traits.maxHealth);
        const healthColor = healthRatio > 0.6 ? '#2ed573' : healthRatio > 0.3 ? '#ffa502' : '#ff4757';

        ctx.fillStyle = healthColor;
        ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);
    }

    renderEnergyIndicator(ctx) {
        const energyRatio = this.traits.energy / this.traits.maxEnergy;

        // Energy ring around cell
        ctx.strokeStyle = `rgba(0, 204, 255, ${energyRatio})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2 * energyRatio);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Mutation for reproduction
    mutate(mutationRate) {
        const newTraits = { ...this.traits };
        newTraits.generation = this.generation + 1;

        // Basic physical traits mutations
        if (Math.random() < mutationRate) {
            // Size mutation
            newTraits.size = Math.max(4, Math.min(20, newTraits.size + (Math.random() - 0.5) * 4));
        }

        if (Math.random() < mutationRate) {
            // Speed mutation
            newTraits.speed = Math.max(0.2, Math.min(3.0, newTraits.speed + (Math.random() - 0.5) * 0.6));
        }

        if (Math.random() < mutationRate) {
            // Health mutation
            newTraits.maxHealth = Math.max(40, Math.min(160, newTraits.maxHealth + (Math.random() - 0.5) * 20));
            newTraits.health = newTraits.maxHealth;
        }

        if (Math.random() < mutationRate) {
            // Energy mutation
            newTraits.maxEnergy = Math.max(40, Math.min(120, newTraits.maxEnergy + (Math.random() - 0.5) * 20));
            newTraits.energy = newTraits.maxEnergy * 0.8;
        }

        // Shape mutations
        if (Math.random() < mutationRate * 0.3) {
            newTraits.shape = this.randomShape();
        }

        // Defense type mutations
        if (Math.random() < mutationRate * 0.4) {
            newTraits.defenseType = this.randomDefenseType();
        }

        // Special ability mutations
        if (Math.random() < mutationRate * 0.3) {
            newTraits.specialAbility = this.randomSpecialAbility();
        }

        // Metabolism mutations
        if (Math.random() < mutationRate * 0.2) {
            newTraits.metabolismType = this.randomMetabolismType();
        }

        // Social behavior mutations
        if (Math.random() < mutationRate * 0.25) {
            newTraits.socialBehavior = this.randomSocialBehavior();
        }

        // Environmental tolerance mutations
        if (Math.random() < mutationRate) {
            newTraits.temperatureTolerance = Math.max(0.1, Math.min(0.9,
                newTraits.temperatureTolerance + (Math.random() - 0.5) * 0.2));
        }

        if (Math.random() < mutationRate) {
            newTraits.acidTolerance = Math.max(0.1, Math.min(0.9,
                newTraits.acidTolerance + (Math.random() - 0.5) * 0.2));
        }

        if (Math.random() < mutationRate) {
            newTraits.radiationResistance = Math.max(0.05, Math.min(0.8,
                newTraits.radiationResistance + (Math.random() - 0.5) * 0.15));
        }

        // Sensory mutations
        if (Math.random() < mutationRate) {
            newTraits.visionRange = Math.max(20, Math.min(120,
                newTraits.visionRange + (Math.random() - 0.5) * 20));
        }

        if (Math.random() < mutationRate) {
            newTraits.communicationRange = Math.max(15, Math.min(100,
                newTraits.communicationRange + (Math.random() - 0.5) * 15));
        }

        // Chemical and biological trait mutations
        if (Math.random() < mutationRate) {
            newTraits.pheromoneProduction = Math.max(0.0, Math.min(0.8,
                newTraits.pheromoneProduction + (Math.random() - 0.5) * 0.2));
        }

        if (Math.random() < mutationRate) {
            newTraits.toxinResistance = Math.max(0.0, Math.min(0.9,
                newTraits.toxinResistance + (Math.random() - 0.5) * 0.2));
        }

        if (Math.random() < mutationRate) {
            newTraits.magneticSensitivity = Math.max(0.0, Math.min(0.8,
                newTraits.magneticSensitivity + (Math.random() - 0.5) * 0.15));
        }

        if (Math.random() < mutationRate) {
            newTraits.electrogenesis = Math.max(0.0, Math.min(0.6,
                newTraits.electrogenesis + (Math.random() - 0.5) * 0.1));
        }

        return newTraits;
    }

    // Create offspring
    reproduce(mutationRate) {
        if (!this.reproduced) return null;

        this.reproduced = false;

        // Create mutated offspring near parent
        const angle = Math.random() * Math.PI * 2;
        const distance = this.radius * 3;
        const childX = this.x + Math.cos(angle) * distance;
        const childY = this.y + Math.sin(angle) * distance;

        const mutatedTraits = this.mutate(mutationRate);
        mutatedTraits.parentName = this.name; // Pass parent name for inheritance
        mutatedTraits.generation = this.generation + 1; // Increment generation
        return new Cell(childX, childY, mutatedTraits);
    }
}

// Virus class - infectious agents that can infect cells
class Virus extends Cell {
    constructor(x, y, traits = {}) {
        // Viruses are smaller and faster than regular cells
        const virusTraits = {
            health: 20 + Math.random() * 20, // 20-40 (much lower than cells)
            size: 3 + Math.random() * 4, // 3-7 (smaller than cells)
            speed: 2 + Math.random() * 2, // 2-4 (faster than cells)
            energy: 30 + Math.random() * 20, // 30-50
            defenseType: 'viral',
            shape: 'star', // Distinctive shape
            specialAbility: 'infection',
            ...traits
        };

        super(x, y, virusTraits);

        // Virus-specific properties
        this.isVirus = true;
        this.infectionRadius = 25;
        this.infectionStrength = 0.3;
        this.infectionCooldown = 0;
        this.infectionsCount = 0;
        this.maxInfections = 5; // Can infect up to 5 cells before dying

        // Visual properties
        this.color = '#ff0066'; // Bright pink/red
        this.pulsePhase = Math.random() * Math.PI * 2;

        // Override name generation for viruses
        this.name = traits.name || this.generateVirusName();
    }

    generateVirusName() {
        const virusNames = [
            'Omega-Strain', 'Alpha-Virus', 'Beta-Pathogen', 'Gamma-Plague', 'Delta-Infection',
            'Viral-X', 'Phantom-Bug', 'Ghost-Code', 'Shadow-Virus', 'Crimson-Strain',
            'Nano-Plague', 'Bio-Hazard', 'Toxic-Agent', 'Cyber-Virus', 'Mutant-Code'
        ];

        const number = Math.floor(Math.random() * 999) + 1;
        const baseName = virusNames[Math.floor(Math.random() * virusNames.length)];
        return `${baseName}-${number.toString().padStart(3, '0')}`;
    }

    update(cells, food, worldWidth, worldHeight) {
        super.update(cells, food, worldWidth, worldHeight);

        // Update infection cooldown
        if (this.infectionCooldown > 0) {
            this.infectionCooldown--;
        }

        // Pulse visual effect
        this.pulsePhase += 0.2;

        // Viruses die after infecting enough cells or getting too old
        if (this.infectionsCount >= this.maxInfections || this.age > 2000) {
            this.traits.health = 0; // Kill the virus
        }

        // Virus-specific behavior
        this.seekHostCells(cells);
    }

    seekHostCells(cells) {
        if (this.infectionCooldown > 0) return;

        // Look for healthy cells to infect
        const potentialHosts = cells.filter(cell =>
            !cell.isVirus &&
            !cell.isInfected &&
            this.distanceTo(cell) < this.infectionRadius &&
            cell.traits.health > cell.traits.maxHealth * 0.3 // Don't infect dying cells
        );

        if (potentialHosts.length > 0) {
            // Find closest healthy cell
            let closestHost = null;
            let closestDistance = Infinity;

            for (const host of potentialHosts) {
                const distance = this.distanceTo(host);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestHost = host;
                }
            }

            if (closestHost) {
                this.moveToward(closestHost.x, closestHost.y);

                // Try to infect if close enough
                if (closestDistance < this.radius + closestHost.radius + 5) {
                    this.infectCell(closestHost);
                }
            }
        }
    }

    infectCell(cell) {
        if (cell.isVirus || cell.isInfected || this.infectionCooldown > 0) return false;

        // Check if cell resists infection
        const resistanceChance = cell.traits.toxinResistance * 0.5; // Toxin resistance helps against viruses
        if (Math.random() < resistanceChance) {
            // Cell resisted infection
            this.addParticleEffect('resist', cell.x, cell.y);
            this.infectionCooldown = 120; // 2 second cooldown after failed infection
            return false;
        }

        // Successful infection
        cell.isInfected = true;
        cell.infectionTimer = 600 + Math.random() * 300; // 10-15 seconds of infection
        cell.infectionSeverity = this.infectionStrength;
        cell.infectedBy = this.name;

        // Visual effects
        this.addParticleEffect('infection', cell.x, cell.y);

        // Update virus stats
        this.infectionsCount++;
        this.infectionCooldown = 180; // 3 second cooldown after successful infection
        this.traits.energy += 10; // Virus gains energy from infection

        console.log(`${this.name} infected ${cell.name}!`);
        return true;
    }

    addParticleEffect(type, x, y) {
        const color = type === 'infection' ? '#ff0066' : '#88ff88';
        const particleCount = type === 'infection' ? 12 : 6;

        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 2 + Math.random() * 2;

            this.particleEffects.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 2,
                life: 40,
                maxLife: 40,
                color: color,
                type: type
            });
        }
    }

    render(ctx) {
        // Pulsing effect for virus
        const pulse = Math.sin(this.pulsePhase) * 0.3 + 0.7;
        const oldAlpha = ctx.globalAlpha;
        ctx.globalAlpha = pulse;

        super.render(ctx);

        // Add viral glow
        ctx.globalAlpha = pulse * 0.3;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Restore alpha
        ctx.globalAlpha = oldAlpha;

        // Draw infection radius when hunting
        if (this.infectionCooldown === 0) {
            ctx.strokeStyle = 'rgba(255, 0, 102, 0.2)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.infectionRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
}

export { Cell, Virus };