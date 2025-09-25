// Environmental hazards and obstacles system
class Environment {
    constructor(width, height) {
        this.width = width;
        this.height = height;

        // Environmental features
        this.obstacles = [];
        this.hazardZones = [];
        this.spikeTraps = [];

        this.generateEnvironment();
    }

    generateEnvironment() {
        this.generateObstacles();
        this.generateHazardZones();
        this.generateSpikeTraps();
    }

    generateObstacles() {
        const numObstacles = Math.floor((this.width * this.height) / 50000); // Scale with map size

        for (let i = 0; i < numObstacles; i++) {
            const obstacle = {
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                width: 30 + Math.random() * 70,
                height: 30 + Math.random() * 70,
                type: this.randomObstacleType(),
                rotation: Math.random() * Math.PI * 2
            };

            // Ensure obstacles don't overlap with spawn areas
            if (this.isValidObstaclePosition(obstacle)) {
                this.obstacles.push(obstacle);
            }
        }
    }

    generateHazardZones() {
        const numHazards = Math.floor((this.width * this.height) / 80000);

        for (let i = 0; i < numHazards; i++) {
            const hazard = {
                x: Math.random() * (this.width - 200) + 100,
                y: Math.random() * (this.height - 200) + 100,
                radius: 80 + Math.random() * 120,
                type: this.randomHazardType(),
                intensity: 0.5 + Math.random() * 0.5,
                pulsePhase: Math.random() * Math.PI * 2,
                damagePerTick: 0.5 + Math.random() * 1.5
            };

            this.hazardZones.push(hazard);
        }
    }

    generateSpikeTraps() {
        const numSpikes = Math.floor((this.width * this.height) / 60000);

        for (let i = 0; i < numSpikes; i++) {
            const spike = {
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                radius: 15 + Math.random() * 20,
                damage: 10 + Math.random() * 20,
                cooldown: 0,
                maxCooldown: 120 + Math.random() * 180, // 2-5 seconds
                isActive: Math.random() > 0.5,
                triggerRadius: 25 + Math.random() * 25
            };

            this.spikeTraps.push(spike);
        }
    }

    randomObstacleType() {
        const types = ['rock', 'wall', 'crystal', 'debris', 'pillar'];
        return types[Math.floor(Math.random() * types.length)];
    }

    randomHazardType() {
        const types = ['toxic', 'radiation', 'acid', 'fire', 'electric', 'ice'];
        return types[Math.floor(Math.random() * types.length)];
    }

    isValidObstaclePosition(obstacle) {
        // Don't place obstacles near spawn areas (corners and center)
        const spawnAreas = [
            { x: 0, y: 0, width: 200, height: 200 }, // Top-left
            { x: this.width - 200, y: 0, width: 200, height: 200 }, // Top-right
            { x: 0, y: this.height - 200, width: 200, height: 200 }, // Bottom-left
            { x: this.width - 200, y: this.height - 200, width: 200, height: 200 }, // Bottom-right
            { x: this.width / 2 - 100, y: this.height / 2 - 100, width: 200, height: 200 } // Center
        ];

        for (let area of spawnAreas) {
            if (this.rectangleOverlap(obstacle, area)) {
                return false;
            }
        }

        return true;
    }

    rectangleOverlap(rect1, rect2) {
        return !(rect1.x + rect1.width < rect2.x ||
            rect2.x + rect2.width < rect1.x ||
            rect1.y + rect1.height < rect2.y ||
            rect2.y + rect2.height < rect1.y);
    }

    update() {
        // Update spike traps
        this.spikeTraps.forEach(spike => {
            if (spike.cooldown > 0) {
                spike.cooldown--;
                if (spike.cooldown === 0) {
                    spike.isActive = true;
                }
            }
        });

        // Update hazard zone effects (pulsing, etc.)
        this.hazardZones.forEach(hazard => {
            hazard.pulsePhase += 0.05;
        });
    }

