// Food particle system for cell nourishment
class Food {
    constructor(x, y, size = null) {
        this.x = x;
        this.y = y;
        this.radius = size || (2 + Math.random() * 4); // 2-6 radius
        this.energyValue = this.radius * 8; // Bigger food = more energy
        this.consumed = false;
        this.age = 0;
        this.maxAge = 1800 + Math.random() * 1200; // 30-50 seconds at 60fps

        // Visual properties
        this.color = this.getColorByValue();
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.decay = 1.0;
    }

    getColorByValue() {
        // Color based on energy value (size)
        if (this.energyValue > 40) {
            return '#ff9f43'; // Large food - orange
        } else if (this.energyValue > 25) {
            return '#feca57'; // Medium food - yellow
        } else {
            return '#48dbfb'; // Small food - light blue
        }
    }

    update() {
        if (this.consumed) return false;

        this.age++;

        // Food decays over time
        if (this.age > this.maxAge * 0.8) {
            this.decay = 1.0 - ((this.age - this.maxAge * 0.8) / (this.maxAge * 0.2));
            this.decay = Math.max(0, this.decay);
        }

        // Food expires
        if (this.age > this.maxAge) {
            return false;
        }

        return true;
    }

    render(ctx) {
        if (this.consumed) return;

        ctx.save();
        ctx.globalAlpha = this.decay;

        // Pulsing effect
        this.pulsePhase += 0.1;
        const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.1;

        // Main food particle
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * pulseScale, 0, Math.PI * 2);
        ctx.fill();

        // Inner glow
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * pulseScale);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * pulseScale, 0, Math.PI * 2);
        ctx.fill();

        // Sparkle effect for large food
        if (this.energyValue > 30 && Math.random() < 0.1) {
            this.renderSparkles(ctx);
        }

        ctx.restore();
    }

    renderSparkles(ctx) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let i = 0; i < 2; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.radius * 1.5;
            const sparkleX = this.x + Math.cos(angle) * distance;
            const sparkleY = this.y + Math.sin(angle) * distance;

            ctx.beginPath();
            ctx.arc(sparkleX, sparkleY, 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class FoodManager {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.food = [];
        this.maxFood = 150;
        this.spawnRate = 1.0;
        this.spawnCooldown = 0;
    }

    update() {
        // Remove consumed or expired food
        this.food = this.food.filter(particle => particle.update());

        // Spawn new food
        this.spawnCooldown--;
        if (this.spawnCooldown <= 0 && this.food.length < this.maxFood) {
            this.spawnFood();
            this.spawnCooldown = Math.max(1, 60 / this.spawnRate); // Spawn rate per second
        }
    }

    spawnFood(x = null, y = null) {
        // Spawn at random location if not specified
        const spawnX = x !== null ? x : Math.random() * this.width;
        const spawnY = y !== null ? y : Math.random() * this.height;

        // Different food types with different probabilities
        let size;
        const rand = Math.random();
        if (rand < 0.6) {
            size = 2 + Math.random() * 2; // Small food (60% chance)
        } else if (rand < 0.9) {
            size = 3 + Math.random() * 3; // Medium food (30% chance)
        } else {
            size = 5 + Math.random() * 3; // Large food (10% chance)
        }

        const newFood = new Food(spawnX, spawnY, size);
        this.food.push(newFood);
    }

    // Spawn food when a cell dies (nutrients from corpse)
    spawnFromDeath(x, y, cellSize) {
        const nutrientCount = Math.floor(cellSize / 4) + 1;

        for (let i = 0; i < nutrientCount; i++) {
            const angle = (i / nutrientCount) * Math.PI * 2 + Math.random();
            const distance = Math.random() * cellSize * 2;
            const spawnX = Math.max(10, Math.min(this.width - 10, x + Math.cos(angle) * distance));
            const spawnY = Math.max(10, Math.min(this.height - 10, y + Math.sin(angle) * distance));

            // Dead cell nutrients are medium-sized
            this.spawnFood(spawnX, spawnY);
        }
    }

    render(ctx) {
        this.food.forEach(particle => particle.render(ctx));
    }

    getFood() {
        return this.food.filter(particle => !particle.consumed);
    }

    reset() {
        this.food = [];
        this.spawnCooldown = 0;

        // Spawn initial food distribution
        const initialFoodCount = 50;
        for (let i = 0; i < initialFoodCount; i++) {
            this.spawnFood();
        }
    }

    setSpawnRate(rate) {
        this.spawnRate = rate;
    }

    setMaxFood(maxFood) {
        this.maxFood = maxFood;
    }

    getStats() {
        return {
            totalFood: this.food.length,
            availableFood: this.food.filter(f => !f.consumed).length,
            consumedFood: this.food.filter(f => f.consumed).length
        };
    }
}

export { Food, FoodManager };