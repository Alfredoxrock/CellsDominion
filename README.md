# 🧬 Cell Defense Simulator

**An Interactive 2D Evolutionary Game**

Watch cells evolve, compete, and adapt in real-time! This browser-based simulation demonstrates evolutionary dynamics through competing cellular organisms with unique defensive mechanisms.

![Cell Defense Simulator](https://img.shields.io/badge/Status-Complete-brightgreen) ![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow) ![HTML5](https://img.shields.io/badge/HTML5-Canvas-orange)

## 🎮 Game Overview

The Cell Defense Simulator is a digital petri dish where cellular organisms compete for survival. Each cell has unique traits and defense mechanisms that evolve over generations through mutation and natural selection.

### Core Features

- **🧬 Evolution**: Cells reproduce with mutations, leading to trait changes over generations
- **⚔️ Combat System**: Five distinct defense mechanisms with strategic advantages/disadvantages
- **🍎 Resource Management**: Food scarcity drives competition and survival pressure
- **📊 Real-time Analytics**: Population charts and trait distribution tracking
- **🎛️ Experimentation**: Adjustable parameters for different evolutionary scenarios

## 🔬 Cell Biology System

### Cell Traits (DNA)
Each cell has genetic traits that determine its behavior:

- **Health** (80-120): Maximum hit points
- **Size** (8-16): Affects strength, speed, and energy consumption  
- **Speed** (0.5-2.0): Movement rate and ability to flee
- **Energy** (60-100): Required for all actions, drains over time
- **Defense Type**: One of five specialized mechanisms

### Defense Mechanisms

| Defense | Icon | Strategy | Strengths | Weaknesses |
|---------|------|----------|-----------|------------|
| **🔸 Spikes** | Red spiky edges | Contact damage | High damage to attackers | Vulnerable to ranged attacks |
| **☠️ Poison** | Green aura | Area denial | Damages multiple enemies | High energy cost |
| **🛡️ Armor** | Blue thick border | Damage reduction | Survives focused attacks | Slow movement |
| **💚 Regeneration** | Pink sparkles | Self-healing | Survives prolonged combat | Requires constant energy |
| **👻 Camouflage** | Transparency | Stealth/avoidance | Avoids detection | Poor at direct competition |

## 🧠 AI Behavior System

Cells make decisions based on their current state:

1. **Low Energy** → Desperately search for food
2. **High Energy** → Consider reproduction or territorial behavior  
3. **Enemy Detection** → Fight if stronger, flee if weaker
4. **Abundance** → Reproduce to pass on successful traits

### Decision Factors
- **Energy levels** drive urgency for food seeking
- **Size comparison** determines fight-or-flight responses
- **Defense type compatibility** affects combat outcomes
- **Camouflage detection** influences threat assessment

## 🍎 Food & Energy Economy

### Food Types
- **Small** (Blue): 16-32 energy, common (60% spawn rate)
- **Medium** (Yellow): 24-48 energy, uncommon (30% spawn rate)  
- **Large** (Orange): 40-64 energy, rare (10% spawn rate)

### Energy Dynamics
- Constant energy drain based on cell size
- Bigger cells need more food but are stronger
- Death creates nutrient corpses for scavengers
- Food decays over time if not consumed

## 🧪 Mutation & Evolution

### Reproduction Requirements
- Energy > 80% of maximum
- Age > 300 ticks (5 seconds)
- Cooldown period between reproductions

### Mutation System
When cells reproduce, offspring may mutate:
- **Size**: ±4 units (affects strength and energy needs)
- **Speed**: ±0.6 units (affects mobility and escape ability)
- **Health**: ±20 points (affects survivability) 
- **Energy Capacity**: ±20 points (affects endurance)
- **Defense Type**: 50% chance to change mechanism (rare)

**Mutation Rate**: Adjustable 1-50% chance per trait

## 🎛️ Controls & Settings

### Simulation Controls
- **⏸️ Pause/Play**: Stop/resume the simulation
- **🔄 Reset**: Restart with current settings
- **⏭️ Step**: Advance one frame when paused

### Parameters
- **Initial Cells**: 10-100 starting population
- **Food Spawn Rate**: 0.1-5.0 particles per second
- **Mutation Rate**: 0.01-0.50 probability per trait
- **Simulation Speed**: 0.1x-3.0x time multiplier

## 📊 Data Visualization

### Live Statistics
- **Population Count**: Current living cells
- **Generation**: Average generation of living population
- **Food Availability**: Current food particles
- **Trait Distribution**: Real-time breakdown of defense types

### Population Charts
- Historical population over time
- Food availability trends
- Extinction events tracking

## 🚀 Getting Started

### Requirements
- Modern web browser with HTML5 Canvas support
- JavaScript enabled
- No additional dependencies required

### Installation
1. Download all files to a folder
2. Start a local HTTP server:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   
   # Node.js
   npx http-server
   ```
3. Open `http://localhost:8000` in your browser
4. Watch evolution in action! 🧬

### Quick Start
1. **Observe**: Watch initial population compete for food
2. **Experiment**: Adjust mutation rate and food availability
3. **Analyze**: Monitor which defense types dominate
4. **Reset**: Try different scenarios and parameters

## 🧪 Experimental Scenarios

### High Mutation Environment
- Mutation Rate: 30-50%
- Food: Abundant
- **Expected**: Rapid trait diversity and adaptation

### Resource Scarcity
- Food Spawn Rate: 0.2-0.5
- Population: 50+ cells
- **Expected**: Selection pressure for efficient traits

### Combat Arena
- Small arena boundaries
- High initial population
- **Expected**: Defense mechanism arms race

### Peaceful Evolution
- Abundant food
- Low mutation rate
- **Expected**: Stable population with gradual changes

## 🎯 Educational Value

This simulation demonstrates key evolutionary concepts:

- **Natural Selection**: Better-adapted cells survive and reproduce
- **Genetic Drift**: Random mutations create trait variation  
- **Selection Pressure**: Resource scarcity drives adaptation
- **Trade-offs**: No single strategy dominates all scenarios
- **Emergent Behavior**: Complex patterns from simple rules

## 🔧 Technical Architecture

### File Structure
```
CelL Game/
├── index.html          # Main HTML structure
├── styles.css          # Game styling and UI
└── js/
    ├── main.js          # Game controller and initialization
    ├── simulation.js    # Core simulation logic
    ├── cell.js          # Cell class and behaviors
    ├── food.js          # Food system management
    └── ui.js            # Statistics and chart management
```

### Technologies Used
- **HTML5 Canvas**: High-performance 2D rendering
- **Vanilla JavaScript**: No framework dependencies  
- **Chart.js**: Real-time population visualization
- **CSS3**: Modern UI styling with animations

### Performance Optimizations
- Efficient collision detection
- Limited particle history for charts
- Configurable simulation speed
- Optimized rendering pipeline

## 🎨 Visual Design

### Color Coding
- **Defense Types**: Each mechanism has unique colors
- **Health Bars**: Green (healthy) → Yellow (injured) → Red (critical)
- **Energy Rings**: Blue intensity shows energy level
- **Food Types**: Size and color indicate energy value

### Visual Effects
- Pulsing food particles with sparkle effects
- Poison auras around toxic cells
- Spike projections and armor borders
- Regeneration sparkles and healing effects
- Camouflage transparency effects

## 🔬 Scientific Basis

The simulation models real evolutionary concepts:

### Population Dynamics
- Carrying capacity limitations
- Predator-prey relationships
- Resource competition

### Genetic Algorithms  
- Trait inheritance with variation
- Selection pressure and fitness
- Generational improvement

### Game Theory
- Strategy evolution (Hawk-Dove dynamics)
- Arms race scenarios
- Cooperative vs competitive behaviors

## 🎯 Future Enhancements

Potential additions for extended gameplay:
- **Multi-species ecosystems**
- **Environmental challenges** (temperature, pH)  
- **Symbiotic relationships**
- **Genetic crossover** (sexual reproduction)
- **Migration patterns** and territories
- **Disease and immunity systems**

## 🤝 Contributing

This project demonstrates evolutionary programming concepts. Feel free to:
- Experiment with new defense mechanisms
- Add environmental factors
- Improve AI decision-making
- Enhance visualization features

## 📜 License

Open source educational project. Use for learning and experimentation.

---

**🧬 Watch Evolution Unfold!** 

Start the simulation and observe how simple rules create complex, emergent behaviors. Every run tells a different evolutionary story!

*"In the struggle for survival, the fittest survive not because they are physically stronger, but because they are better adapted to their environment."* - Charles Darwin