    // Check if a cell collides with any obstacle
    checkObstacleCollision(cell) {
        for (let obstacle of this.obstacles) {
            if (this.circleRectangleCollision(
                cell.x, cell.y, cell.radius,
                obstacle.x, obstacle.y, obstacle.width, obstacle.height
            )) {
                return obstacle;
            }
        }
        return null;
    }

    // Check if a cell is in a hazard zone
    checkHazardCollision(cell) {
        const hazards = [];

        for (let hazard of this.hazardZones) {
            const distance = Math.sqrt((cell.x - hazard.x) ** 2 + (cell.y - hazard.y) ** 2);
            if (distance < hazard.radius + cell.radius) {
                const intensity = 1 - (distance / hazard.radius); // Stronger at center
                hazards.push({ ...hazard, intensity: intensity * hazard.intensity });
            }
        }

        return hazards;
    }

    // Check spike trap collisions
    checkSpikeTrapCollision(cell) {
        const triggeredSpikes = [];

        for (let spike of this.spikeTraps) {
            const distance = Math.sqrt((cell.x - spike.x) ** 2 + (cell.y - spike.y) ** 2);

            // Trigger spike if cell is close and spike is ready
            if (distance < spike.triggerRadius && spike.isActive && spike.cooldown === 0) {
                spike.isActive = false;
                spike.cooldown = spike.maxCooldown;
                triggeredSpikes.push(spike);
            }

            // Damage cell if spike is activated and cell is in damage radius
            if (distance < spike.radius && spike.cooldown > spike.maxCooldown * 0.8) {
                triggeredSpikes.push(spike);
            }
        }

        return triggeredSpikes;
    }

    circleRectangleCollision(cx, cy, radius, rx, ry, rw, rh) {
        // Find the closest point on the rectangle to the circle
        const closestX = Math.max(rx, Math.min(cx, rx + rw));
        const closestY = Math.max(ry, Math.min(cy, ry + rh));

        // Calculate distance from circle center to this closest point
        const distanceX = cx - closestX;
        const distanceY = cy - closestY;

        return (distanceX * distanceX + distanceY * distanceY) < (radius * radius);
    }

    // Render environmental features
    render(ctx, camera) {
        this.renderObstacles(ctx, camera);
        this.renderHazardZones(ctx, camera);
        this.renderSpikeTraps(ctx, camera);
    }

    renderObstacles(ctx, camera) {
        ctx.save();

        this.obstacles.forEach(obstacle => {
            if (!camera.isAreaVisible(obstacle.x, obstacle.y, obstacle.width, obstacle.height)) {
                return; // Skip rendering if not visible
            }

            ctx.save();
            ctx.translate(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2);
            ctx.rotate(obstacle.rotation);

            switch (obstacle.type) {
                case 'rock':
                    ctx.fillStyle = '#666666';
                    ctx.strokeStyle = '#444444';
                    break;
                case 'wall':
                    ctx.fillStyle = '#8B4513';
                    ctx.strokeStyle = '#654321';
                    break;
                case 'crystal':
                    ctx.fillStyle = '#9370DB';
                    ctx.strokeStyle = '#663399';
                    break;
                case 'debris':
                    ctx.fillStyle = '#A0522D';
                    ctx.strokeStyle = '#8B4513';
                    break;
                case 'pillar':
                    ctx.fillStyle = '#708090';
                    ctx.strokeStyle = '#556B2F';
                    break;
            }

            ctx.lineWidth = 2;
            ctx.fillRect(-obstacle.width / 2, -obstacle.height / 2, obstacle.width, obstacle.height);
            ctx.strokeRect(-obstacle.width / 2, -obstacle.height / 2, obstacle.width, obstacle.height);

            ctx.restore();
        });

        ctx.restore();
    }

