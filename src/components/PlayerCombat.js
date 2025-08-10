import { GameConfig } from '../config/GameConfig';
import { GameEvents } from '../events/GameEvents';
import { CollisionSystem } from '../systems/CollisionSystem';

export class PlayerCombat {
    constructor(player) {
        this.player = player;
        this.scene = player.scene;
        this.sprite = player.sprite;
        this.eventBus = player.eventBus;
        
        // Use scene's collision system (will be created in GameScene)
        this.collisionSystem = player.scene.collisionSystem;
        
        // Combat state
        this.shootCooldown = 0;
        this.isSlashing = false;
        this.meleeCooldown = 0;
        this.slashTime = 0;
        this.slashSprite = null;
        
        // Ammo state
        this.currentAmmo = GameConfig.player.magazineSize;
        this.isReloading = false;
        this.reloadTimer = 0;
    }
    
    handleInput(gamepad) {
        let shouldShoot = false;
        
        if (gamepad && gamepad.connected) {
            try {
                // RT trigger for shooting
                shouldShoot = (gamepad.R2 && gamepad.R2 > 0.5) || 
                             (gamepad.buttons && gamepad.buttons[7]?.pressed);
                
                // LT button for melee (L2 trigger or button index 6)
                const meleePressed = (gamepad.L2 && gamepad.L2 > 0.5) || 
                                   (gamepad.buttons && gamepad.buttons[6]?.pressed);
                if (meleePressed) {
                    this.melee();
                }
            } catch (error) {
                console.warn('Combat input error:', error);
            }
        }
        
        if (shouldShoot && this.shootCooldown <= 0 && this.currentAmmo > 0 && !this.isReloading) {
            this.shoot();
        }
        
        // Auto-reload when empty and trying to shoot
        if (shouldShoot && this.currentAmmo === 0 && !this.isReloading) {
            this.reload();
        }
        
        // Manual reload on X button (button index 2)
        if (gamepad && gamepad.connected && gamepad.buttons) {
            const reloadPressed = gamepad.buttons[2]?.pressed; // X button
            if (reloadPressed && this.currentAmmo < GameConfig.player.magazineSize && !this.isReloading) {
                this.reload();
            }
        }
    }
    
    update(delta) {
        if (this.player.isDead) return;
        
        try {
            // Update cooldowns
            if (this.shootCooldown > 0) {
                this.shootCooldown -= delta;
            }
            
            if (this.meleeCooldown > 0) {
                this.meleeCooldown -= delta;
            }
            
            // Update reload timer
            if (this.isReloading) {
                this.reloadTimer -= delta;
                if (this.reloadTimer <= 0) {
                    this.currentAmmo = GameConfig.player.magazineSize;
                    this.isReloading = false;
                    
                    // Emit reload complete event
                    this.eventBus.emit(GameEvents.RELOAD_COMPLETE, {
                        player: this.player,
                        ammo: this.currentAmmo
                    });
                }
            }
            
            this.updateMelee(delta);
        } catch (error) {
            console.error('Error updating player combat:', error);
        }
    }
    
    shoot() {
        if (this.shootCooldown > 0 || this.player.isDead || !this.scene || this.currentAmmo <= 0 || this.isReloading) return;
        
        const shootDirection = this.player.movement.getShootDirection();
        
        try {
            // Decrement ammo
            this.currentAmmo--;
            
            // Emit bullet fired event
            this.eventBus.emit(GameEvents.BULLET_FIRED, {
                player: this.player,
                playerNumber: this.player.playerNumber,
                position: { x: this.sprite.x, y: this.sprite.y },
                direction: shootDirection,
                ammoRemaining: this.currentAmmo
            });
            
            this.shootCooldown = this.player.shootRate;
            
            // Auto-reload if out of ammo
            if (this.currentAmmo === 0) {
                this.reload();
            }
        } catch (error) {
            console.error('Failed to shoot:', error);
        }
    }
    
    reload() {
        if (this.isReloading || this.currentAmmo === GameConfig.player.magazineSize) return;
        
        this.isReloading = true;
        this.reloadTimer = GameConfig.player.reloadTime;
        
        // Emit reload started event
        this.eventBus.emit(GameEvents.RELOAD_STARTED, {
            player: this.player,
            reloadTime: GameConfig.player.reloadTime
        });
    }
    
    melee() {
        if (this.meleeCooldown > 0 || this.isSlashing || this.player.isDead) return;
        
        this.isSlashing = true;
        this.slashTime = GameConfig.player.melee.duration;
        this.meleeCooldown = GameConfig.player.melee.cooldown;
        
        // Emit melee attack event
        this.eventBus.emit(GameEvents.MELEE_ATTACK, {
            player: this.player,
            playerNumber: this.player.playerNumber,
            position: { x: this.sprite.x, y: this.sprite.y },
            rotation: this.sprite.rotation
        });
        
        // Create slash visual
        this.createSlashEffect();
        
        // Check for hit on other player
        this.checkMeleeHit();
        
        // Check for bullet reflection
        this.checkBulletReflection();
    }
    
    updateMelee(delta) {
        if (!this.isSlashing) return;
        
        this.slashTime -= delta;
        
        if (this.slashTime <= 0) {
            this.isSlashing = false;
            if (this.slashSprite) {
                this.slashSprite.destroy();
                this.slashSprite = null;
            }
        }
    }
    
