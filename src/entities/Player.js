import { IsometricUtils } from '../utils/IsometricUtils';
import { TextureFactory } from '../utils/TextureFactory';
import { GameConfig } from '../config/GameConfig';
import { EffectPool } from '../utils/EffectPool';
import { PlayerMovement } from '../components/PlayerMovement';
import { PlayerCombat } from '../components/PlayerCombat';
import { PlayerUI } from '../components/PlayerUI';
import { GameEvents } from '../events/GameEvents';

export class Player {
    constructor(scene, x, y, playerNumber) {
        if (!scene || typeof x !== 'number' || typeof y !== 'number' || (playerNumber !== 1 && playerNumber !== 2)) {
            throw new Error('Invalid parameters for Player constructor');
        }
        
        this.scene = scene;
        this.eventBus = scene.eventBus; // Use scene's event bus
        this.playerNumber = playerNumber;
        this.maxHealth = GameConfig.player.maxHealth;
        this.health = this.maxHealth;
        this.speed = GameConfig.player.speed;
        this.shootRate = GameConfig.player.shootRate;
        this.isDead = false;
        
        // Track active effects for cleanup
        this.activeEffects = [];
        
        // Initialize effect pool
        this.effectPool = new EffectPool(scene);
        
        const color = GameConfig.player.colors[`player${playerNumber}`];
        
        try {
            this.sprite = scene.physics.add.sprite(x, y, null);
            this.sprite.setOrigin(0.5, 0.5);
            
            const textureKey = `player${playerNumber}`;
            const texture = TextureFactory.createRectangleTexture(
                scene,
                textureKey,
                GameConfig.player.size,
                GameConfig.player.size,
                color
            );
            
            if (texture) {
                this.sprite.setTexture(textureKey);
                this.sprite.setScale(1);
            }
            
            // Set collision bounds to arena area
            const margin = GameConfig.arena.margin;
            this.sprite.body.setCollideWorldBounds(false); // Disable default world bounds
            this.sprite.body.setSize(GameConfig.player.collisionSize, GameConfig.player.collisionSize);
            
            this.sprite.setData('player', this);
            
            // Initialize components after sprite is created
            this.movement = new PlayerMovement(this);
            this.combat = new PlayerCombat(this);
            this.ui = new PlayerUI(this);
            
            this.gamepad = null;
            
        } catch (error) {
            console.error('Failed to create player:', error);
            throw error;
        }
    }
    
    update(delta) {
        if (this.isDead || !this.sprite) return;
        
        try {
            this.handleInput();
            
            // Update components
            const positionChanged = this.movement.update(delta);
            this.combat.update(delta);
            this.ui.update();
            
            // Update depth if position changed
            if (positionChanged) {
                this.updateDepth();
                this.ui.updateDepth(true);
            }
        } catch (error) {
            console.error('Error updating player:', error);
        }
    }
    
    handleInput() {
        const pads = this.scene.input.gamepad?.gamepads;
        
        if (pads && pads.length > this.playerNumber - 1 && pads[this.playerNumber - 1]) {
            this.gamepad = pads[this.playerNumber - 1];
        } else {
            this.gamepad = null;
        }
        
        // Delegate input handling to components
        this.movement.handleInput(this.gamepad);
        this.combat.handleInput(this.gamepad);
    }
    
    updateDepth() {
        if (!this.sprite) return;
        
        const depth = IsometricUtils.getDepth(this.sprite.x, this.sprite.y);
        this.sprite.setDepth(depth);
    }
    
    takeDamage(amount) {
        if (this.isDead || !this.sprite) return;
        
        const oldHealth = this.health;
        this.health = Math.max(0, this.health - amount);
        
        // Emit damage taken event
        this.eventBus.emit(GameEvents.PLAYER_DAMAGE_TAKEN, {
            player: this,
            playerNumber: this.playerNumber,
            damage: amount,
            oldHealth,
            newHealth: this.health
        });
        
        // Emit health changed event
        this.eventBus.emit(GameEvents.PLAYER_HEALTH_CHANGED, {
            player: this,
            playerNumber: this.playerNumber,
            health: this.health,
            maxHealth: this.maxHealth
        });
        
        this.scene.tweens.add({
            targets: this.sprite,
            alpha: GameConfig.effects.hitFlash.alpha,
            duration: GameConfig.effects.hitFlash.duration,
            yoyo: true,
            repeat: GameConfig.effects.hitFlash.repeat
        });
        
        if (this.health <= 0) {
            this.die();
        }
    }
    
    die() {
        this.isDead = true;
        
        if (this.sprite) {
            this.sprite.setVisible(false);
            this.sprite.body.enable = false;
        }
        
        // Hide UI components
        if (this.ui) {
            this.ui.setVisible(false);
        }
        
        // Emit player death event
        this.eventBus.emit(GameEvents.PLAYER_DEATH, {
            player: this,
            playerNumber: this.playerNumber
        });
    }
    
