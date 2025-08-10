import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Bullet } from '../entities/Bullet';
import { Crate } from '../entities/Crate';
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
        this.eventBus.on(GameEvents.PLAYER_DAMAGE_TAKEN, () => this.soundManager.playDamage());
        this.eventBus.on(GameEvents.PLAYER_DASH, () => this.soundManager.playDash());
    }
    
    preload() {
        // Load all sound assets
        this.soundManager.preload();
        
        // Load crate image
        this.load.image('crate', '/pictures/crate.png');
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
            const arenaWidth = width - (GameConfig.arena.margin * 2);
            const arenaHeight = height - (GameConfig.arena.margin * 2);
            
            // Random number of crates
            const crateCount = Math.floor(Math.random() * (config.maxCrates - config.minCrates + 1)) + config.minCrates;
            
            // Player spawn positions to avoid (use dynamic positions)
            const playerSpawns = [
                { x: width * 0.25, y: height * 0.5 },
                { x: width * 0.75, y: height * 0.5 }
            ];
            
            for (let i = 0; i < crateCount; i++) {
                let validPosition = false;
                let x, y;
                let attempts = 0;
                
                // Try to find a valid position
                while (!validPosition && attempts < 50) {
                    x = GameConfig.arena.margin + config.spawnMargin + 
                        Math.random() * (arenaWidth - config.spawnMargin * 2);
                    y = GameConfig.arena.margin + config.spawnMargin + 
                        Math.random() * (arenaHeight - config.spawnMargin * 2);
                    
                    validPosition = true;
                    
                    // Check distance from player spawns
                    for (const spawn of playerSpawns) {
                        const dist = Math.sqrt(
                            Math.pow(x - spawn.x, 2) + Math.pow(y - spawn.y, 2)
                        );
                        if (dist < config.minDistanceFromPlayer) {
                            validPosition = false;
                            break;
                        }
                    }
                    
                    // Check distance from other crates
                    for (const crate of this.crates) {
                        const dist = Math.sqrt(
                            Math.pow(x - crate.x, 2) + Math.pow(y - crate.y, 2)
                        );
                        if (dist < config.size * 1.5) {
                            validPosition = false;
                            break;
                        }
                    }
                    
                    attempts++;
                }
                
                if (validPosition) {
                    const crate = new Crate(this, x, y);
                    this.crates.push(crate);
                    // Add to static group and set proper physics body
                    this.crateGroup.add(crate.sprite, true);
                    // Set the collision box size
                    crate.sprite.body.setSize(GameConfig.crate.size, GameConfig.crate.size);
                }
            }
            
            console.log(`Created ${this.crates.length} crates`);
        } catch (error) {
            console.error('Failed to create crates:', error);
        }
    }
    
    setupCollisions() {
        // Player-player collisions
        this.physics.add.collider(this.playerGroup, this.playerGroup);
        
        // Player-crate collisions (blocks movement)
        this.physics.add.collider(this.playerGroup, this.crateGroup);
        
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
            
            // Clear and recreate crates
            this.crates.forEach(crate => {
                if (crate && !crate.isDestroyed) {
                    crate.destroy();
                }
            });
            this.crates = [];
            this.crateGroup.clear(true, true);
            this.createCrates();
            
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