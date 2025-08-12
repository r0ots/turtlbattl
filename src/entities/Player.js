import { TextureFactory } from '../utils/TextureFactory';
import { GameConfig } from '../config/GameConfig';
import { EffectPool } from '../utils/EffectPool';
import { PlayerMovement } from '../components/PlayerMovement';
import { PlayerCombat } from '../components/PlayerCombat';
import { PlayerUI } from '../components/PlayerUI';
import { GameEvents } from '../events/GameEvents';

export class Player {
    constructor(scene, x, y, playerNumber, stats = null) {
        if (!scene || typeof x !== 'number' || typeof y !== 'number' || (playerNumber !== 1 && playerNumber !== 2)) {
            throw new Error('Invalid parameters for Player constructor');
        }
        
        this.scene = scene;
        this.eventBus = scene.eventBus; // Use scene's event bus
        this.playerNumber = playerNumber;
        this.stats = stats; // PlayerStats object
        
        // Use stats if provided, otherwise use defaults
        this.maxHealth = stats ? stats.maxHealth : GameConfig.player.maxHealth;
        this.health = stats ? stats.health : this.maxHealth;
        
        this.speed = stats ? stats.moveSpeed : GameConfig.player.speed;
        this.shootRate = stats ? stats.shootRate : GameConfig.player.shootRate;
        this.isDead = false;
        this.canMove = true; // Allow movement/input (can be disabled for waiting players)
        
        // Track active effects for cleanup
        this.activeEffects = [];
        
        // Initialize effect pool
        this.effectPool = new EffectPool(scene);
        
        // Regeneration timer
        this.regenTimer = 0;
        
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
            this.sprite.body.setCollideWorldBounds(true); // Enable world bounds collision
            this.sprite.body.setSize(GameConfig.player.collisionSize, GameConfig.player.collisionSize);
            
            this.sprite.setData('player', this);
            
            // Initialize components after sprite is created (decoupled)
            this.movement = new PlayerMovement(this);
            this.combat = new PlayerCombat(this);
            this.ui = new PlayerUI(this);
            
            // Setup component communication through events
            this.setupComponentCommunication();
            
            this.gamepad = null;
            
        } catch (error) {
            console.error('Failed to create player:', error);
            throw error;
        }
    }
    
    setupComponentCommunication() {
        // Components communicate through events, not direct references
        this.eventBus.on('player:request_ammo', () => {
            return this.combat ? this.combat.currentAmmo : 0;
        });
        
        this.eventBus.on('player:request_reload_status', () => {
            return this.combat ? this.combat.isReloading : false;
        });
    }
    
    update(delta) {
        if (this.isDead || !this.sprite) return;
        
        try {
            this.handleInput();
            
            // Update components
            const positionChanged = this.movement.update(delta);
            this.combat.update(delta);
            this.ui.update();
            
            // Handle regeneration
            if (this.stats && this.stats.regenRate > 0) {
                this.regenTimer += delta;
                if (this.regenTimer >= 1000) { // Every second
                    this.health = Math.min(this.health + this.stats.regenRate, this.maxHealth);
                    this.regenTimer = 0;
                }
            }
            
            // Update shield system
            this.updateShield(delta);
            
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
        if (!this.canMove) return; // Skip input if movement is disabled
        
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
        
        const depth = this.sprite.x + this.sprite.y;
        this.sprite.setDepth(depth);
    }
    
    takeDamage(amount) {
        if (this.isDead || !this.sprite) return;
        
        // Check shield first
        if (this.stats && this.stats.shield > 0 && this.stats.shieldActive) {
            // Shield blocks one hit
            this.stats.shieldActive = false;
            // Cooldown decreases with stacking: 10s, 8s, 6s, 4s, 2s (min)
            const baseCooldown = 10000;
            this.stats.shieldCooldown = Math.max(2000, baseCooldown - (this.stats.shield - 1) * 2000);
            
            // Visual shield effect
            this.createShieldEffect();
            
            return; // No damage taken
        }
        
        // Apply damage reduction from stats
        let actualDamage = amount;
        if (this.stats && this.stats.damageReduction < 1) {
            actualDamage = Math.floor(amount * this.stats.damageReduction);
        }
        
        const oldHealth = this.health;
        this.health = Math.max(0, this.health - actualDamage);
        
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
            this.movement.isDashing = false;
            this.movement.dashCooldown = 0;
        }
        
        // Reset combat state (including ammo)
        if (this.combat) {
            this.combat.currentAmmo = GameConfig.player.magazineSize;
            this.combat.isReloading = false;
            this.combat.reloadTimer = 0;
            this.combat.shootCooldown = 0;
            this.combat.meleeCooldown = 0;
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
    
    updateShield(delta) {
        if (!this.stats || this.stats.shield <= 0) return;
        
        // Reduce shield cooldown
        if (this.stats.shieldCooldown > 0) {
            this.stats.shieldCooldown -= delta;
            if (this.stats.shieldCooldown <= 0) {
                this.stats.shieldActive = true;
            }
        } else if (!this.stats.shieldActive) {
            // Shield should be active if cooldown is 0
            this.stats.shieldActive = true;
        }
    }
    
    createShieldEffect() {
        try {
            // Create visual shield effect when blocking
            const shield = this.scene.add.graphics();
            shield.setPosition(this.sprite.x, this.sprite.y);
            shield.setDepth(this.sprite.depth + 10);
            
            // Draw shield circle
            shield.lineStyle(4, 0x00FFFF, 0.8);
            shield.strokeCircle(0, 0, GameConfig.player.size);
            
            // Add sparkle effect
            shield.fillStyle(0xFFFFFF, 0.6);
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const x = Math.cos(angle) * GameConfig.player.size;
                const y = Math.sin(angle) * GameConfig.player.size;
                shield.fillCircle(x, y, 3);
            }
            
            // Animate shield
            this.scene.tweens.add({
                targets: shield,
                scaleX: { from: 0.5, to: 1.5 },
                scaleY: { from: 0.5, to: 1.5 },
                alpha: { from: 0.8, to: 0 },
                duration: 400,
                ease: 'Power2',
                onComplete: () => {
                    shield.destroy();
                }
            });
        } catch (error) {
            console.error('Error creating shield effect:', error);
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
        
        // Kill tweens only for objects this class owns
        if (this.scene && this.scene.tweens) {
            if (this.sprite) this.scene.tweens.killTweensOf(this.sprite);
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
            // Clear data instead of removeData() which doesn't exist
            this.sprite.setData('player', null);
            this.sprite.destroy();
            this.sprite = null;
        }
        
        // Clear all object references
        this.scene = null;
        this.gamepad = null;
    }
}