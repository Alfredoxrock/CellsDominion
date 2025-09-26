// UI Management for statistics and charts
class UIManager {
    constructor() {
        this.populationChart = null;
        this.chartData = {
            labels: [],
            datasets: [
                {
                    label: 'Total Population',
                    data: [],
                    borderColor: '#00ff88',
                    backgroundColor: 'rgba(0, 255, 136, 0.1)',
                    borderWidth: 2,
                    fill: true
                },
                {
                    label: 'Food Particles',
                    data: [],
                    borderColor: '#00ccff',
                    backgroundColor: 'rgba(0, 204, 255, 0.1)',
                    borderWidth: 2,
                    fill: true
                }
            ]
        };

        this.initChart();
    }

    initChart() {
        const ctx = document.getElementById('populationChart').getContext('2d');

        this.populationChart = new Chart(ctx, {
            type: 'line',
            data: this.chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '📈 Population Over Time',
                        color: '#ffffff',
                        font: {
                            size: 16
                        }
                    },
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#ffffff'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#ffffff'
                        }
                    }
                },
                elements: {
                    point: {
                        radius: 0,
                        hoverRadius: 5
                    }
                },
                animation: {
                    duration: 0
                }
            }
        });
    }

    updateStats(stats) {
        // Update population info
        document.getElementById('totalCells').textContent = stats.totalCells;
        document.getElementById('generation').textContent = stats.generation;
        document.getElementById('tick').textContent = stats.tick;
        document.getElementById('foodCount').textContent = stats.foodCount;

        // Update new ecosystem stats
        const activeColoniesEl = document.getElementById('activeColonies');
        const growthRateEl = document.getElementById('growthRate');
        const avgFitnessEl = document.getElementById('avgFitness');

        if (activeColoniesEl) activeColoniesEl.textContent = stats.activeColonies || 0;
        if (growthRateEl) {
            const growth = stats.populationGrowthRate || 0;
            growthRateEl.textContent = growth >= 0 ? `+${growth}` : growth;
            growthRateEl.style.color = growth >= 0 ? '#00ff88' : '#ff4444';
        }
        if (avgFitnessEl) avgFitnessEl.textContent = (stats.averageFitness || 0).toFixed(2);

        // Update trait distribution
        this.updateTraitBars(stats.traitDistribution);

        // Update comprehensive traits panel
        this.updateComprehensiveTraits(stats.traitDistribution);

        // Update chart every 10 ticks to avoid performance issues
        if (stats.tick % 10 === 0) {
            this.updateChart(stats);
        }
    }

    updateRoundStats(stats) {
        // Update round info if elements exist
        const roundElements = {
            currentRound: document.getElementById('currentRound'),
            roundStatus: document.getElementById('roundStatus'),
            roundTimeLeft: document.getElementById('roundTimeLeft'),
            roundWinners: document.getElementById('roundWinners'),
            championsList: document.getElementById('championsList')
        };

        if (roundElements.currentRound) {
            roundElements.currentRound.textContent = stats.currentRound || 1;
        }

        if (roundElements.roundStatus) {
            const status = stats.roundStatus || 'waiting';
            roundElements.roundStatus.textContent = this.formatRoundStatus(status);
            roundElements.roundStatus.className = `status-${status}`;
        }

        if (roundElements.roundTimeLeft) {
            const timeLeft = Math.max(0, Math.floor((stats.roundTimeLeft || 0) / 60));
            roundElements.roundTimeLeft.textContent = timeLeft;
        }

        if (roundElements.roundWinners) {
            roundElements.roundWinners.textContent = stats.roundWinners || 0;
        }

        // Update champions list
        if (roundElements.championsList && stats.champions) {
            this.updateChampionsList(stats.champions);
        }
    }

    formatRoundStatus(status) {
        switch (status) {
            case 'starting': return '🚀 Starting';
            case 'active': return '⚔️ Active';
            case 'ending': return '⏰ Ending';
            case 'tournament_complete': return '🏆 Complete';
            case 'waiting': return '⏳ Waiting';
            default: return status;
        }
    }

    updateChampionsList(champions) {
        const championsList = document.getElementById('championsList');
        if (!championsList) return;

        championsList.innerHTML = '';

        champions.slice(-3).forEach((champion, index) => {
            const championDiv = document.createElement('div');
            championDiv.className = 'champion-entry';
            championDiv.innerHTML = `
                <div class="champion-info">
                    <span class="champion-round">R${champion.round}</span>
                    <span class="champion-shape">${this.getShapeIcon(champion.shape)}</span>
                    <span class="champion-defense">${this.getDefenseIcon(champion.defenseType)}</span>
                    <span class="champion-score">${Math.round(champion.fitnessScore || 0)}</span>
                </div>
            `;
            championsList.appendChild(championDiv);
        });
    }

    getShapeIcon(shape) {
        const icons = {
            circle: '⭕', triangle: '🔺', square: '⬜', hexagon: '⬢',
            oval: '🥚', star: '⭐', diamond: '💎'
        };
        return icons[shape] || '⚫';
    }

    getDefenseIcon(defense) {
        const icons = {
            spikes: '🔸', poison: '☠️', armor: '🛡️', regen: '💚', camo: '👻',
            shield: '⚡', electric: '🔆', magnetic: '🧲', phase: '🌫️', swarm: '🐝'
        };
        return icons[defense] || '🔹';
    }

    updateTraitBars(traitDistribution) {
        const total = traitDistribution.total;

        if (total === 0) {
            // Reset all bars when no cells
            const allTraits = [
                // Defense types
                'spikes', 'poison', 'armor', 'regen', 'camo', 'shield', 'electric', 'magnetic', 'phase', 'swarm', 'mimic', 'explosive', 'viral', 'barrier', 'reflect',
                // Shapes
                'shape-circle', 'shape-triangle', 'shape-square', 'shape-hexagon', 'shape-oval', 'shape-star', 'shape-diamond',
                // Abilities
                'ability-none', 'ability-photosynthesis', 'ability-parasite', 'ability-pack_hunter', 'ability-territorial', 'ability-migratory', 'ability-burrowing', 'ability-leaping', 'ability-splitting', 'ability-fusion', 'ability-time_dilation', 'ability-energy_vampire', 'ability-shape_shift', 'ability-invisibility',
                // Life stages
                'stage-juvenile', 'stage-adult', 'stage-elder'
            ];

            allTraits.forEach(trait => {
                const fillElement = document.querySelector(`.fill.${trait}`);
                const countElement = this.getCountElementForTrait(trait);
                if (fillElement) fillElement.style.width = '0%';
                if (countElement) countElement.textContent = '0';
            });
            return;
        }

        // Update each trait bar
        Object.entries(traitDistribution.counts).forEach(([trait, count]) => {
            const percentage = (count / total) * 100;
            const fillElement = document.querySelector(`.fill.${trait}`);
            const countElement = this.getCountElementForTrait(trait);

            if (fillElement && countElement) {
                fillElement.style.width = `${percentage}%`;
                countElement.textContent = count;
            }
        });
    }

    getCountElementForTrait(trait) {
        // Convert trait names to count element IDs
        if (trait.startsWith('shape-')) {
            const shapeName = trait.replace('shape-', '');
            return document.getElementById(`${shapeName}Count`);
        } else if (trait.startsWith('ability-')) {
            const abilityName = trait.replace('ability-', '');
            return document.getElementById(`${abilityName}Count`);
        } else if (trait.startsWith('stage-')) {
            const stageName = trait.replace('stage-', '');
            return document.getElementById(`${stageName}Count`);
        } else {
            // Direct trait name (defense types)
            return document.getElementById(`${trait}Count`);
        }
    }

    updateChart(stats) {
        const maxDataPoints = 100; // Keep only last 100 points for performance

        // Add new data point
        this.chartData.labels.push(stats.tick);
        this.chartData.datasets[0].data.push(stats.totalCells);
        this.chartData.datasets[1].data.push(stats.foodCount);

        // Remove old data points if we have too many
        if (this.chartData.labels.length > maxDataPoints) {
            this.chartData.labels.shift();
            this.chartData.datasets[0].data.shift();
            this.chartData.datasets[1].data.shift();
        }

        // Update chart
        this.populationChart.update('none'); // 'none' mode for better performance
    }

    reset() {
        // Clear chart data
        this.chartData.labels = [];
        this.chartData.datasets[0].data = [];
        this.chartData.datasets[1].data = [];
        this.populationChart.update();

        // Reset all counters
        document.getElementById('totalCells').textContent = '0';
        document.getElementById('generation').textContent = '1';
        document.getElementById('tick').textContent = '0';
        document.getElementById('foodCount').textContent = '0';

        // Reset trait bars
        const allTraits = [
            // Defense types
            'spikes', 'poison', 'armor', 'regen', 'camo', 'shield', 'electric', 'magnetic', 'phase', 'swarm', 'mimic', 'explosive', 'viral', 'barrier', 'reflect',
            // Shapes
            'shape-circle', 'shape-triangle', 'shape-square', 'shape-hexagon', 'shape-oval', 'shape-star', 'shape-diamond',
            // Abilities
            'ability-none', 'ability-photosynthesis', 'ability-parasite', 'ability-pack_hunter', 'ability-territorial', 'ability-migratory', 'ability-burrowing', 'ability-leaping', 'ability-splitting', 'ability-fusion', 'ability-time_dilation', 'ability-energy_vampire', 'ability-shape_shift', 'ability-invisibility',
            // Life stages
            'stage-juvenile', 'stage-adult', 'stage-elder'
        ];

        allTraits.forEach(trait => {
            const fillElement = document.querySelector(`.fill.${trait}`);
            const countElement = this.getCountElementForTrait(trait);
            if (fillElement) fillElement.style.width = '0%';
            if (countElement) countElement.textContent = '0';
        });
    }

    updateComprehensiveTraits(traitDistribution) {
        // Update population overview
        const totalEntitiesEl = document.getElementById('totalEntities');
        const totalCellsEl = document.getElementById('totalCells');
        const totalVirusesEl = document.getElementById('totalViruses');

        if (totalEntitiesEl) totalEntitiesEl.textContent = traitDistribution.total || 0;
        if (totalCellsEl) totalCellsEl.textContent = traitDistribution.cellCount || 0;
        if (totalVirusesEl) totalVirusesEl.textContent = traitDistribution.virusCount || 0;

        // Update numerical traits
        const numericalTraitsContainer = document.getElementById('numericalTraits');
        if (numericalTraitsContainer) {
            this.populateNumericalTraits(numericalTraitsContainer, traitDistribution.averages);
        }

        // Update viral traits  
        const viralTraitsContainer = document.getElementById('viralTraits');
        if (viralTraitsContainer) {
            this.populateViralTraits(viralTraitsContainer, traitDistribution.averages);
        }

        // Calculate and update diversity metrics
        this.updateDiversityMetrics(traitDistribution);
    }

    populateNumericalTraits(container, averages) {
        const keyTraits = [
            { key: 'health', name: '❤️ Health', format: (v) => v.toFixed(1) },
            { key: 'size', name: '📏 Size', format: (v) => v.toFixed(1) },
            { key: 'speed', name: '💨 Speed', format: (v) => v.toFixed(1) },
            { key: 'energy', name: '⚡ Energy', format: (v) => v.toFixed(1) },
            { key: 'metabolicEfficiency', name: '🔄 Metabolism', format: (v) => (v * 100).toFixed(1) + '%' },
            { key: 'visionRange', name: '👁️ Vision', format: (v) => v.toFixed(1) },
            { key: 'attackPower', name: '⚔️ Attack', format: (v) => (v * 100).toFixed(1) + '%' },
            { key: 'armorThickness', name: '🛡️ Armor', format: (v) => (v * 100).toFixed(1) + '%' },
            { key: 'regenerationRate', name: '💚 Regen', format: (v) => (v * 100).toFixed(1) + '%' },
            { key: 'aggression', name: '😠 Aggression', format: (v) => (v * 100).toFixed(1) + '%' },
            { key: 'curiosity', name: '🤔 Curiosity', format: (v) => (v * 100).toFixed(1) + '%' },
            { key: 'adaptability', name: '🌿 Adaptability', format: (v) => (v * 100).toFixed(1) + '%' }
        ];

        container.innerHTML = '';
        keyTraits.forEach(trait => {
            const data = averages[trait.key];
            if (data && data.count > 0) {
                const item = document.createElement('div');
                item.className = 'numerical-trait-item';
                item.innerHTML = `
                    <span class="trait-name">${trait.name}:</span>
                    <span class="trait-value">${trait.format(data.average)}</span>
                `;
                container.appendChild(item);
            }
        });
    }

    populateViralTraits(container, averages) {
        const viralTraits = [
            { key: 'infectivity', name: '🦠 Infectivity', format: (v) => (v * 100).toFixed(1) + '%' },
            { key: 'virulence', name: '☠️ Virulence', format: (v) => (v * 100).toFixed(1) + '%' },
            { key: 'transmissionRange', name: '📡 Range', format: (v) => v.toFixed(1) },
            { key: 'replicationSpeed', name: '📈 Replication', format: (v) => (v * 100).toFixed(1) + '%' },
            { key: 'hostSpecificity', name: '🎯 Specificity', format: (v) => (v * 100).toFixed(1) + '%' },
            { key: 'heatStability', name: '🌡️ Heat Resist', format: (v) => (v * 100).toFixed(1) + '%' },
            { key: 'chemicalResistance', name: '🧪 Chem Resist', format: (v) => (v * 100).toFixed(1) + '%' },
            { key: 'hostManipulation', name: '🧠 Manipulation', format: (v) => (v * 100).toFixed(1) + '%' }
        ];

        container.innerHTML = '';
        viralTraits.forEach(trait => {
            const data = averages[trait.key];
            if (data && data.count > 0) {
                const item = document.createElement('div');
                item.className = 'viral-trait-item';
                item.innerHTML = `
                    <span class="trait-name">${trait.name}:</span>
                    <span class="trait-value">${trait.format(data.average)}</span>
                `;
                container.appendChild(item);
            }
        });
    }

    updateDiversityMetrics(traitDistribution) {
        // Calculate Shannon diversity index
        const total = traitDistribution.total;
        let shannon = 0;
        let simpson = 0;

        if (total > 0) {
            Object.values(traitDistribution.counts).forEach(count => {
                if (count > 0) {
                    const p = count / total;
                    shannon += -p * Math.log2(p);
                    simpson += p * p;
                }
            });

            simpson = 1 - simpson; // Simpson's diversity index

            // Calculate evenness (Shannon / log2(species count))
            const speciesCount = Object.values(traitDistribution.counts).filter(count => count > 0).length;
            const maxShannon = speciesCount > 1 ? Math.log2(speciesCount) : 1;
            const evenness = maxShannon > 0 ? shannon / maxShannon : 0;

            // Update display
            const shannonEl = document.getElementById('shannonIndex');
            const simpsonEl = document.getElementById('simpsonIndex');
            const evennessEl = document.getElementById('evenness');

            if (shannonEl) shannonEl.textContent = shannon.toFixed(2);
            if (simpsonEl) simpsonEl.textContent = simpson.toFixed(2);
            if (evennessEl) evennessEl.textContent = evenness.toFixed(2);
        }
    }
}

export { UIManager };