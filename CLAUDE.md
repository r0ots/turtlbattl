# TurtlBattl - Project Context for Claude

## 🎮 Project Overview
**TurtlBattl** is an isometric 2-player twin-stick shooter game built with Phaser 3. It's a local multiplayer arena combat game where two players battle until one reaches zero health, earning points across multiple rounds.

### Core Gameplay Loop
1. Two players spawn in an arena
2. Players move with one stick/keys, aim with another
3. Shoot projectiles at each other (25 damage per hit)
4. First to die loses, winner gets a point
5. Round resets automatically after 2 seconds
6. Repeat until players stop playing

## 🏗️ Architecture Decisions

### Technology Stack
- **Phaser 3** (v3.70.0) - HTML5 game framework
- **Vite** - Build tool for fast development and optimized production builds
- **Vanilla JavaScript ES6+** - No TypeScript (kept simple for rapid prototyping)
- **npm** - Package management

### Design Patterns Used

#### 1. **Entity-Component Pattern**
- `Player` and `Bullet` are entity classes
- Each manages its own sprite, physics body, and behavior
- Sprites store reference to their entity via `setData()`

#### 2. **Manager Pattern**
- `GameStateManager` - Handles game state, scoring, round management
- `TextureFactory` - Centralizes texture generation with caching
- Clear separation of concerns

#### 3. **Configuration-Driven Design**
- All game settings in `GameConfig.js`
- Easy tweaking without touching game logic
- Single source of truth for values

#### 4. **Physics Groups (Phaser Pattern)**
- `playerGroup` and `bulletGroup` for efficient collision detection
- Leverages Phaser's built-in physics system
- Better performance than manual collision checks

## 📁 Project Structure

```
src/
├── config/
│   └── GameConfig.js          # All game settings (speeds, damages, colors, etc.)
├── entities/
│   ├── Player.js              # Player entity (movement, shooting, health)
│   └── Bullet.js              # Bullet entity (physics, damage, lifecycle)
├── managers/
│   └── GameStateManager.js    # Game state, scoring, round management
├── scenes/
│   └── GameScene.js           # Main game scene (orchestrates everything)
├── utils/
│   ├── IsometricUtils.js      # Isometric projection math (future use)
│   └── TextureFactory.js      # Texture generation with caching
└── main.js                    # Phaser initialization
```

## 🎯 Key Features Implemented

### Controls
- **Gamepad only**: Xbox controllers required (no keyboard support)
- **Twin-stick mechanics**: Independent movement and aiming with analog sensitivity
- **Player 1**: Controller 1 (Green)
- **Player 2**: Controller 2 (Blue)

### Game Systems
- **Health System**: 100 HP per player, health bars above characters
- **Projectile System**: Physics-based bullets with automatic cleanup
- **Score Tracking**: Persistent across rounds, DOM-based display
- **Round Management**: Auto-restart with winner announcement
- **Arena Bounds**: Grid-based visual arena with collision bounds

## 🔧 Technical Improvements Made

### Performance Optimizations
1. **Texture Caching**: Textures generated once and reused
2. **Conditional Depth Updates**: Only update when position changes
3. **Physics Groups**: Efficient collision via Phaser's system
4. **Bullet Lifecycle**: Proper cleanup with destroyed flag

### Code Quality
1. **Error Handling**: Try-catch blocks, null checks, validation
2. **Memory Management**: Proper cleanup of sprites, timers
3. **Separation of Concerns**: Modular architecture
4. **Configuration Extraction**: Centralized settings

### Bug Fixes Applied
- Fixed division by zero in bullet velocity calculation
- Fixed memory leaks in bullet management
- Added proper null/undefined checks throughout
- Fixed bullet velocity persistence when added to physics groups

## 🚧 Known Issues & Limitations

### Current Limitations
1. **No pause menu** - Game runs continuously
2. **No match end condition** - Plays indefinitely
3. **Basic visuals** - Using simple colored rectangles/circles
4. **No sound** - No audio feedback yet
5. **Local only** - No network multiplayer

### Technical Debt
1. **Isometric system unused** - `IsometricUtils` prepared but not applied
2. **Simple depth sorting** - Just using x+y for depth
3. **DOM score display** - Should use Phaser text objects
4. **No particle effects** - Basic visual feedback only

## 🚀 Future Enhancement Ideas

### Quick Wins
- [ ] Add sound effects (shoot, hit, death)
- [ ] Particle effects for hits and deaths
- [ ] Power-ups (speed boost, rapid fire, shield)
- [ ] Different arena layouts/obstacles
- [ ] Match settings (first to X wins)

### Medium Effort
- [ ] Character selection with different stats
- [ ] Weapon varieties (shotgun, laser, rockets)
- [ ] Actual isometric sprite rendering
- [ ] Better visual effects and animations
- [ ] Game modes (capture the flag, king of the hill)

### Large Features
- [ ] Online multiplayer via WebRTC
- [ ] Level editor
- [ ] Campaign/story mode
- [ ] Mobile touch controls
- [ ] Steam Deck support

## 💡 Development Tips

### Adding New Features
1. Always update `GameConfig.js` for new settings
2. Use `TextureFactory` for any new textures
3. Add error handling for any external inputs
4. Update `GameStateManager` for state changes
5. Use physics groups for new collidable entities

### Common Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
git add .           # Stage changes
git commit -m "msg"  # Commit changes
git push            # Push to GitHub
```

### Testing Controllers
- Xbox controllers work via Gamepad API
- Test with `this.input.gamepad.gamepads` in console
- Chrome/Edge have best gamepad support

### Performance Monitoring
- Check FPS with Phaser's built-in monitor
- Watch for memory leaks in Chrome DevTools
- Profile with Performance tab for bottlenecks

## 📝 Session Context

### Last Session Summary
- Built complete game from scratch
- Implemented all core features
- Refactored for better code quality
- Fixed critical bugs (bullet movement, memory leaks)
- Set up Git repository and pushed to GitHub
- Created comprehensive documentation
- Added analog stick sensitivity for variable movement speed
- Removed all keyboard support (gamepad-only now)

### Next Session Priorities
1. Add sound effects for better game feel
2. Implement particle effects for visual feedback
3. Add a simple menu system
4. Create power-ups for variety
5. Polish visuals with better sprites

## 🎯 Quick Start for Next Session

1. **Review this file** to understand project state
2. **Check GitHub issues** for any reported bugs
3. **Run `npm run dev`** to start development
4. **Open `http://localhost:5173`** to test
5. **Focus on highest priority** from Next Session Priorities

---

*This document should be updated after significant changes to maintain accuracy for future sessions.*