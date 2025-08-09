import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Bullet } from '../entities/Bullet';
import { IsometricUtils } from '../utils/IsometricUtils';
import { GameConfig } from '../config/GameConfig';
import { GameStateManager } from '../managers/GameStateManager';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.players = [];
        this.bullets = [];
    }
    
    create() {
        try {
            this.gameState = new GameStateManager(this);
            
            this.createPhysicsGroups();
            this.createArena();
            this.createPlayers();
            this.setupCollisions();
            this.createUI();
            
            this.input.gamepad.once('connected', (pad) => {
                console.log('Gamepad connected:', pad.id);
            });
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
        
        this.roundText = this.add.text(centerX, 30, '', textConfig.roundText);
        this.roundText.setOrigin(0.5, 0.5);
        this.roundText.setDepth(10000);
        
        this.controlsText = this.add.text(
            centerX,
            GameConfig.game.height - 30,
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
        } catch (error) {
            console.error('Error during update:', error);
        }
    }
    
    createBullet(x, y, dirX, dirY, owner) {
        try {
            const bullet = new Bullet(this, x, y, dirX, dirY, owner);
            
            if (bullet.sprite) {
                this.bullets.push(bullet);
                this.bulletGroup.add(bullet.sprite);
                // Ensure velocity is maintained after adding to group
                bullet.sprite.body.setVelocity(bullet.velocity.x, bullet.velocity.y);
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
            scale: { from: 0, to: 1.5 },
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.time.delayedCall(2000, () => {
                    this.resetRound();
                });
            }
        });
    }
    
    resetRound() {
        try {
            this.bullets.forEach(bullet => {
                if (bullet && !bullet.isDestroyed) {
                    bullet.destroy();
                }
            });
            this.bullets = [];
            this.bulletGroup.clear(true, true);
            
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
}