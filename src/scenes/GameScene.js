import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Bullet } from '../entities/Bullet';
import { Crate } from '../entities/Crate';
import { Wall } from '../entities/Wall';
import { IsometricUtils } from '../utils/IsometricUtils';
import { GameConfig } from '../config/GameConfig';
import { GameStateManager } from '../managers/GameStateManager';
import { SoundManager } from '../managers/SoundManager';
import { EventBus } from '../events/EventBus';
import { GameEvents } from '../events/GameEvents';
import { CollisionSystem } from '../systems/CollisionSystem';
import { BulletPool } from '../systems/BulletPool';
import { PlayerStats } from '../systems/PlayerStats';
import { ExplosionSystem } from '../systems/ExplosionSystem';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.players = [];
        this.bullets = [];
        this.crates = [];
        this.walls = [];
        
        // Performance tracking
        this.lastPoolOptimization = 0;
        this.poolOptimizationInterval = 5000; // Optimize every 5 seconds
        
        // Initialize systems
        this.eventBus = new EventBus();
        this.collisionSystem = new CollisionSystem(this);
        this.soundManager = new SoundManager(this);
        this.explosionSystem = new ExplosionSystem(this);
        
        // Player stats for upgrades
        this.playerStats = [
            new PlayerStats(1),
            new PlayerStats(2)
        ];
        
        // Upgrade selection state
        this.isUpgradeActive = false;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Player events
        this.eventBus.on(GameEvents.PLAYER_DEATH, (data) => this.onPlayerDeath(data.player));
        this.eventBus.on(GameEvents.BULLET_FIRED, (data) => {
            // Get player stats for bullet properties
            const playerStats = this.playerStats[data.playerNumber - 1];
            this.createBullet(
                data.position.x, 
                data.position.y, 
                data.direction.x, 
                data.direction.y, 
                data.playerNumber,
                playerStats
            );
            this.soundManager.playShoot();
        });
        
        // Sound events
        this.eventBus.on(GameEvents.BULLET_HIT, () => this.soundManager.playHit());
        this.eventBus.on(GameEvents.MELEE_HIT, () => this.soundManager.playHit());
        this.eventBus.on(GameEvents.MELEE_ATTACK, () => this.soundManager.playSlash());
        this.eventBus.on(GameEvents.PLAYER_DEATH, () => this.soundManager.playDamage());
        this.eventBus.on(GameEvents.PLAYER_DASH, () => this.soundManager.playDash());
    }
    
    preload() {
        // Load all sound assets
        this.soundManager.preload();
        
        // Load crate image
        this.load.image('crate', '/pictures/crate.png');
        
        // Load wall images
        this.load.image('wall_h', '/pictures/wall_h.png');
        this.load.image('wall_v', '/pictures/wall_v.png');
    }
    
    create() {
        try {
            this.gameState = new GameStateManager(this);
            
            // Set world bounds to match the arena (with margins)
            const width = this.cameras.main.width;
            const height = this.cameras.main.height;
            const margin = GameConfig.arena.margin;
            this.physics.world.setBounds(margin, margin, width - margin * 2, height - margin * 2);
            
            this.createPhysicsGroups();
            
            // Initialize bullet pool after physics groups are ready
            this.bulletPool = new BulletPool(this);
            
            this.createArena();
            this.createPlayers();
            this.createCrates();
            this.createWalls();
            this.setupCollisions();
            this.createUI();
            
            // Setup debug keyboard controls
            this.setupDebugControls();
            
            // Ensure gamepad is started and ready
            if (this.input.gamepad) {
                this.input.gamepad.start();
                
                this.input.gamepad.once('connected', (pad) => {
                    console.log('Gamepad connected:', pad.id);
                });
                
                // Also check for already connected gamepads
                this.input.gamepad.once('down', (pad, button, index) => {
                    console.log('Gamepad input detected:', pad.id);
                });
            }
        } catch (error) {
            console.error('Failed to initialize game scene:', error);
        }
    }
    
    createPhysicsGroups() {
        this.playerGroup = this.physics.add.group();
        this.bulletGroup = this.physics.add.group({
            runChildUpdate: true
        });
        this.crateGroup = this.physics.add.staticGroup();
        this.wallGroup = this.physics.add.staticGroup();
    }
    
    createArena() {
        const graphics = this.add.graphics();
        const config = GameConfig.arena;
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        graphics.lineStyle(3, config.borderColor, 1);
        graphics.strokeRect(
            config.margin,
            config.margin,
            width - config.margin * 2,
            height - config.margin * 2
        );
        
        graphics.lineStyle(1, config.gridColor, 0.3);
        for (let x = config.margin; x < width - config.margin; x += config.gridSize) {
            graphics.moveTo(x, config.margin);
            graphics.lineTo(x, height - config.margin);
        }
        for (let y = config.margin; y < height - config.margin; y += config.gridSize) {
            graphics.moveTo(config.margin, y);
            graphics.lineTo(width - config.margin, y);
        }
        graphics.strokePath();
    }
    
    createPlayers() {
        try {
            const width = this.cameras.main.width;
            const height = this.cameras.main.height;
            
            // Dynamic spawn positions based on screen size
            const spawn1 = { 
                x: width * 0.25, 
                y: height * 0.5 
            };
            const spawn2 = { 
                x: width * 0.75, 
                y: height * 0.5 
            };
            
            const player1 = new Player(this, spawn1.x, spawn1.y, 1, this.playerStats[0]);
            const player2 = new Player(this, spawn2.x, spawn2.y, 2, this.playerStats[1]);
            
            this.players = [player1, player2];
            
            this.playerGroup.add(player1.sprite);
            this.playerGroup.add(player2.sprite);
        } catch (error) {
            console.error('Failed to create players:', error);
        }
    }
    
    createCrates() {
        try {
            const config = GameConfig.crate;
            const width = this.cameras.main.width;
            const height = this.cameras.main.height;
            const gridSize = GameConfig.arena.gridSize;
            const margin = GameConfig.arena.margin;
            
            // Define crate arrangement patterns
            const patterns = [
                // Single crate
                { name: 'single', blocks: [{x: 0, y: 0}] },
                
                // Two crates
                { name: 'two_h', blocks: [{x: 0, y: 0}, {x: 1, y: 0}] },
                { name: 'two_v', blocks: [{x: 0, y: 0}, {x: 0, y: 1}] },
                
                // Three crates
                { name: 'three_h', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}] },
                { name: 'three_v', blocks: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}] },
                { name: 'L_bl', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 0, y: 1}] },
                { name: 'L_br', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: 1}] },
                { name: 'L_tl', blocks: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}] },
                { name: 'L_tr', blocks: [{x: 0, y: 1}, {x: 1, y: 0}, {x: 1, y: 1}] },
                
                // Four crates
                { name: 'four_h', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 3, y: 0}] },
                { name: 'four_v', blocks: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}, {x: 0, y: 3}] },
                { name: 'four_2x2', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}] },
                { name: 'four_T_up', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 1, y: 1}] },
                { name: 'four_T_down', blocks: [{x: 1, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 1}] },
                { name: 'four_T_left', blocks: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}, {x: 1, y: 1}] },
                { name: 'four_T_right', blocks: [{x: 1, y: 0}, {x: 1, y: 1}, {x: 1, y: 2}, {x: 0, y: 1}] },
                { name: 'four_Z_h', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: 1}, {x: 2, y: 1}] },
                { name: 'four_Z_v', blocks: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}, {x: 1, y: 2}] },
                { name: 'four_S_h', blocks: [{x: 1, y: 0}, {x: 2, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}] },
                { name: 'four_S_v', blocks: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}, {x: 1, y: 2}] },
                
                // Five crates
                { name: 'five_h', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 3, y: 0}, {x: 4, y: 0}] },
                { name: 'five_v', blocks: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}, {x: 0, y: 3}, {x: 0, y: 4}] },
                { name: 'five_plus', blocks: [{x: 1, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 1}, {x: 1, y: 2}] },
                { name: 'five_T_up', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 1, y: 1}, {x: 1, y: 2}] },
                { name: 'five_T_down', blocks: [{x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 2}, {x: 1, y: 2}, {x: 2, y: 2}] },
                { name: 'five_T_left', blocks: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}, {x: 1, y: 1}, {x: 2, y: 1}] },
                { name: 'five_T_right', blocks: [{x: 2, y: 0}, {x: 2, y: 1}, {x: 2, y: 2}, {x: 1, y: 1}, {x: 0, y: 1}] },
                { name: 'five_L_bl', blocks: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}, {x: 1, y: 2}, {x: 2, y: 2}] },
                { name: 'five_L_br', blocks: [{x: 2, y: 0}, {x: 2, y: 1}, {x: 2, y: 2}, {x: 0, y: 2}, {x: 1, y: 2}] },
                { name: 'five_L_tl', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}] },
                { name: 'five_L_tr', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 2, y: 1}, {x: 2, y: 2}] },
                { name: 'five_U_up', blocks: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 1}, {x: 2, y: 0}] },
                { name: 'five_U_down', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 0, y: 1}, {x: 2, y: 1}] },
                { name: 'five_U_left', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}, {x: 1, y: 2}] },
                { name: 'five_U_right', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: 1}, {x: 1, y: 2}, {x: 0, y: 2}] },
                
                // Six crates
                { name: 'six_h', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 3, y: 0}, {x: 4, y: 0}, {x: 5, y: 0}] },
                { name: 'six_v', blocks: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}, {x: 0, y: 3}, {x: 0, y: 4}, {x: 0, y: 5}] },
                { name: 'six_2x3_h', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 1}] },
                { name: 'six_3x2_v', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}, {x: 0, y: 2}, {x: 1, y: 2}] },
                { name: 'six_L_large_bl', blocks: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}, {x: 1, y: 2}, {x: 2, y: 2}, {x: 3, y: 2}] },
                { name: 'six_L_large_br', blocks: [{x: 3, y: 0}, {x: 3, y: 1}, {x: 3, y: 2}, {x: 0, y: 2}, {x: 1, y: 2}, {x: 2, y: 2}] },
                { name: 'six_L_large_tl', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 3, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}] },
                { name: 'six_L_large_tr', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 3, y: 0}, {x: 3, y: 1}, {x: 3, y: 2}] },
                { name: 'six_C_up', blocks: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 1, y: 2}] },
                { name: 'six_C_down', blocks: [{x: 1, y: 0}, {x: 0, y: 1}, {x: 2, y: 1}, {x: 0, y: 2}, {x: 1, y: 2}, {x: 2, y: 2}] },
                { name: 'six_C_left', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}, {x: 1, y: 2}, {x: 2, y: 1}] },
                { name: 'six_C_right', blocks: [{x: 1, y: 0}, {x: 2, y: 0}, {x: 2, y: 1}, {x: 2, y: 2}, {x: 1, y: 2}, {x: 0, y: 1}] },
                { name: 'six_T_large_up', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 3, y: 0}, {x: 1, y: 1}, {x: 2, y: 1}] },
                { name: 'six_T_large_down', blocks: [{x: 1, y: 0}, {x: 2, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 1}, {x: 3, y: 1}] },
                { name: 'six_Z_large', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: 1}, {x: 2, y: 1}, {x: 2, y: 2}, {x: 3, y: 2}] },
                { name: 'six_S_large', blocks: [{x: 2, y: 0}, {x: 3, y: 0}, {x: 1, y: 1}, {x: 2, y: 1}, {x: 0, y: 2}, {x: 1, y: 2}] }
            ];
            
            // Calculate grid positions
            const gridCols = Math.floor((width - margin * 2) / gridSize);
            const gridRows = Math.floor((height - margin * 2) / gridSize);
            
            // Track occupied grid positions (shared with walls)
            const occupiedGrid = new Set();
            this.globalOccupiedGrid = occupiedGrid; // Store for wall creation
            
            // Player spawn grid positions to avoid
            const playerGridPositions = [
                { x: Math.floor(gridCols * 0.25), y: Math.floor(gridRows * 0.5) },
                { x: Math.floor(gridCols * 0.75), y: Math.floor(gridRows * 0.5) }
            ];
            
            // Mark player spawn areas as occupied (3x3 area around spawn)
            for (const playerPos of playerGridPositions) {
                for (let dx = -3; dx <= 3; dx++) {
                    for (let dy = -3; dy <= 3; dy++) {
                        occupiedGrid.add(`${playerPos.x + dx},${playerPos.y + dy}`);
                    }
                }
            }
            
            // Keep spawning arrangements until we have enough crate tiles
            let totalCrateTiles = 0;
            const targetMinTiles = GameConfig.crate.minTiles;
            const targetMaxTiles = GameConfig.crate.maxTiles;
            let arrangementCount = 0;
            const maxArrangements = 50; // Safety limit
            
            while (totalCrateTiles < targetMinTiles && arrangementCount < maxArrangements) {
                // Pick random pattern, prefer larger patterns if we need more tiles
                let pattern;
                if (totalCrateTiles < targetMinTiles) {
                    // When we need more tiles, bias towards larger patterns
                    const largePatterns = patterns.filter(p => p.blocks.length >= 4);
                    const allPatterns = patterns;
                    const patternPool = totalCrateTiles < targetMinTiles / 2 ? largePatterns.concat(allPatterns) : allPatterns;
                    pattern = patternPool[Math.floor(Math.random() * patternPool.length)];
                } else {
                    pattern = patterns[Math.floor(Math.random() * patterns.length)];
                }
                
                // Skip if this would exceed max tiles
                if (totalCrateTiles + pattern.blocks.length > targetMaxTiles) {
                    // Try to find a smaller pattern that fits
                    const fittingPatterns = patterns.filter(p => totalCrateTiles + p.blocks.length <= targetMaxTiles);
                    if (fittingPatterns.length === 0) break; // No patterns fit
                    pattern = fittingPatterns[Math.floor(Math.random() * fittingPatterns.length)];
                }
                
                // Try to find valid position for this pattern
                let placed = false;
                let attempts = 0;
                
                while (!placed && attempts < 50) {
                    // Random grid position
                    const gridX = Math.floor(Math.random() * (gridCols - 3)) + 1;
                    const gridY = Math.floor(Math.random() * (gridRows - 3)) + 1;
                    
                    // Check if all blocks in pattern can be placed
                    let canPlace = true;
                    for (const block of pattern.blocks) {
                        const checkX = gridX + block.x;
                        const checkY = gridY + block.y;
                        const key = `${checkX},${checkY}`;
                        
                        if (occupiedGrid.has(key) || checkX >= gridCols || checkY >= gridRows) {
                            canPlace = false;
                            break;
                        }
                    }
                    
                    if (canPlace) {
                        // Place all crates in the pattern
                        for (const block of pattern.blocks) {
                            const crateGridX = gridX + block.x;
                            const crateGridY = gridY + block.y;
                            
                            // Convert grid position to world position
                            const worldX = margin + crateGridX * gridSize + gridSize/2;
                            const worldY = margin + crateGridY * gridSize + gridSize/2;
                            
                            // Create crate
                            const crate = new Crate(this, worldX, worldY);
                            this.crates.push(crate);
                            
                            // Add to physics group
                            this.crateGroup.add(crate.sprite, true);
                            crate.sprite.body.setSize(config.size, config.size);
                            
                            // Mark grid position as occupied
                            occupiedGrid.add(`${crateGridX},${crateGridY}`);
                        }
                        
                        placed = true;
                        totalCrateTiles += pattern.blocks.length;
                        arrangementCount++;
                    }
                    
                    attempts++;
                }
            }
            
            console.log(`Created ${totalCrateTiles} crate tiles in ${arrangementCount} arrangements (target: ${targetMinTiles}-${targetMaxTiles})`);
        } catch (error) {
            console.error('Failed to create crates:', error);
        }
    }
    
    createWalls() {
        try {
            const config = GameConfig.wall;
            const width = this.cameras.main.width;
            const height = this.cameras.main.height;
            const gridSize = GameConfig.arena.gridSize;
            const margin = GameConfig.arena.margin;
            
            // Define wall arrangement patterns
            const patterns = [
                // Single walls
                { name: 'single_h', blocks: [{x: 0, y: 0, orientation: 'horizontal'}] },
                { name: 'single_v', blocks: [{x: 0, y: 0, orientation: 'vertical'}] },
                
                // Long horizontal walls (2-10 segments)
                { name: 'wall_h_2', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}] },
                { name: 'wall_h_3', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}] },
                { name: 'wall_h_4', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}, {x: 3, y: 0, orientation: 'horizontal'}] },
                { name: 'wall_h_5', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}, {x: 3, y: 0, orientation: 'horizontal'}, {x: 4, y: 0, orientation: 'horizontal'}] },
                { name: 'wall_h_6', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}, {x: 3, y: 0, orientation: 'horizontal'}, {x: 4, y: 0, orientation: 'horizontal'}, {x: 5, y: 0, orientation: 'horizontal'}] },
                { name: 'wall_h_7', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}, {x: 3, y: 0, orientation: 'horizontal'}, {x: 4, y: 0, orientation: 'horizontal'}, {x: 5, y: 0, orientation: 'horizontal'}, {x: 6, y: 0, orientation: 'horizontal'}] },
                { name: 'wall_h_8', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}, {x: 3, y: 0, orientation: 'horizontal'}, {x: 4, y: 0, orientation: 'horizontal'}, {x: 5, y: 0, orientation: 'horizontal'}, {x: 6, y: 0, orientation: 'horizontal'}, {x: 7, y: 0, orientation: 'horizontal'}] },
                { name: 'wall_h_10', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}, {x: 3, y: 0, orientation: 'horizontal'}, {x: 4, y: 0, orientation: 'horizontal'}, {x: 5, y: 0, orientation: 'horizontal'}, {x: 6, y: 0, orientation: 'horizontal'}, {x: 7, y: 0, orientation: 'horizontal'}, {x: 8, y: 0, orientation: 'horizontal'}, {x: 9, y: 0, orientation: 'horizontal'}] },
                
                // Long vertical walls (2-10 segments)
                { name: 'wall_v_2', blocks: [{x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}] },
                { name: 'wall_v_3', blocks: [{x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}, {x: 0, y: 2, orientation: 'vertical'}] },
                { name: 'wall_v_4', blocks: [{x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}, {x: 0, y: 2, orientation: 'vertical'}, {x: 0, y: 3, orientation: 'vertical'}] },
                { name: 'wall_v_5', blocks: [{x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}, {x: 0, y: 2, orientation: 'vertical'}, {x: 0, y: 3, orientation: 'vertical'}, {x: 0, y: 4, orientation: 'vertical'}] },
                { name: 'wall_v_6', blocks: [{x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}, {x: 0, y: 2, orientation: 'vertical'}, {x: 0, y: 3, orientation: 'vertical'}, {x: 0, y: 4, orientation: 'vertical'}, {x: 0, y: 5, orientation: 'vertical'}] },
                { name: 'wall_v_7', blocks: [{x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}, {x: 0, y: 2, orientation: 'vertical'}, {x: 0, y: 3, orientation: 'vertical'}, {x: 0, y: 4, orientation: 'vertical'}, {x: 0, y: 5, orientation: 'vertical'}, {x: 0, y: 6, orientation: 'vertical'}] },
                { name: 'wall_v_8', blocks: [{x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}, {x: 0, y: 2, orientation: 'vertical'}, {x: 0, y: 3, orientation: 'vertical'}, {x: 0, y: 4, orientation: 'vertical'}, {x: 0, y: 5, orientation: 'vertical'}, {x: 0, y: 6, orientation: 'vertical'}, {x: 0, y: 7, orientation: 'vertical'}] },
                { name: 'wall_v_10', blocks: [{x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}, {x: 0, y: 2, orientation: 'vertical'}, {x: 0, y: 3, orientation: 'vertical'}, {x: 0, y: 4, orientation: 'vertical'}, {x: 0, y: 5, orientation: 'vertical'}, {x: 0, y: 6, orientation: 'vertical'}, {x: 0, y: 7, orientation: 'vertical'}, {x: 0, y: 8, orientation: 'vertical'}, {x: 0, y: 9, orientation: 'vertical'}] },
                
                // Parallel walls (creating corridors)
                { name: 'corridor_h_3', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}, {x: 0, y: 2, orientation: 'horizontal'}, {x: 1, y: 2, orientation: 'horizontal'}, {x: 2, y: 2, orientation: 'horizontal'}] },
                { name: 'corridor_v_3', blocks: [{x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}, {x: 0, y: 2, orientation: 'vertical'}, {x: 2, y: 0, orientation: 'vertical'}, {x: 2, y: 1, orientation: 'vertical'}, {x: 2, y: 2, orientation: 'vertical'}] },
                { name: 'corridor_h_5', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}, {x: 3, y: 0, orientation: 'horizontal'}, {x: 4, y: 0, orientation: 'horizontal'}, {x: 0, y: 2, orientation: 'horizontal'}, {x: 1, y: 2, orientation: 'horizontal'}, {x: 2, y: 2, orientation: 'horizontal'}, {x: 3, y: 2, orientation: 'horizontal'}, {x: 4, y: 2, orientation: 'horizontal'}] },
                { name: 'corridor_v_5', blocks: [{x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}, {x: 0, y: 2, orientation: 'vertical'}, {x: 0, y: 3, orientation: 'vertical'}, {x: 0, y: 4, orientation: 'vertical'}, {x: 2, y: 0, orientation: 'vertical'}, {x: 2, y: 1, orientation: 'vertical'}, {x: 2, y: 2, orientation: 'vertical'}, {x: 2, y: 3, orientation: 'vertical'}, {x: 2, y: 4, orientation: 'vertical'}] },
                
                // L-shapes (no overlapping corners)
                { name: 'L_small_br', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'vertical'}, {x: 2, y: 1, orientation: 'vertical'}] },
                { name: 'L_small_bl', blocks: [{x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}, {x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}] },
                { name: 'L_small_tr', blocks: [{x: 0, y: 1, orientation: 'horizontal'}, {x: 1, y: 1, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'vertical'}, {x: 2, y: 1, orientation: 'vertical'}] },
                { name: 'L_small_tl', blocks: [{x: 1, y: 1, orientation: 'horizontal'}, {x: 2, y: 1, orientation: 'horizontal'}, {x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}] },
                
                // Large L-shapes
                { name: 'L_large_br', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}, {x: 3, y: 0, orientation: 'horizontal'}, {x: 4, y: 0, orientation: 'vertical'}, {x: 4, y: 1, orientation: 'vertical'}, {x: 4, y: 2, orientation: 'vertical'}, {x: 4, y: 3, orientation: 'vertical'}] },
                { name: 'L_large_bl', blocks: [{x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}, {x: 3, y: 0, orientation: 'horizontal'}, {x: 4, y: 0, orientation: 'horizontal'}, {x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}, {x: 0, y: 2, orientation: 'vertical'}, {x: 0, y: 3, orientation: 'vertical'}] },
                
                // Rooms (no overlapping corners)
                { name: 'room_small', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 0, y: 2, orientation: 'horizontal'}, {x: 1, y: 2, orientation: 'horizontal'}, {x: 0, y: 1, orientation: 'vertical'}, {x: 2, y: 1, orientation: 'vertical'}] },
                { name: 'room_medium', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}, {x: 0, y: 3, orientation: 'horizontal'}, {x: 1, y: 3, orientation: 'horizontal'}, {x: 2, y: 3, orientation: 'horizontal'}, {x: 0, y: 1, orientation: 'vertical'}, {x: 0, y: 2, orientation: 'vertical'}, {x: 3, y: 1, orientation: 'vertical'}, {x: 3, y: 2, orientation: 'vertical'}] },
                
                // T-shapes
                { name: 'T_up', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}, {x: 1, y: 1, orientation: 'vertical'}, {x: 1, y: 2, orientation: 'vertical'}] },
                { name: 'T_down', blocks: [{x: 1, y: 0, orientation: 'vertical'}, {x: 1, y: 1, orientation: 'vertical'}, {x: 0, y: 2, orientation: 'horizontal'}, {x: 1, y: 2, orientation: 'horizontal'}, {x: 2, y: 2, orientation: 'horizontal'}] },
                { name: 'T_left', blocks: [{x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}, {x: 0, y: 2, orientation: 'vertical'}, {x: 1, y: 1, orientation: 'horizontal'}, {x: 2, y: 1, orientation: 'horizontal'}] },
                { name: 'T_right', blocks: [{x: 2, y: 0, orientation: 'vertical'}, {x: 2, y: 1, orientation: 'vertical'}, {x: 2, y: 2, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'horizontal'}, {x: 1, y: 1, orientation: 'horizontal'}] }
            ];
            
            // Calculate grid positions
            const gridCols = Math.floor((width - margin * 2) / gridSize);
            const gridRows = Math.floor((height - margin * 2) / gridSize);
            
            // Use the same occupied grid from crate creation to prevent overlap
            const occupiedGrid = this.globalOccupiedGrid || new Set();
            
            // If this is the first time, mark crate positions as occupied
            if (!this.globalOccupiedGrid) {
                for (const crate of this.crates) {
                    const crateGridX = Math.floor((crate.x - margin) / gridSize);
                    const crateGridY = Math.floor((crate.y - margin) / gridSize);
                    occupiedGrid.add(`${crateGridX},${crateGridY}`);
                }
                this.globalOccupiedGrid = occupiedGrid;
            }
            
            // Player spawn grid positions to avoid
            const playerGridPositions = [
                { x: Math.floor(gridCols * 0.25), y: Math.floor(gridRows * 0.5) },
                { x: Math.floor(gridCols * 0.75), y: Math.floor(gridRows * 0.5) }
            ];
            
            // Mark player spawn areas as occupied (larger area for walls)
            for (const playerPos of playerGridPositions) {
                for (let dx = -4; dx <= 4; dx++) {
                    for (let dy = -4; dy <= 4; dy++) {
                        occupiedGrid.add(`${playerPos.x + dx},${playerPos.y + dy}`);
                    }
                }
            }
            
            // Keep spawning arrangements until we have enough wall tiles
            let totalWallTiles = 0;
            const targetMinTiles = config.minTiles;
            const targetMaxTiles = config.maxTiles;
            let arrangementCount = 0;
            const maxArrangements = 50; // Safety limit
            
            while (totalWallTiles < targetMinTiles && arrangementCount < maxArrangements) {
                // Pick random pattern, prefer larger patterns if we need more tiles
                let pattern;
                if (totalWallTiles < targetMinTiles) {
                    // When we need more tiles, bias towards larger patterns
                    const largePatterns = patterns.filter(p => p.blocks.length >= 5);
                    const allPatterns = patterns;
                    const patternPool = totalWallTiles < targetMinTiles / 2 ? largePatterns.concat(allPatterns) : allPatterns;
                    pattern = patternPool[Math.floor(Math.random() * patternPool.length)];
                } else {
                    pattern = patterns[Math.floor(Math.random() * patterns.length)];
                }
                
                // Skip if this would exceed max tiles
                if (totalWallTiles + pattern.blocks.length > targetMaxTiles) {
                    // Try to find a smaller pattern that fits
                    const fittingPatterns = patterns.filter(p => totalWallTiles + p.blocks.length <= targetMaxTiles);
                    if (fittingPatterns.length === 0) break; // No patterns fit
                    pattern = fittingPatterns[Math.floor(Math.random() * fittingPatterns.length)];
                }
                
                // Try to find valid position for this pattern
                let placed = false;
                let attempts = 0;
                
                while (!placed && attempts < 50) {
                    // Random grid position
                    const gridX = Math.floor(Math.random() * (gridCols - 4)) + 2;
                    const gridY = Math.floor(Math.random() * (gridRows - 4)) + 2;
                    
                    // Check if all blocks in pattern can be placed
                    let canPlace = true;
                    for (const block of pattern.blocks) {
                        const checkX = gridX + block.x;
                        const checkY = gridY + block.y;
                        // Check both wall-specific key and general position key
                        const wallKey = `${checkX},${checkY},${block.orientation}`;
                        const generalKey = `${checkX},${checkY}`;
                        
                        if (occupiedGrid.has(wallKey) || occupiedGrid.has(generalKey) || checkX >= gridCols || checkY >= gridRows) {
                            canPlace = false;
                            break;
                        }
                    }
                    
                    if (canPlace) {
                        // Place all walls in the pattern
                        for (const block of pattern.blocks) {
                            const wallGridX = gridX + block.x;
                            const wallGridY = gridY + block.y;
                            
                            // Convert grid position to world position
                            const worldX = margin + wallGridX * gridSize + gridSize/2;
                            const worldY = margin + wallGridY * gridSize + gridSize/2;
                            
                            // Create wall
                            const wall = new Wall(this, worldX, worldY, block.orientation);
                            this.walls.push(wall);
                            
                            // Add to physics group
                            this.wallGroup.add(wall.sprite, true);
                            
                            // Set collision size based on orientation
                            if (block.orientation === 'horizontal') {
                                // Horizontal walls: full width and height
                                wall.sprite.body.setSize(config.width, config.height);
                            } else {
                                // Vertical walls: only the right half of the grid cell
                                const halfWidth = config.width / 2;
                                wall.sprite.body.setSize(halfWidth, config.height);
                                // Offset the collision body to the right half
                                wall.sprite.body.setOffset(halfWidth, 0);
                            }
                            
                            // Mark grid position as occupied (with orientation for walls, and basic position for crate overlap prevention)
                            occupiedGrid.add(`${wallGridX},${wallGridY},${block.orientation}`); // Specific to wall orientation
                            occupiedGrid.add(`${wallGridX},${wallGridY}`); // General position to prevent crate overlap
                        }
                        
                        placed = true;
                        totalWallTiles += pattern.blocks.length;
                        arrangementCount++;
                    }
                    
                    attempts++;
                }
            }
            
            console.log(`Created ${totalWallTiles} wall tiles in ${arrangementCount} arrangements (target: ${targetMinTiles}-${targetMaxTiles})`);
        } catch (error) {
            console.error('Failed to create walls:', error);
        }
    }
    
    setupCollisions() {
        // Player-player collisions
        this.physics.add.collider(this.playerGroup, this.playerGroup);
        
        // Player-crate collisions (blocks movement)
        this.physics.add.collider(this.playerGroup, this.crateGroup);
        
        // Player-wall collisions (blocks movement)
        this.physics.add.collider(this.playerGroup, this.wallGroup);
        
        // Bullet-player collisions
        this.physics.add.overlap(
            this.bulletGroup,
            this.playerGroup,
            this.handleBulletHit,
            null,
            this
        );
        
        // Bullet-crate collisions
        this.physics.add.overlap(
            this.bulletGroup,
            this.crateGroup,
            this.handleBulletCrateHit,
            null,
            this
        );
        
        // Bullet-wall collisions
        this.physics.add.overlap(
            this.bulletGroup,
            this.wallGroup,
            this.handleBulletWallHit,
            null,
            this
        );
    }
    
    handleBulletHit(bulletSprite, playerSprite) {
        try {
            const bullet = bulletSprite.getData('bullet');
            const player = playerSprite.getData('player');
            
            if (!bullet || !player || bullet.isDestroyed || player.isDead) return;
            
            // Check if piercing bullet has already hit this target
            if (bullet.hasHitTarget(player)) {
                return; // Skip if already hit this player
            }
            
            if (bullet.owner !== player.playerNumber) {
                // Apply vampirism if the bullet owner has it
                const ownerStats = this.playerStats[bullet.owner - 1];
                if (ownerStats && ownerStats.vampirism > 0) {
                    const ownerPlayer = this.players[bullet.owner - 1];
                    if (ownerPlayer && !ownerPlayer.isDead) {
                        ownerPlayer.health = Math.min(
                            ownerPlayer.health + ownerStats.vampirism,
                            ownerPlayer.maxHealth
                        );
                    }
                }
                
                player.takeDamage(bullet.damage);
                
                // Emit bullet hit event for sound
                this.eventBus.emit(GameEvents.BULLET_HIT, {
                    bullet: bullet,
                    player: player,
                    position: { x: bulletSprite.x, y: bulletSprite.y }
                });
                
                // Check for explosion before destroying bullet
                const hasExplosive = bullet.stats && bullet.stats.explosive > 0;
                if (hasExplosive) {
                    const explosionLevel = bullet.stats.explosive;
                    const baseRadius = GameConfig.explosion.radius;
                    const baseDamage = GameConfig.explosion.damage;
                    
                    // Scale explosion with stack level
                    const scaledRadius = baseRadius * (1 + (explosionLevel - 1) * 0.2);
                    const scaledDamage = baseDamage * (1 + (explosionLevel - 1) * 0.3);
                    
                    this.explosionSystem.createExplosion(
                        bulletSprite.x, 
                        bulletSprite.y, 
                        scaledDamage,
                        bullet.owner,
                        scaledRadius
                    );
                }
                
                // Mark target as hit and check if bullet should be destroyed
                bullet.markTargetAsHit(player);
                if (bullet.shouldDestroyAfterHit()) {
                    bullet.destroy();
                    
                    const bulletIndex = this.bullets.indexOf(bullet);
                    if (bulletIndex > -1) {
                        this.bullets.splice(bulletIndex, 1);
                    }
                }
                
                if (player.isDead) {
                    this.onPlayerDeath(player);
                }
            }
        } catch (error) {
            console.error('Error handling bullet hit:', error);
        }
    }
    
    handleBulletCrateHit(bulletSprite, crateSprite) {
        try {
            const bullet = bulletSprite.getData('bullet');
            const crate = crateSprite.getData('crate');
            
            if (!bullet || !crate || bullet.isDestroyed || crate.isDestroyed) return;
            
            // Check if piercing bullet has already hit this crate
            if (bullet.hasHitTarget(crate)) {
                return; // Skip if already hit this crate
            }
            
            // Damage crate
            crate.takeDamage(bullet.damage);
            
            // Check for explosion before destroying bullet
            const hasExplosive = bullet.stats && bullet.stats.explosive > 0;
            if (hasExplosive) {
                const explosionLevel = bullet.stats.explosive;
                const baseRadius = GameConfig.explosion.radius;
                const baseDamage = GameConfig.explosion.damage;
                
                // Scale explosion with stack level
                const scaledRadius = baseRadius * (1 + (explosionLevel - 1) * 0.2);
                const scaledDamage = baseDamage * (1 + (explosionLevel - 1) * 0.3);
                
                this.explosionSystem.createExplosion(
                    bulletSprite.x, 
                    bulletSprite.y, 
                    scaledDamage,
                    bullet.owner,
                    scaledRadius
                );
            }
            
            // Mark target as hit and check if bullet should be destroyed
            bullet.markTargetAsHit(crate);
            if (bullet.shouldDestroyAfterHit()) {
                bullet.destroy();
                
                const bulletIndex = this.bullets.indexOf(bullet);
                if (bulletIndex > -1) {
                    this.bullets.splice(bulletIndex, 1);
                }
            }
        } catch (error) {
            console.error('Error handling bullet-crate collision:', error);
        }
    }
    
    handleBulletWallHit(bulletSprite, wallSprite) {
        try {
            const bullet = bulletSprite.getData('bullet');
            const wall = wallSprite.getData('wall');
            
            if (!bullet || !wall || bullet.isDestroyed || wall.isDestroyed) return;
            
            // Check if piercing bullet has already hit this wall
            if (bullet.hasHitTarget(wall)) {
                return; // Skip if already hit this wall
            }
            
            // Damage wall
            wall.takeDamage(bullet.damage);
            
            // Check for explosion before destroying bullet
            const hasExplosive = bullet.stats && bullet.stats.explosive > 0;
            if (hasExplosive) {
                const explosionLevel = bullet.stats.explosive;
                const baseRadius = GameConfig.explosion.radius;
                const baseDamage = GameConfig.explosion.damage;
                
                // Scale explosion with stack level
                const scaledRadius = baseRadius * (1 + (explosionLevel - 1) * 0.2);
                const scaledDamage = baseDamage * (1 + (explosionLevel - 1) * 0.3);
                
                this.explosionSystem.createExplosion(
                    bulletSprite.x, 
                    bulletSprite.y, 
                    scaledDamage,
                    bullet.owner,
                    scaledRadius
                );
            }
            
            // Mark target as hit and check if bullet should be destroyed
            bullet.markTargetAsHit(wall);
            if (bullet.shouldDestroyAfterHit()) {
                bullet.destroy();
                
                const bulletIndex = this.bullets.indexOf(bullet);
                if (bulletIndex > -1) {
                    this.bullets.splice(bulletIndex, 1);
                }
            }
        } catch (error) {
            console.error('Error handling bullet-wall collision:', error);
        }
    }
    
    setupDebugControls() {
        // Debug keyboard controls for testing
        this.input.keyboard.on('keydown-ONE', () => {
            console.log('DEBUG: Killing Player 1');
            if (this.players[0] && !this.players[0].isDead) {
                this.players[0].takeDamage(9999);
            }
        });
        
        this.input.keyboard.on('keydown-TWO', () => {
            console.log('DEBUG: Killing Player 2');
            if (this.players[1] && !this.players[1].isDead) {
                this.players[1].takeDamage(9999);
            }
        });
        
        // Additional debug controls
        this.input.keyboard.on('keydown-R', () => {
            console.log('DEBUG: Restarting round');
            this.resetRound();
        });
        
        this.input.keyboard.on('keydown-U', () => {
            console.log('DEBUG: Current upgrades:');
            this.playerStats.forEach((stats, index) => {
                console.log(`Player ${index + 1} upgrades:`, stats.upgrades);
                console.log(`Player ${index + 1} stats:`, stats.getStats());
            });
        });
        
        console.log('DEBUG CONTROLS ENABLED:');
        console.log('- Press 1: Kill Player 1');
        console.log('- Press 2: Kill Player 2');
        console.log('- Press R: Restart Round');
        console.log('- Press U: Show Upgrades');
    }
    
    createUI() {
        const centerX = this.cameras.main.width / 2;
        const textConfig = GameConfig.ui.text;
        
        this.roundText = this.add.text(centerX, textConfig.roundText.yPosition, '', textConfig.roundText);
        this.roundText.setOrigin(0.5, 0.5);
        this.roundText.setDepth(10000);
        
        this.controlsText = this.add.text(
            centerX,
            this.cameras.main.height - textConfig.controlsText.yOffset,
            'Xbox Controllers Required | LS: Move | RS: Aim | RT: Shoot | RB: Dash | LT: Slash | X: Reload',
            textConfig.controlsText
        );
        this.controlsText.setOrigin(0.5, 0.5);
        this.controlsText.setDepth(10000);
    }
    
    update(time, delta) {
        if (!this.gameState.isRoundInProgress()) return;
        
        // Skip updates during upgrade selection
        if (this.isUpgradeActive) {
            return;
        }
        
        try {
            this.players.forEach(player => player.update(delta));
            
            this.bullets = this.bullets.filter(bullet => {
                if (!bullet || bullet.isDestroyed) return false;
                bullet.update();
                return !bullet.isDestroyed;
            });
            
            // Periodically optimize bullet pool
            if (time - this.lastPoolOptimization > this.poolOptimizationInterval) {
                this.bulletPool.optimizePool();
                this.lastPoolOptimization = time;
            }
        } catch (error) {
            console.error('Error during update:', error);
        }
    }
    
    createBullet(x, y, dirX, dirY, owner, stats = null) {
        try {
            if (!this.bulletPool) {
                console.error('BulletPool not initialized yet');
                return;
            }
            
            if (!this.bulletGroup) {
                console.error('BulletGroup not initialized yet');
                return;
            }
            
            // Use bullet pool for better performance
            const bullet = this.bulletPool.getBullet(x, y, dirX, dirY, owner, stats);
            
            if (bullet && bullet.sprite) {
                this.bullets.push(bullet);
                this.bulletGroup.add(bullet.sprite);
                // Ensure velocity is maintained after adding to group
                bullet.sprite.body.setVelocity(bullet.velocity.x, bullet.velocity.y);
            } else {
                console.error('Failed to get bullet from pool or bullet has no sprite');
            }
        } catch (error) {
            console.error('Failed to create bullet:', error);
        }
    }
    
    onPlayerDeath(deadPlayer) {
        try {
            const winner = deadPlayer.playerNumber === 1 ? 2 : 1;
            const loser = deadPlayer.playerNumber;
            this.gameState.addScore(winner);
            
            console.log(`DEBUG: Showing victory animation, then upgrade selection`);
            
            // Show "Player X Wins!" animation first
            this.showVictoryAnimation(winner, () => {
                // After victory animation, start upgrade selection
                this.startUpgradeSelection(loser, winner);
            });
            
        } catch (error) {
            console.error('Error handling player death:', error);
        }
    }
    
    showVictoryAnimation(winner, onComplete) {
        // End the round state
        this.gameState.endRound();
        
        // Show victory text
        const color = winner === 1 ? '#4CAF50' : '#2196F3';
        this.roundText.setText(`Player ${winner} Wins!`);
        this.roundText.setColor(color);
        
        this.tweens.add({
            targets: this.roundText,
            scale: { from: 0, to: GameConfig.effects.roundEnd.scale },
            duration: GameConfig.effects.roundEnd.duration,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Wait a moment, then proceed to upgrades
                this.time.delayedCall(1000, () => {
                    // Hide the victory text
                    this.roundText.setScale(0);
                    onComplete();
                });
            }
        });
    }
    
    startUpgradeSelection(loser, winner) {
        console.log(`DEBUG: Starting upgrade selection - Dead player ${loser} selects first, winner ${winner} second`);
        
        // Disable game updates
        this.isUpgradeActive = true;
        
        // Launch upgrade scene with turn-based selection
        this.scene.launch('UpgradeScene', {
            playerStats: this.playerStats,
            deadPlayer: loser,
            winner: winner,
            onComplete: (selectedUpgrades) => {
                this.onUpgradesComplete(selectedUpgrades, winner);
            }
        });
    }
    
    onUpgradesComplete(selectedUpgrades, winner) {
        console.log(`DEBUG: Both players completed upgrade selection:`, selectedUpgrades);
        this.endRound(winner);
    }
    
    endRound(winner) {
        console.log('endRound called - starting new round after upgrades');
        
        // Re-enable game updates
        this.isUpgradeActive = false;
        
        // Start new round immediately (victory animation already shown)
        this.time.delayedCall(500, () => {
            this.resetRound();
        });
    }
    
    resetRound() {
        try {
            // Use bullet pool to efficiently clean up bullets
            this.bullets.forEach(bullet => {
                if (bullet && !bullet.isDestroyed) {
                    bullet.destroy();
                }
            });
            this.bullets = [];
            this.bulletGroup.clear(true, false); // Don't destroy sprites, pool will handle them
            
            // Release all bullets back to pool
            this.bulletPool.releaseAllBullets();
            
            // Reset global occupied grid
            this.globalOccupiedGrid = null;
            
            // Clear and recreate crates
            this.crates.forEach(crate => {
                if (crate && !crate.isDestroyed) {
                    crate.destroy();
                }
            });
            this.crates = [];
            this.crateGroup.clear(true, true);
            this.createCrates();
            
            // Clear and recreate walls
            this.walls.forEach(wall => {
                if (wall && !wall.isDestroyed) {
                    wall.destroy();
                }
            });
            this.walls = [];
            this.wallGroup.clear(true, true);
            this.createWalls();
            
            const width = this.cameras.main.width;
            const height = this.cameras.main.height;
            
            this.players[0].respawn(width * 0.25, height * 0.5);
            this.players[1].respawn(width * 0.75, height * 0.5);
            
            this.roundText.setText('');
            this.roundText.setScale(1);
            
            this.gameState.startNewRound();
        } catch (error) {
            console.error('Error resetting round:', error);
        }
    }
    
    destroy() {
        // Clean up players
        this.players.forEach(player => {
            if (player) player.destroy();
        });
        this.players = [];
        
        // Clean up bullets
        this.bullets.forEach(bullet => {
            if (bullet && !bullet.isDestroyed) bullet.destroy();
        });
        this.bullets = [];
        
        // Clean up physics groups
        if (this.playerGroup) {
            this.playerGroup.destroy();
            this.playerGroup = null;
        }
        
        if (this.bulletGroup) {
            this.bulletGroup.destroy();
            this.bulletGroup = null;
        }
        
        // Clean up game state manager
        if (this.gameState) {
            this.gameState.destroy();
            this.gameState = null;
        }
        
        // Clean up UI elements
        if (this.roundText) {
            this.roundText.destroy();
            this.roundText = null;
        }
        
        if (this.controlsText) {
            this.controlsText.destroy();
            this.controlsText = null;
        }
        
        // Remove gamepad listeners
        if (this.input && this.input.gamepad) {
            this.input.gamepad.removeAllListeners();
        }
        
        // Clean up systems
        if (this.bulletPool) {
            this.bulletPool.destroy();
            this.bulletPool = null;
        }
        
        if (this.collisionSystem) {
            this.collisionSystem.destroy();
            this.collisionSystem = null;
        }
        
        if (this.explosionSystem) {
            this.explosionSystem.destroy();
            this.explosionSystem = null;
        }
        
        if (this.eventBus) {
            this.eventBus.destroy();
            this.eventBus = null;
        }
        
        super.destroy();
    }
}