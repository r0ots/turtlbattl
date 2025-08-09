import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Bullet } from '../entities/Bullet';
import { IsometricUtils } from '../utils/IsometricUtils';
import { GameConfig } from '../config/GameConfig';
import { GameStateManager } from '../managers/GameStateManager';
import { EventBus } from '../events/EventBus';
import { GameEvents } from '../events/GameEvents';
import { CollisionSystem } from '../systems/CollisionSystem';
import { BulletPool } from '../systems/BulletPool';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.players = [];
        this.bullets = [];
        
        // Performance tracking
        this.lastPoolOptimization = 0;
        this.poolOptimizationInterval = 5000; // Optimize every 5 seconds
        
        // Initialize systems
        this.eventBus = new EventBus();
        this.collisionSystem = new CollisionSystem(this);
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Player events
        this.eventBus.on(GameEvents.PLAYER_DEATH, (data) => this.onPlayerDeath(data.player));
        this.eventBus.on(GameEvents.BULLET_FIRED, (data) => this.createBullet(
            data.position.x, 
            data.position.y, 
            data.direction.x, 
            data.direction.y, 
            data.playerNumber
        ));
    }
    
    create() {
        try {
            this.gameState = new GameStateManager(this);
            
            this.createPhysicsGroups();
            
            // Initialize bullet pool after physics groups are ready
            this.bulletPool = new BulletPool(this);
            
            this.createArena();
            this.createPlayers();
            this.setupCollisions();
            this.createUI();
            
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
    }
    
    createArena() {
        const graphics = this.add.graphics();
        const config = GameConfig.arena;
        
        graphics.lineStyle(3, config.borderColor, 1);
        graphics.strokeRect(
            config.margin,
            config.margin,
            GameConfig.game.width - config.margin * 2,
            GameConfig.game.height - config.margin * 2
        );
        
        graphics.lineStyle(1, config.gridColor, 0.3);
        for (let x = config.margin; x < GameConfig.game.width - config.margin; x += config.gridSize) {
            graphics.moveTo(x, config.margin);
            graphics.lineTo(x, GameConfig.game.height - config.margin);
        }
        for (let y = config.margin; y < GameConfig.game.height - config.margin; y += config.gridSize) {
            graphics.moveTo(config.margin, y);
            graphics.lineTo(GameConfig.game.width - config.margin, y);
        }
        graphics.strokePath();
    }
    
    createPlayers() {
        try {
            const spawn1 = GameConfig.player.spawnPositions.player1;
            const spawn2 = GameConfig.player.spawnPositions.player2;
            
            const player1 = new Player(this, spawn1.x, spawn1.y, 1);
            const player2 = new Player(this, spawn2.x, spawn2.y, 2);
            
            this.players = [player1, player2];
            
            this.playerGroup.add(player1.sprite);
            this.playerGroup.add(player2.sprite);
        } catch (error) {
            console.error('Failed to create players:', error);
        }
    }
    
    setupCollisions() {
        this.physics.add.collider(this.playerGroup, this.playerGroup);
        
        this.physics.add.overlap(
            this.bulletGroup,
            this.playerGroup,
            this.handleBulletHit,
            null,
            this
        );
    }
    
    handleBulletHit(bulletSprite, playerSprite) {
        try {
            const bullet = bulletSprite.getData('bullet');
            const player = playerSprite.getData('player');
            
            if (!bullet || !player || bullet.isDestroyed || player.isDead) return;
            
            if (bullet.owner !== player.playerNumber) {
                player.takeDamage(bullet.damage);
                bullet.destroy();
                
                const bulletIndex = this.bullets.indexOf(bullet);
                if (bulletIndex > -1) {
                    this.bullets.splice(bulletIndex, 1);
                }
                
                if (player.isDead) {
                    this.onPlayerDeath(player);
                }
            }
        } catch (error) {
            console.error('Error handling bullet hit:', error);
        }
    }
    
    createUI() {
        const centerX = GameConfig.game.width / 2;
        const textConfig = GameConfig.ui.text;
        
        this.roundText = this.add.text(centerX, textConfig.roundText.yPosition, '', textConfig.roundText);
        this.roundText.setOrigin(0.5, 0.5);
        this.roundText.setDepth(10000);
        
        this.controlsText = this.add.text(
            centerX,
            GameConfig.game.height - textConfig.controlsText.yOffset,
            'Xbox Controllers Required | LS: Move | RS: Aim | RT: Shoot | RB: Dash | LT: Slash',
            textConfig.controlsText
        );
        this.controlsText.setOrigin(0.5, 0.5);
        this.controlsText.setDepth(10000);
    }
    
    update(time, delta) {
        if (!this.gameState.isRoundInProgress()) return;
        
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
    
    createBullet(x, y, dirX, dirY, owner) {
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
            const bullet = this.bulletPool.getBullet(x, y, dirX, dirY, owner);
            
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
            this.gameState.addScore(winner);
            this.endRound(winner);
        } catch (error) {
            console.error('Error handling player death:', error);
        }
    }
    
    endRound(winner) {
        this.gameState.endRound();
        
        const color = winner === 1 ? '#4CAF50' : '#2196F3';
        this.roundText.setText(`Player ${winner} Wins!`);
        this.roundText.setColor(color);
        
        this.tweens.add({
            targets: this.roundText,
            scale: { from: 0, to: GameConfig.effects.roundEnd.scale },
            duration: GameConfig.effects.roundEnd.duration,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.time.delayedCall(GameConfig.effects.roundEnd.delay, () => {
                    this.resetRound();
                });
            }
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
            
            const spawn1 = GameConfig.player.spawnPositions.player1;
            const spawn2 = GameConfig.player.spawnPositions.player2;
            
            this.players[0].respawn(spawn1.x, spawn1.y);
            this.players[1].respawn(spawn2.x, spawn2.y);
            
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
        
        if (this.eventBus) {
            this.eventBus.destroy();
            this.eventBus = null;
        }
        
        super.destroy();
    }
}