    respawn(x, y) {
        this.isDead = false;
        this.health = this.maxHealth;
        
        if (this.sprite) {
            this.sprite.setPosition(x, y);
            this.sprite.setVisible(true);
            this.sprite.body.enable = true;
            this.sprite.setAlpha(1);
        }
        
        // Show UI components
        if (this.ui) {
            this.ui.setVisible(true);
        }
        
        // Reset movement position tracking
        if (this.movement) {
            this.movement.lastPosition = { x, y };
        }
        
        // Emit respawn event
        this.eventBus.emit(GameEvents.PLAYER_RESPAWN, {
            player: this,
            playerNumber: this.playerNumber,
            position: { x, y }
        });
        
        // Emit health changed event
        this.eventBus.emit(GameEvents.PLAYER_HEALTH_CHANGED, {
            player: this,
            playerNumber: this.playerNumber,
            health: this.health,
            maxHealth: this.maxHealth
        });
    }
    
    // Effect creation methods (called by components)
    createDashTrail() {
        try {
            // Get pooled trail effect
            const trailEffect = this.effectPool.getTrailEffect();
            if (!trailEffect) {
                console.warn('Failed to get trail effect from pool');
                return;
            }
            const trail = trailEffect.object;
            
            // Configure trail
            trail.setPosition(this.sprite.x, this.sprite.y);
            trail.setSize(GameConfig.player.size, GameConfig.player.size);
            trail.setFillStyle(GameConfig.player.colors[`player${this.playerNumber}`]);
            trail.setAlpha(GameConfig.effects.dashTrail.alpha);
            trail.setDepth(this.sprite.depth - 1);
            trail.setVisible(true);
            trailEffect.active = true;
            
            const tween = this.scene.tweens.add({
                targets: trail,
                alpha: 0,
                scaleX: GameConfig.effects.dashTrail.finalScale,
                scaleY: GameConfig.effects.dashTrail.finalScale,
                duration: GameConfig.effects.dashTrail.duration,
                onComplete: () => {
                    try {
                        this.effectPool.releaseEffect(trailEffect);
                    } catch (error) {
                        console.warn('Error releasing trail effect:', error);
                    }
                }
            });
            
            trailEffect.tween = tween;
            this.activeEffects.push(trailEffect);
        } catch (error) {
            console.error('Error creating dash trail:', error);
        }
    }
    
    createReflectEffect(x, y) {
        try {
            const config = GameConfig.effects.bulletReflect;
            
            // Get pooled reflect effect
            const reflectEffect = this.effectPool.getReflectEffect();
            if (!reflectEffect) {
                console.warn('Failed to get reflect effect from pool');
                return;
            }
            const effect = reflectEffect.object;
            
            // Configure effect
            effect.setPosition(x, y);
            effect.setRadius(config.size);
            effect.setFillStyle(config.color);
            effect.setAlpha(config.alpha);
            effect.setDepth(config.depth);
            effect.setScale(0.5);
            effect.setVisible(true);
            reflectEffect.active = true;
            
            const tween = this.scene.tweens.add({
                targets: effect,
                scale: { from: 0.5, to: config.finalScale },
                alpha: { from: config.alpha, to: 0 },
                duration: config.duration,
                onComplete: () => {
                    try {
                        this.effectPool.releaseEffect(reflectEffect);
                    } catch (error) {
                        console.warn('Error releasing reflect effect:', error);
                    }
                }
            });
            
            reflectEffect.tween = tween;
            this.activeEffects.push(reflectEffect);
        } catch (error) {
            console.error('Error creating reflect effect:', error);
        }
    }
    
    destroy() {
        // Clean up active effects
        if (this.activeEffects) {
            this.activeEffects.forEach(effect => {
                this.effectPool.releaseEffect(effect);
            });
            this.activeEffects = [];
        }
        
        // Destroy effect pool
        if (this.effectPool) {
            this.effectPool.destroy();
            this.effectPool = null;
        }
        
        // Kill all tweens first (before destroying objects)
        if (this.scene && this.scene.tweens) {
            // Kill tweens for all possible targets
            if (this.sprite) this.scene.tweens.killTweensOf(this.sprite);
            if (this.slashSprite) this.scene.tweens.killTweensOf(this.slashSprite);
            if (this.healthBar) this.scene.tweens.killTweensOf(this.healthBar);
            if (this.healthBarBg) this.scene.tweens.killTweensOf(this.healthBarBg);
            if (this.dashIndicator) this.scene.tweens.killTweensOf(this.dashIndicator);
            if (this.meleeIndicator) this.scene.tweens.killTweensOf(this.meleeIndicator);
            if (this.directionIndicator) this.scene.tweens.killTweensOf(this.directionIndicator);
        }
        
        // Destroy components
        if (this.movement) {
            this.movement.destroy();
            this.movement = null;
        }
        
        if (this.combat) {
            this.combat.destroy();
            this.combat = null;
        }
        
        if (this.ui) {
            this.ui.destroy();
            this.ui = null;
        }
        
        // Destroy main sprite
        if (this.sprite) {
            this.sprite.removeAllListeners();
            this.sprite.removeData();
            this.sprite.destroy();
            this.sprite = null;
        }
        
        // Clear all object references
        this.scene = null;
        this.gamepad = null;
    }
}