    createSlashEffect() {
        const range = GameConfig.player.melee.range;
        const angle = this.sprite.rotation;
        
        // Create arc visual effect
        const graphics = this.scene.add.graphics();
        const color = GameConfig.player.colors[`player${this.player.playerNumber}`];
        
        graphics.fillStyle(color, 0.3);
        graphics.lineStyle(2, color, 0.8);
        
        // Draw arc sector
        const arcRadians = GameConfig.player.melee.arc * GameConfig.physics.degreesToRadians;
        graphics.beginPath();
        graphics.moveTo(this.sprite.x, this.sprite.y);
        graphics.arc(
            this.sprite.x,
            this.sprite.y,
            range,
            angle - arcRadians / 2,
            angle + arcRadians / 2,
            false
        );
        graphics.closePath();
        graphics.fillPath();
        graphics.strokePath();
        
        this.slashSprite = graphics;
        this.slashSprite.setDepth(this.sprite.depth + GameConfig.effects.slashFade.depth);
        
        // Animate the slash
        const tween = this.scene.tweens.add({
            targets: this.slashSprite,
            alpha: { from: GameConfig.effects.slashFade.alphaFrom, to: GameConfig.effects.slashFade.alphaTo },
            duration: GameConfig.player.melee.duration,
            onComplete: () => {
                if (this.slashSprite) {
                    this.slashSprite.destroy();
                    this.slashSprite = null;
                }
            }
        });
        
        // Store reference for cleanup
        if (this.player.activeEffects) {
            this.player.activeEffects.push({ object: this.slashSprite, tween: tween });
        }
    }
    
    checkMeleeHit() {
        if (!this.collisionSystem) {
            console.error('CollisionSystem not available');
            return;
        }
        
        // Check for player hits
        const nearbyPlayers = this.collisionSystem.getPlayersNearPlayer(this.player, this.scene.players);
        const hit = this.collisionSystem.checkMeleeHit(this.player, nearbyPlayers);
        
        if (hit) {
            // Apply damage
            hit.target.takeDamage(GameConfig.player.melee.damage);
            
            // Apply knockback
            hit.target.sprite.body.setVelocity(hit.knockback.x, hit.knockback.y);
            
            // Emit melee hit event
            this.eventBus.emit(GameEvents.MELEE_HIT, {
                attacker: this.player,
                target: hit.target,
                hitPoint: hit.hitPoint,
                damage: GameConfig.player.melee.damage
            });
        }
        
        // Check for crate hits
        this.checkMeleeCrateHit();
    }
    
    checkMeleeCrateHit() {
        if (!this.scene.crates) return;
        
        const meleeRange = GameConfig.player.melee.range;
        const meleeArc = GameConfig.player.melee.arc * GameConfig.physics.degreesToRadians;
        const playerX = this.sprite.x;
        const playerY = this.sprite.y;
        const playerAngle = this.sprite.rotation;
        
        for (const crate of this.scene.crates) {
            if (!crate || crate.isDestroyed) continue;
            
            const dx = crate.x - playerX;
            const dy = crate.y - playerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if crate is in range
            if (distance > meleeRange + GameConfig.crate.size / 2) continue;
            
            // Check if crate is in arc
            const angleToTarget = Math.atan2(dy, dx);
            let angleDiff = angleToTarget - playerAngle;
            
            // Normalize angle difference
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            
            if (Math.abs(angleDiff) <= meleeArc / 2) {
                // Hit the crate!
                crate.takeDamage(GameConfig.player.melee.damage);
                
                // Emit hit event for sound
                this.eventBus.emit(GameEvents.MELEE_HIT, {
                    attacker: this.player,
                    target: crate,
                    damage: GameConfig.player.melee.damage
                });
            }
        }
    }
    
    checkBulletReflection() {
        if (!this.collisionSystem) return;
        
        // Get nearby bullets first (broad-phase collision detection)
        const nearbyBullets = this.collisionSystem.getBulletsNearPlayer(this.player, this.scene.bullets);
        
        // Use optimized collision system
        const reflectedBullets = this.collisionSystem.checkBulletReflection(this.player, nearbyBullets);
        
        // Apply reflection results
        reflectedBullets.forEach(result => {
            const { bullet, newVelocity, newAngle, newOwner, reflectPosition } = result;
            
            // Update bullet properties
            bullet.owner = newOwner;
            bullet.velocity = newVelocity;
            bullet.sprite.body.setVelocity(newVelocity.x, newVelocity.y);
            bullet.sprite.rotation = newAngle;
            
            // Change bullet color to match new owner
            const color = GameConfig.bullet.colors[`player${newOwner}`];
            bullet.sprite.setTint(color);
            
            // Visual feedback for reflection
            if (this.player.createReflectEffect) {
                this.player.createReflectEffect(reflectPosition.x, reflectPosition.y);
            }
            
            // Emit bullet reflected event
            this.eventBus.emit(GameEvents.BULLET_REFLECTED, {
                reflector: this.player,
                bullet: bullet,
                newOwner: newOwner,
                position: reflectPosition
            });
        });
    }
    
    
    destroy() {
        // Clean up slash sprite
        if (this.slashSprite) {
            this.slashSprite.destroy();
            this.slashSprite = null;
        }
        
        this.player = null;
        this.scene = null;
        this.sprite = null;
    }
}