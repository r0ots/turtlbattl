import { GameConfig } from '../config/GameConfig';
import { GameEvents } from '../events/GameEvents';

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
        this.hitTargetsThisSlash = new Set(); // Track what we've hit this slash
        
        // Ammo state (use stats if available)
        const stats = this.player.stats;
        this.currentAmmo = stats ? stats.magazineSize : GameConfig.player.magazineSize;
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
            const maxAmmo = this.player.stats ? this.player.stats.magazineSize : GameConfig.player.magazineSize;
            if (reloadPressed && this.currentAmmo < maxAmmo && !this.isReloading) {
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
                    const maxAmmo = this.player.stats ? this.player.stats.magazineSize : GameConfig.player.magazineSize;
                    this.currentAmmo = maxAmmo;
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
        
        // Get shoot direction through event or passed parameter instead of direct access
        const shootDirection = this.getShootDirection();
        
        try {
            // Decrement ammo
            this.currentAmmo--;
            
            // Check for triple shot
            const bulletCount = this.player.stats ? this.player.stats.bulletCount : 1;
            
            if (bulletCount === 3) {
                // Triple shot - shoot 3 bullets in a spread
                const spreadAngle = 15 * Math.PI / 180; // 15 degrees in radians
                const baseAngle = Math.atan2(shootDirection.y, shootDirection.x);
                
                for (let i = -1; i <= 1; i++) {
                    const angle = baseAngle + (i * spreadAngle);
                    const dir = {
                        x: Math.cos(angle),
                        y: Math.sin(angle)
                    };
                    
                    this.eventBus.emit(GameEvents.BULLET_FIRED, {
                        player: this.player,
                        playerNumber: this.player.playerNumber,
                        position: { x: this.sprite.x, y: this.sprite.y },
                        direction: dir,
                        ammoRemaining: this.currentAmmo
                    });
                }
            } else {
                // Normal single bullet
                this.eventBus.emit(GameEvents.BULLET_FIRED, {
                    player: this.player,
                    playerNumber: this.player.playerNumber,
                    position: { x: this.sprite.x, y: this.sprite.y },
                    direction: shootDirection,
                    ammoRemaining: this.currentAmmo
                });
            }
            
            const shootRate = this.player.stats ? this.player.stats.shootRate : this.player.shootRate;
            this.shootCooldown = shootRate;
            
            // Auto-reload if out of ammo
            if (this.currentAmmo === 0) {
                this.reload();
            }
        } catch (error) {
            console.error('Failed to shoot:', error);
        }
    }
    
    reload() {
        const maxAmmo = this.player.stats ? this.player.stats.magazineSize : GameConfig.player.magazineSize;
        if (this.isReloading || this.currentAmmo === maxAmmo) return;
        
        const reloadTime = this.player.stats ? this.player.stats.reloadTime : GameConfig.player.reloadTime;
        this.isReloading = true;
        this.reloadTimer = reloadTime;
        
        // Emit reload started event
        this.eventBus.emit(GameEvents.RELOAD_STARTED, {
            player: this.player,
            reloadTime: reloadTime
        });
    }
    
    getShootDirection() {
        // Calculate shoot direction based on sprite rotation instead of accessing movement component
        const angle = this.sprite.rotation;
        return {
            x: Math.cos(angle),
            y: Math.sin(angle)
        };
    }
    
    melee() {
        if (this.meleeCooldown > 0 || this.isSlashing || this.player.isDead) return;
        
        this.isSlashing = true;
        this.slashTime = GameConfig.player.melee.duration;
        this.meleeCooldown = GameConfig.player.melee.cooldown;
        this.hitTargetsThisSlash.clear(); // Reset hit tracking for new slash
        
        // Emit melee attack event
        this.eventBus.emit(GameEvents.MELEE_ATTACK, {
            player: this.player,
            playerNumber: this.player.playerNumber,
            position: { x: this.sprite.x, y: this.sprite.y },
            rotation: this.sprite.rotation
        });
        
        // Create slash visual
        this.createSlashEffect();
        
        // Check for bullet reflection (only once at start)
        this.checkBulletReflection();
    }
    
    updateMelee(delta) {
        if (!this.isSlashing) return;
        
        this.slashTime -= delta;
        
        // Continuously check for hits during the entire slash duration
        this.checkMeleeHit();
        
        if (this.slashTime <= 0) {
            this.isSlashing = false;
            if (this.slashSprite) {
                this.slashSprite.destroy();
                this.slashSprite = null;
            }
        }
    }
    
    createSlashEffect() {
        const range = this.player.stats ? this.player.stats.meleeRange : GameConfig.player.melee.range;
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
            // Apply damage (use stats if available)
            const damage = this.player.stats ? this.player.stats.meleeDamage : GameConfig.player.melee.damage;
            hit.target.takeDamage(damage);
            
            // Apply knockback
            hit.target.sprite.body.setVelocity(hit.knockback.x, hit.knockback.y);
            
            // Emit melee hit event
            this.eventBus.emit(GameEvents.MELEE_HIT, {
                attacker: this.player,
                target: hit.target,
                hitPoint: hit.hitPoint,
                damage: damage
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
            
            // Skip if we've already hit this crate during this slash
            const crateId = crate.id || crate.sprite?.name || `${crate.x}_${crate.y}`;
            if (this.hitTargetsThisSlash.has(crateId)) continue;
            
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
                this.hitTargetsThisSlash.add(crateId); // Mark as hit this slash
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