    renderHazardZones(ctx, camera) {
        this.hazardZones.forEach(hazard => {
            if (!camera.isVisible(hazard.x, hazard.y, hazard.radius * 2)) {
                return;
            }

            const pulse = Math.sin(hazard.pulsePhase) * 0.3 + 0.7;

            // Gradient effect
            const gradient = ctx.createRadialGradient(
                hazard.x, hazard.y, 0,
                hazard.x, hazard.y, hazard.radius
            );

            switch (hazard.type) {
                case 'toxic':
                    gradient.addColorStop(0, `rgba(0, 255, 0, ${0.3 * pulse})`);
                    gradient.addColorStop(1, `rgba(0, 100, 0, ${0.1 * pulse})`);
                    break;
                case 'radiation':
                    gradient.addColorStop(0, `rgba(255, 255, 0, ${0.3 * pulse})`);
                    gradient.addColorStop(1, `rgba(100, 100, 0, ${0.1 * pulse})`);
                    break;
                case 'acid':
                    gradient.addColorStop(0, `rgba(255, 165, 0, ${0.3 * pulse})`);
                    gradient.addColorStop(1, `rgba(139, 69, 19, ${0.1 * pulse})`);
                    break;
                case 'fire':
                    gradient.addColorStop(0, `rgba(255, 69, 0, ${0.4 * pulse})`);
                    gradient.addColorStop(1, `rgba(255, 0, 0, ${0.1 * pulse})`);
                    break;
                case 'electric':
                    gradient.addColorStop(0, `rgba(0, 191, 255, ${0.3 * pulse})`);
                    gradient.addColorStop(1, `rgba(0, 0, 139, ${0.1 * pulse})`);
                    break;
                case 'ice':
                    gradient.addColorStop(0, `rgba(173, 216, 230, ${0.3 * pulse})`);
                    gradient.addColorStop(1, `rgba(70, 130, 180, ${0.1 * pulse})`);
                    break;
            }

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(hazard.x, hazard.y, hazard.radius, 0, Math.PI * 2);
            ctx.fill();

            // Warning border
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }

    renderSpikeTraps(ctx, camera) {
        this.spikeTraps.forEach(spike => {
            if (!camera.isVisible(spike.x, spike.y, spike.radius * 2)) {
                return;
            }

            ctx.save();

            if (spike.isActive) {
                // Hidden spike (just a small indication)
                ctx.fillStyle = '#444444';
                ctx.beginPath();
                ctx.arc(spike.x, spike.y, spike.radius * 0.3, 0, Math.PI * 2);
                ctx.fill();
            } else if (spike.cooldown > spike.maxCooldown * 0.5) {
                // Extended spike
                ctx.fillStyle = '#8B0000';
                ctx.strokeStyle = '#FF0000';
                ctx.lineWidth = 2;

                // Draw spikes
                const numSpikes = 8;
                ctx.beginPath();
                for (let i = 0; i < numSpikes; i++) {
                    const angle = (i / numSpikes) * Math.PI * 2;
                    const innerRadius = spike.radius * 0.3;
                    const outerRadius = spike.radius;

                    const x1 = spike.x + Math.cos(angle) * innerRadius;
                    const y1 = spike.y + Math.sin(angle) * innerRadius;
                    const x2 = spike.x + Math.cos(angle) * outerRadius;
                    const y2 = spike.y + Math.sin(angle) * outerRadius;

                    if (i === 0) {
                        ctx.moveTo(x1, y1);
                    }
                    ctx.lineTo(x2, y2);
                    ctx.lineTo(x1 + Math.cos(angle + Math.PI / numSpikes) * innerRadius,
                        y1 + Math.sin(angle + Math.PI / numSpikes) * innerRadius);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }

            ctx.restore();
        });
    }

    // Get environment data for a specific position
    getEnvironmentAt(x, y) {
        return {
            obstacles: this.obstacles.filter(obs =>
                this.circleRectangleCollision(x, y, 10, obs.x, obs.y, obs.width, obs.height)
            ),
            hazards: this.hazardZones.filter(hazard => {
                const distance = Math.sqrt((x - hazard.x) ** 2 + (y - hazard.y) ** 2);
                return distance < hazard.radius;
            }),
            spikes: this.spikeTraps.filter(spike => {
                const distance = Math.sqrt((x - spike.x) ** 2 + (y - spike.y) ** 2);
                return distance < spike.triggerRadius;
            })
        };
    }
}

export { Environment };