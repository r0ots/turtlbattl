import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Crate } from '../entities/Crate';
import { Wall } from '../entities/Wall';
import { GameConfig } from '../config/GameConfig';
import { CRATE_PATTERNS, WALL_PATTERNS } from '../config/GamePatterns';
import { GameStateManager } from '../managers/GameStateManager';
import { SoundManager } from '../managers/SoundManager';
import { EventBus } from '../events/EventBus';
import { GameEvents } from '../events/GameEvents';
import { CollisionSystem } from '../systems/CollisionSystem';
import { BulletPool } from '../systems/BulletPool';
import { PlayerStats } from '../systems/PlayerStats';
import { ExplosionSystem } from '../systems/ExplosionSystem';
import { EffectManager } from '../managers/EffectManager';
import { PatternPlacer } from '../utils/PatternPlacer';
import { DebugConfig } from '../config/DebugConfig';
import { UpgradeItems } from '../data/UpgradeItems';

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
        this.effectManager = new EffectManager(this);
        
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
        
        // Preload shaders from files
        this.load.glsl('homingShader', '/shaders/homing.glsl');
        this.load.glsl('rainbowTrail', '/shaders/rainbow-trail.glsl');
        this.load.glsl('magicParticles', '/shaders/magic-particles.glsl');
        this.load.glsl('synapticTrail', '/shaders/synaptic-trail.glsl');
        this.load.glsl('particleTrail', '/shaders/particle-trail.glsl');
        this.load.glsl('testShader', '/shaders/test-shader.glsl');
    }
    
    create() {
        try {
            // Pipeline is now registered via game config, no manual registration needed
            console.log('✅ Using RainbowTrailPipeline from game config');
            
            this.gameState = new GameStateManager(this);
            
            // Set world bounds to match the arena (with margins)
            const width = this.cameras.main.width;
            const height = this.cameras.main.height;
            const margin = GameConfig.arena.margin;
            this.physics.world.setBounds(margin, margin, width - margin * 2, height - margin * 2);
            
            this.createPhysicsGroups();
            
            // Initialize bullet pool after physics groups are ready
            this.bulletPool = new BulletPool(this);
            
            // Initialize pattern placer after scene is fully ready
            this.patternPlacer = new PatternPlacer(this);
            
            // Initialize shader system now that renderer is available
            this.effectManager.initialize();
            
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
            
            // Pass players to GameStateManager for stats tracking
            if (this.gameState) {
                this.gameState.setPlayers(this.players);
            }
            
            // Apply debug upgrades if enabled
            this.applyDebugUpgrades();
        } catch (error) {
            console.error('Failed to create players:', error);
        }
    }
    
    applyDebugUpgrades() {
        if (!DebugConfig.DEBUG_MODE) return;
        
        try {
            // Apply upgrades to Player 1
            const player1Upgrades = DebugConfig.getStartingUpgrades(1);
            if (player1Upgrades.length > 0) {
                player1Upgrades.forEach(upgradeId => {
                    // Convert upgradeId to uppercase and find the upgrade object
                    const upgradeKey = upgradeId.toUpperCase();
                    const upgrade = UpgradeItems[upgradeKey];
                    if (upgrade) {
                        this.playerStats[0].applyUpgrade(upgrade);
                    } else {
                        console.warn(`Unknown upgrade ID: ${upgradeId}`);
                    }
                });
                
                if (DebugConfig.LOG_UPGRADES) {
                    console.log('🔧 DEBUG: Player 1 starting upgrades:', player1Upgrades);
                }
            }
            
            // Apply upgrades to Player 2
            const player2Upgrades = DebugConfig.getStartingUpgrades(2);
            if (player2Upgrades.length > 0) {
                player2Upgrades.forEach(upgradeId => {
                    // Convert upgradeId to uppercase and find the upgrade object
                    const upgradeKey = upgradeId.toUpperCase();
                    const upgrade = UpgradeItems[upgradeKey];
                    if (upgrade) {
                        this.playerStats[1].applyUpgrade(upgrade);
                    } else {
                        console.warn(`Unknown upgrade ID: ${upgradeId}`);
                    }
                });
                
                if (DebugConfig.LOG_UPGRADES) {
                    console.log('🔧 DEBUG: Player 2 starting upgrades:', player2Upgrades);
                }
            }
            
            // Update UI to show new stats
            if (this.gameState) {
                this.gameState.updateStatsUI();
            }
            
            // Log current stats if enabled
            if (DebugConfig.LOG_UPGRADES && (player1Upgrades.length > 0 || player2Upgrades.length > 0)) {
                console.log('🔧 DEBUG: Player 1 stats:', this.playerStats[0].getStats());
                console.log('🔧 DEBUG: Player 2 stats:', this.playerStats[1].getStats());
            }
            
        } catch (error) {
            console.error('Failed to apply debug upgrades:', error);
        }
    }
    
    createCrates() {
        try {
            const config = GameConfig.crate;
            
            // Track occupied grid positions (shared with walls)
            const occupiedGrid = new Set();
            this.globalOccupiedGrid = occupiedGrid; // Store for wall creation
            
            // Use pattern placer to handle all placement logic
            this.patternPlacer.placePatterns({
                patterns: CRATE_PATTERNS,
                minTiles: config.minTiles,
                maxTiles: config.maxTiles,
                occupiedGrid,
                createEntity: (x, y) => new Crate(this, x, y),
                addToGroup: (crate) => {
                    this.crateGroup.add(crate.sprite, true);
                    crate.sprite.body.setSize(config.size, config.size);
                },
                entities: this.crates,
                entityType: 'crate'
            });
        } catch (error) {
            console.error('Failed to create crates:', error);
        }
    }
    
    createWalls() {
        try {
            const config = GameConfig.wall;
            
            // Use the same occupied grid from crate creation to prevent overlap
            const occupiedGrid = this.globalOccupiedGrid || new Set();
            
            // If this is the first time, mark crate positions as occupied
            if (!this.globalOccupiedGrid) {
                for (const crate of this.crates) {
                    const crateGridX = Math.floor((crate.x - this.patternPlacer.margin) / this.patternPlacer.gridSize);
                    const crateGridY = Math.floor((crate.y - this.patternPlacer.margin) / this.patternPlacer.gridSize);
                    occupiedGrid.add(`${crateGridX},${crateGridY}`);
                }
                this.globalOccupiedGrid = occupiedGrid;
            }
            
            // Use pattern placer to handle all placement logic
            this.patternPlacer.placePatterns({
                patterns: WALL_PATTERNS,
                minTiles: config.minTiles,
                maxTiles: config.maxTiles,
                occupiedGrid,
                createEntity: (x, y, orientation) => new Wall(this, x, y, orientation),
                addToGroup: (wall) => {
                    this.wallGroup.add(wall.sprite, true);
                    
                    // Set collision size based on orientation
                    if (wall.orientation === 'horizontal') {
                        wall.sprite.body.setSize(config.width, config.height);
                    } else {
                        // Vertical walls: only the right half of the grid cell
                        const halfWidth = config.width / 2;
                        wall.sprite.body.setSize(halfWidth, config.height);
                        wall.sprite.body.setOffset(halfWidth, 0);
                    }
                },
                entities: this.walls,
                entityType: 'wall'
            });
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
            
            // Check if bullet can rebound off crate
            const canRebound = bullet.maxRebounds > 0 && bullet.currentRebounds < bullet.maxRebounds;
            
            if (canRebound) {
                // Calculate bounce direction
                const crateCenterX = crateSprite.x;
                const crateCenterY = crateSprite.y;
                const bulletX = bulletSprite.x;
                const bulletY = bulletSprite.y;
                
                // Calculate relative position
                const dx = bulletX - crateCenterX;
                const dy = bulletY - crateCenterY;
                
                // Calculate bounce angle (reflect off the surface)
                const absX = Math.abs(dx);
                const absY = Math.abs(dy);
                
                // Determine which side was hit and bounce accordingly
                if (absX > absY) {
                    // Hit from left or right - bounce horizontally
                    bullet.velocity.x = -bullet.velocity.x;
                } else {
                    // Hit from top or bottom - bounce vertically
                    bullet.velocity.y = -bullet.velocity.y;
                }
                
                // Apply new velocity
                bullet.sprite.body.setVelocity(bullet.velocity.x, bullet.velocity.y);
                
                // Update rotation
                bullet.sprite.rotation = Math.atan2(bullet.velocity.y, bullet.velocity.x);
                
                // Increment rebound counter
                bullet.currentRebounds++;
                
                // Move bullet slightly away from crate to prevent multiple collisions
                const pushDistance = 8;
                const pushX = Math.sign(dx) * pushDistance;
                const pushY = Math.sign(dy) * pushDistance;
                bullet.sprite.x += pushX;
                bullet.sprite.y += pushY;
                
                // Mark this crate as hit to prevent multiple rebounds from same crate
                bullet.markTargetAsHit(crate);
                
                // Still damage the crate on bounce
                crate.takeDamage(bullet.damage);
                
            } else {
                // No rebounds left or no rebound ability - damage crate and possibly destroy bullet
                
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
            
            // Check if bullet can rebound off wall
            const canRebound = bullet.maxRebounds > 0 && bullet.currentRebounds < bullet.maxRebounds;
            
            if (canRebound) {
                // Calculate bounce direction based on wall orientation
                const wallCenterX = wallSprite.x;
                const wallCenterY = wallSprite.y;
                const bulletX = bulletSprite.x;
                const bulletY = bulletSprite.y;
                
                // Determine which side of the wall was hit
                const dx = bulletX - wallCenterX;
                const dy = bulletY - wallCenterY;
                
                // Simple bounce: reverse velocity component based on wall orientation
                if (wall.orientation === 'horizontal') {
                    // Horizontal wall - bounce vertically
                    bullet.velocity.y = -bullet.velocity.y;
                } else {
                    // Vertical wall - bounce horizontally  
                    bullet.velocity.x = -bullet.velocity.x;
                }
                
                // Apply new velocity
                bullet.sprite.body.setVelocity(bullet.velocity.x, bullet.velocity.y);
                
                // Update rotation
                bullet.sprite.rotation = Math.atan2(bullet.velocity.y, bullet.velocity.x);
                
                // Increment rebound counter
                bullet.currentRebounds++;
                
                // Move bullet slightly away from wall to prevent multiple collisions
                const pushDistance = 5;
                const pushX = Math.sign(dx) * pushDistance;
                const pushY = Math.sign(dy) * pushDistance;
                bullet.sprite.x += pushX;
                bullet.sprite.y += pushY;
                
                // Mark this wall as hit to prevent multiple rebounds from same wall
                bullet.markTargetAsHit(wall);
                
            } else {
                // No rebounds left or no rebound ability - damage wall and possibly destroy bullet
                
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
            
            // Update stats display periodically (every 500ms)
            if (!this.lastStatsUpdate || time - this.lastStatsUpdate > 500) {
                if (this.gameState) {
                    this.gameState.updateStatsUI();
                }
                this.lastStatsUpdate = time;
            }
            
            // Update shader manager
            if (this.effectManager) {
                this.effectManager.update();
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
                
                // Add flashy visual effects to bullets
                this.addBulletEffects(bullet, stats);
            } else {
                console.error('Failed to get bullet from pool or bullet has no sprite');
            }
        } catch (error) {
            console.error('Failed to create bullet:', error);
        }
    }
    
    addBulletEffects(bullet, stats) {
        if (!bullet || !bullet.sprite) return;
        
        try {
            // Special effects based on upgrades
            if (stats) {
                // Homing bullets get rainbow tint cycling
                if (stats.homing > 0) {
                    this.createHomingEffect(bullet, stats.homing);
                }
                
                // Explosive bullets get pulsing red glow
                if (stats.explosive > 0) {
                    this.createExplosiveEffect(bullet, stats.explosive);
                }
                
                // Piercing bullets get glowing outline
                if (stats.piercing > 0) {
                    this.createPiercingEffect(bullet, stats.piercing);
                }
                
                // Big bullets get size glow
                if (stats.bulletSize > GameConfig.bullet.size) {
                    bullet.sprite.setScale(bullet.sprite.scaleX * 1.2);
                    this.createGlowEffect(bullet, 0xffffff, 1.5);
                }
            }
            
        } catch (error) {
            console.error('Failed to apply bullet effects:', error);
        }
    }
    
    createHomingEffect(bullet, level) {
        // Apply shader-based homing effect for smooth visuals
        if (this.effectManager) {
            this.effectManager.addHomingEffect(bullet.sprite);
        }
    }
    
    
    
    createExplosiveEffect(bullet, level) {
        // Apply shader-based explosive effect for smooth fire/explosion visuals
        // Explosive visual effect can be added later
    }
    
    createFireParticles(bullet, level) {
        const particles = [];
        const particleCount = 6 + level * 3;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.add.graphics();
            particle.fillStyle(0xff4400, 0.8);
            particle.fillCircle(0, 0, 2 + Math.random() * 3);
            particle.setPosition(bullet.sprite.x, bullet.sprite.y);
            particle.setDepth(bullet.sprite.depth + 1);
            particles.push(particle);
        }
        
        const updateParticles = () => {
            if (bullet.isDestroyed || !bullet.sprite) {
                particles.forEach(p => p.destroy());
                return;
            }
            
            const elapsed = Date.now() / 100;
            
            particles.forEach((particle, index) => {
                const angle = (index / particles.length) * Math.PI * 2 + elapsed * 0.1;
                const radius = 15 + 8 * Math.sin(elapsed * 0.15 + index);
                const offsetX = Math.cos(angle) * radius;
                const offsetY = Math.sin(angle) * radius;
                
                particle.setPosition(
                    bullet.sprite.x + offsetX,
                    bullet.sprite.y + offsetY
                );
                
                // Flickering fire colors
                const flicker = Math.random();
                let color;
                if (flicker > 0.7) {
                    color = 0xffffff; // White hot
                } else if (flicker > 0.4) {
                    color = 0xffaa00; // Orange
                } else {
                    color = 0xff4400; // Red
                }
                
                particle.clear();
                particle.fillStyle(color, 0.6 + Math.random() * 0.4);
                const size = 2 + Math.random() * 3;
                particle.fillCircle(0, 0, size);
                
                // Flickering alpha
                particle.setAlpha(0.5 + 0.5 * Math.random());
            });
            
            setTimeout(updateParticles, 50);
        };
        updateParticles();
    }
    
    createHeatWave(bullet, level) {
        const waves = [];
        
        const createWave = () => {
            if (bullet.isDestroyed || !bullet.sprite) return;
            
            const wave = this.add.graphics();
            wave.setPosition(bullet.sprite.x, bullet.sprite.y);
            wave.setDepth(bullet.sprite.depth - 1);
            
            // Heat distortion ring
            wave.lineStyle(1, 0xff8800, 0.3);
            wave.strokeCircle(0, 0, 8);
            
            this.tweens.add({
                targets: wave,
                scaleX: 4,
                scaleY: 4,
                alpha: 0,
                duration: 800,
                ease: 'Power2',
                onComplete: () => wave.destroy()
            });
            
            // Create waves continuously
            setTimeout(createWave, 200);
        };
        
        createWave();
    }
    
    createExplosiveGlow(bullet, level) {
        // Create intense fire glow layers
        const glowLayers = [];
        const layerCount = 4 + level;
        
        for (let i = 0; i < layerCount; i++) {
            const glow = this.add.graphics();
            glow.setPosition(bullet.sprite.x, bullet.sprite.y);
            glow.setDepth(bullet.sprite.depth - 3 - i);
            
            glowLayers.push(glow);
        }
        
        const updateGlow = () => {
            if (bullet.isDestroyed || !bullet.sprite) {
                glowLayers.forEach(glow => glow.destroy());
                return;
            }
            
            const elapsed = Date.now() / 1000;
            
            glowLayers.forEach((glow, index) => {
                glow.setPosition(bullet.sprite.x, bullet.sprite.y);
                glow.clear();
                
                // Fire colors: white core, yellow, orange, red outer
                const colors = [0xffffff, 0xffff88, 0xffaa44, 0xff4400, 0x880000];
                const color = colors[Math.min(index, colors.length - 1)];
                
                // Flickering intensity
                const flicker = 0.2 + 0.15 * Math.sin(elapsed * 8 + index * 2) + Math.random() * 0.1;
                const radius = 8 + index * 4 + Math.sin(elapsed * 6 + index) * 2;
                
                glow.fillStyle(color, flicker);
                glow.fillCircle(0, 0, radius);
            });
            
            setTimeout(updateGlow, 40); // Faster flickering
        };
        updateGlow();
    }
    
    createEmberTrail(bullet, level) {
        const embers = [];
        
        const createEmber = () => {
            if (bullet.isDestroyed || !bullet.sprite) return;
            
            const ember = this.add.graphics();
            ember.setPosition(
                bullet.sprite.x + (Math.random() - 0.5) * 10,
                bullet.sprite.y + (Math.random() - 0.5) * 10
            );
            ember.setDepth(bullet.sprite.depth - 1);
            
            // Random ember color
            const colors = [0xffffff, 0xffdd00, 0xff8800, 0xff4400];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            ember.fillStyle(color, 0.8);
            ember.fillCircle(0, 0, 1 + Math.random() * 2);
            
            // Animate ember fading and falling behind
            this.tweens.add({
                targets: ember,
                x: ember.x + (Math.random() - 0.5) * 20,
                y: ember.y + (Math.random() - 0.5) * 20,
                alpha: 0,
                scaleX: 0.1,
                scaleY: 0.1,
                duration: 300 + Math.random() * 200,
                ease: 'Power2',
                onComplete: () => ember.destroy()
            });
            
            // Create more embers
            setTimeout(createEmber, 80 + Math.random() * 40);
        };
        
        createEmber();
    }
    
    createPiercingEffect(bullet, level) {
        // Apply simple tint for piercing bullets for now
        bullet.sprite.setTint(0x00ffff);
    }
    
    createGlowEffect(bullet, color, intensity) {
        // Create a larger, semi-transparent copy behind the bullet for glow
        const glow = this.add.graphics();
        glow.fillStyle(color, 0.3);
        glow.fillCircle(0, 0, bullet.bulletSize * intensity);
        glow.setPosition(bullet.sprite.x, bullet.sprite.y);
        glow.setDepth(bullet.sprite.depth - 1);
        
        // Update glow position to follow bullet
        const updateGlow = () => {
            if (bullet.isDestroyed || !bullet.sprite) {
                glow.destroy();
                return;
            }
            
            glow.setPosition(bullet.sprite.x, bullet.sprite.y);
            setTimeout(updateGlow, 16); // ~60fps
        };
        updateGlow();
    }
    
    drawStar(graphics, x, y, points, innerRadius, outerRadius) {
        const step = Math.PI / points;
        const halfStep = step / 2;
        
        graphics.beginPath();
        graphics.moveTo(x + Math.cos(-Math.PI / 2) * outerRadius, y + Math.sin(-Math.PI / 2) * outerRadius);
        
        for (let i = 0; i < points; i++) {
            const angle = -Math.PI / 2 + i * step * 2;
            
            // Outer point
            graphics.lineTo(
                x + Math.cos(angle) * outerRadius,
                y + Math.sin(angle) * outerRadius
            );
            
            // Inner point
            graphics.lineTo(
                x + Math.cos(angle + step) * innerRadius,
                y + Math.sin(angle + step) * innerRadius
            );
        }
        
        graphics.closePath();
        graphics.fillPath();
    }
    
    hsvToRgb(h, s, v) {
        let r, g, b;
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);
        
        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }
        
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
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
        
        // Update stats display after upgrades
        if (this.gameState) {
            this.gameState.updateStatsUI();
        }
        
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
            // Properly release bullets through pool system to prevent memory leaks
            this.bulletPool.releaseAllBullets();
            this.bullets = [];
            this.bulletGroup.clear(true, false); // Don't destroy sprites, pool handles them
            
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