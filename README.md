# TurtlBattl - Isometric Twin Stick Shooter

A fast-paced 2-player isometric twin-stick shooter game built with Phaser 3. Battle your friends in local multiplayer with Xbox controller support!

## Features

- 🎮 **Twin-stick controls** - Move with one stick, aim with the other
- 🎯 **2-player local multiplayer** - Battle against a friend on the same screen
- 🕹️ **Xbox controller required** - Full gamepad support for both players
- 🎯 **Analog sensitivity** - Movement speed varies with stick pressure
- 💚 **Health system** - Each player has 100 HP, bullets deal 25 damage
- 🏆 **Score tracking** - Keep track of wins across multiple rounds
- 🔄 **Automatic round restart** - New round starts after each victory

## Controls

### Requirements
- **2 Xbox Controllers** (or compatible gamepads)

### Player 1 (Green)
- **Controller 1**

### Player 2 (Blue) 
- **Controller 2**

### Gamepad Controls (Both Players)
- **Left Stick:** Movement (analog - push gently for slow movement)
- **Right Stick:** Aim direction
- **Right Trigger (R2):** Shoot

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/turtlbattl.git
cd turtlbattl
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Project Structure

```
turtlbattl/
├── src/
│   ├── config/
│   │   └── GameConfig.js      # Centralized game configuration
│   ├── entities/
│   │   ├── Player.js          # Player entity with controls and health
│   │   └── Bullet.js          # Bullet entity with physics
│   ├── managers/
│   │   └── GameStateManager.js # Game state and score management
│   ├── scenes/
│   │   └── GameScene.js       # Main game scene
│   ├── utils/
│   │   ├── IsometricUtils.js  # Isometric projection utilities
│   │   └── TextureFactory.js  # Texture generation utilities
│   └── main.js                # Game initialization
├── index.html                  # Entry HTML file
├── package.json               # Project dependencies
└── README.md                  # This file
```

## Technologies Used

- **Phaser 3** - HTML5 game framework
- **Vite** - Fast build tool and dev server
- **JavaScript ES6+** - Modern JavaScript features

## Architecture Highlights

- **Modular design** with clear separation of concerns
- **Configuration-driven** development for easy tweaking
- **Physics groups** for efficient collision detection
- **Error handling** throughout for robustness
- **Performance optimized** with texture caching and smart updates

## Contributing

Feel free to submit issues and pull requests!

## License

MIT