import { IsometricUtils } from '../utils/IsometricUtils';
import { TextureFactory } from '../utils/TextureFactory';
import { GameConfig } from '../config/GameConfig';

export class Player {
    constructor(scene, x, y, playerNumber) {
        if (!scene || typeof x !== 'number' || typeof y !== 'number' || (playerNumber !== 1 && playerNumber !== 2)) {
            throw new Error('Invalid parameters for Player constructor');
        }
        
        this.scene = scene;
        this.playerNumber = playerNumber;
        this.maxHealth = GameConfig.player.maxHealth;
        this.health = this.maxHealth;
        this.speed = GameConfig.player.speed;
        this.rotationSpeed = GameConfig.player.rotationSpeed;
        this.shootCooldown = 0;
        this.shootRate = GameConfig.player.shootRate;
        this.isDead = false;
        this.lastPosition = { x, y };
        
        // Dash properties
        this.isDashing = false;
        this.dashCooldown = 0;
        this.dashDirection = { x: 0, y: 0 };
        this.dashTime = 0;
        
        // Melee properties
        this.isSlashing = false;
        this.meleeCooldown = 0;
        this.slashTime = 0;
        this.slashSprite = null;
        
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
            
            this.createHealthBar();
            this.createDirectionIndicator();
            
            this.aimDirection = { x: 1, y: 0 };
            this.moveDirection = { x: 0, y: 0 };
            
            this.gamepad = null;
            
        } catch (error) {
            console.error('Failed to create player:', error);
            throw error;
        }
    }
    
    createHealthBar() {
        const config = GameConfig.ui.healthBar;
        
        this.healthBarBg = this.scene.add.rectangle(
            this.sprite.x,
            this.sprite.y - config.offsetY,
            config.width,
            config.height,
            config.backgroundColor
        );
        
        this.healthBar = this.scene.add.rectangle(
            this.sprite.x,
            this.sprite.y - config.offsetY,
            config.width,
            config.height,
            GameConfig.player.colors[`player${this.playerNumber}`]
        );
        
        this.healthBarBg.setOrigin(0.5, 0.5);
        this.healthBar.setOrigin(0, 0.5);
        this.healthBar.x -= config.width / 2;
        
        // Create dash cooldown indicator
        this.dashIndicator = this.scene.add.rectangle(
            this.sprite.x,
            this.sprite.y - config.offsetY - 12,
            config.width,
            4,
            0xFFFFFF
        );
        this.dashIndicator.setOrigin(0, 0.5);
        this.dashIndicator.x -= config.width / 2;
        
        // Create melee cooldown indicator
        this.meleeIndicator = this.scene.add.rectangle(
            this.sprite.x,
            this.sprite.y - config.offsetY - 18,
            config.width,
            4,
            0xFFFFFF
        );
        this.meleeIndicator.setOrigin(0, 0.5);
        this.meleeIndicator.x -= config.width / 2;
    }
    
    createDirectionIndicator() {
        // Create a triangle that's 80% of the player square size
        // Darker version of player color (multiply by 0.4 for darkness)
        const baseColor = GameConfig.player.colors[`player${this.playerNumber}`];
        const darkColor = Phaser.Display.Color.GetColor(
            ((baseColor >> 16) & 0xFF) * 0.3,
            ((baseColor >> 8) & 0xFF) * 0.3,
            (baseColor & 0xFF) * 0.3
        );
        
        // Triangle 80% of player size (player is 40px, so 32px wide)
        const triangleSize = GameConfig.player.size * 0.8; // 32px
        
        // Create the triangle as a graphics object directly on the scene
        this.directionIndicator = this.scene.add.graphics();
        this.directionIndicator.fillStyle(darkColor, 1);
        
        // Draw triangle centered at origin, pointing right
        const halfWidth = triangleSize / 2;
        this.directionIndicator.beginPath();
        this.directionIndicator.moveTo(halfWidth, 0);           // Tip (pointing right)
        this.directionIndicator.lineTo(-halfWidth, -halfWidth); // Top left
        this.directionIndicator.lineTo(-halfWidth, halfWidth);  // Bottom left
        this.directionIndicator.closePath();
        this.directionIndicator.fillPath();
        
        // Position at player location
        this.directionIndicator.x = this.sprite.x;
        this.directionIndicator.y = this.sprite.y;
    }
    
    update(delta) {
        if (this.isDead || !this.sprite) return;
        
        try {
            this.handleInput();
            this.updateMovement();
            this.constrainToArena();
            this.updateRotation();
            this.updateHealthBar();
            
            if (this.lastPosition.x !== this.sprite.x || this.lastPosition.y !== this.sprite.y) {
                this.updateDepth();
                this.lastPosition = { x: this.sprite.x, y: this.sprite.y };
            }
            
            if (this.shootCooldown > 0) {
                this.shootCooldown -= delta;
            }
            
            if (this.dashCooldown > 0) {
                this.dashCooldown -= delta;
            }
            
            if (this.meleeCooldown > 0) {
                this.meleeCooldown -= delta;
            }
            
            this.updateDash(delta);
            this.updateMelee(delta);
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
        
        this.moveDirection = { x: 0, y: 0 };
        this.aimDirection = { x: 0, y: 0 };
        let shouldShoot = false;
        
        if (this.gamepad && this.gamepad.connected) {
            try {
                this.moveDirection.x = this.gamepad.leftStick?.x || 0;
                this.moveDirection.y = this.gamepad.leftStick?.y || 0;
                
                this.aimDirection.x = this.gamepad.rightStick?.x || 0;
                this.aimDirection.y = this.gamepad.rightStick?.y || 0;
                
                shouldShoot = (this.gamepad.R2 && this.gamepad.R2 > 0.5) || 
                             (this.gamepad.buttons && this.gamepad.buttons[7]?.pressed);
                
                // RB button for dash (button index 5)
                if (this.gamepad.buttons && this.gamepad.buttons[5]?.pressed) {
                    this.dash();
                }
                
                // LT button for melee (L2 trigger or button index 6)
                const meleePressed = (this.gamepad.L2 && this.gamepad.L2 > 0.5) || 
                                   (this.gamepad.buttons && this.gamepad.buttons[6]?.pressed);
                if (meleePressed) {
                    this.melee();
                }
            } catch (error) {
                console.warn('Gamepad input error:', error);
            }
        }
        
        if (shouldShoot && this.shootCooldown <= 0) {
            this.shoot();
        }
    }
    
    updateMovement() {
        if (!this.sprite?.body) return;
        
        // Don't update regular movement if dashing
        if (this.isDashing) return;
        
        // Preserve analog stick magnitude for variable speed
        let moveX = this.moveDirection.x;
        let moveY = this.moveDirection.y;
        
        // Apply deadzone to prevent drift
        const deadzone = GameConfig.player.gamepad.moveDeadzone;
        if (Math.abs(moveX) < deadzone) moveX = 0;
        if (Math.abs(moveY) < deadzone) moveY = 0;
        
        // Clamp to unit circle to prevent going too fast
        const length = Math.sqrt(moveX ** 2 + moveY ** 2);
        if (length > 1) {
            moveX /= length;
            moveY /= length;
        }
        
        this.sprite.body.setVelocity(
            moveX * this.speed,
            moveY * this.speed
        );
    }
    
    constrainToArena() {
        if (!this.sprite) return;
        
        const margin = GameConfig.arena.margin;
        const halfSize = GameConfig.player.collisionSize / 2;
        
        // Constrain X position
        const minX = margin + halfSize;
        const maxX = GameConfig.game.width - margin - halfSize;
        
        if (this.sprite.x < minX) {
            this.sprite.x = minX;
            this.sprite.body.setVelocityX(0);
        } else if (this.sprite.x > maxX) {
            this.sprite.x = maxX;
            this.sprite.body.setVelocityX(0);
        }
        
        // Constrain Y position
        const minY = margin + halfSize;
        const maxY = GameConfig.game.height - margin - halfSize;
        
        if (this.sprite.y < minY) {
            this.sprite.y = minY;
            this.sprite.body.setVelocityY(0);
        } else if (this.sprite.y > maxY) {
            this.sprite.y = maxY;
            this.sprite.body.setVelocityY(0);
        }
    }
    
    updateRotation() {
        if (!this.sprite) return;
        
        // Always update direction indicator position and rotation (it needs to follow the player)
        if (this.directionIndicator) {
            this.directionIndicator.x = this.sprite.x;
            this.directionIndicator.y = this.sprite.y;
            this.directionIndicator.rotation = this.sprite.rotation;
        }
        
        // Apply deadzone for aiming to prevent drift
        const deadzone = GameConfig.player.gamepad.aimDeadzone;
        let aimX = this.aimDirection.x;
        let aimY = this.aimDirection.y;
        
        if (Math.abs(aimX) < deadzone && Math.abs(aimY) < deadzone) {
            // Not aiming, maintain current rotation
            return;
        }
        
        const angle = Math.atan2(aimY, aimX);
        this.sprite.rotation = angle;
        
        // Update direction indicator rotation
        if (this.directionIndicator) {
            this.directionIndicator.rotation = angle;
        }
    }
    
    updateHealthBar() {
        if (!this.healthBar || !this.healthBarBg || !this.sprite) return;
        
        const config = GameConfig.ui.healthBar;
        
        this.healthBarBg.x = this.sprite.x;
        this.healthBarBg.y = this.sprite.y - config.offsetY;
        
        this.healthBar.x = this.sprite.x - config.width / 2;
        this.healthBar.y = this.sprite.y - config.offsetY;
        
        const healthPercent = Math.max(0, Math.min(1, this.health / this.maxHealth));
        this.healthBar.scaleX = healthPercent;
        
        // Update dash indicator
        if (this.dashIndicator) {
            this.dashIndicator.x = this.sprite.x - config.width / 2;
            this.dashIndicator.y = this.sprite.y - config.offsetY - 12;
            
            // Show cooldown progress
            const dashPercent = Math.max(0, 1 - (this.dashCooldown / GameConfig.player.dash.cooldown));
            this.dashIndicator.scaleX = dashPercent;
            
            // Change color based on availability
            if (this.dashCooldown <= 0) {
                this.dashIndicator.setFillStyle(0x00FF00); // Green when ready
            } else {
                this.dashIndicator.setFillStyle(0xFFFFFF); // White when on cooldown
            }
        }
        
        // Update melee indicator
        if (this.meleeIndicator) {
            this.meleeIndicator.x = this.sprite.x - config.width / 2;
            this.meleeIndicator.y = this.sprite.y - config.offsetY - 18;
            
            // Show cooldown progress
            const meleePercent = Math.max(0, 1 - (this.meleeCooldown / GameConfig.player.melee.cooldown));
            this.meleeIndicator.scaleX = meleePercent;
            
            // Change color based on availability
            if (this.meleeCooldown <= 0) {
                this.meleeIndicator.setFillStyle(0xFF6600); // Orange when ready
            } else {
                this.meleeIndicator.setFillStyle(0xFFFFFF); // White when on cooldown
            }
        }
    }
    
    updateDepth() {
        if (!this.sprite) return;
        
        const depth = IsometricUtils.getDepth(this.sprite.x, this.sprite.y);
        this.sprite.setDepth(depth);
        
        if (this.healthBar) this.healthBar.setDepth(depth + 1);
        if (this.healthBarBg) this.healthBarBg.setDepth(depth);
        if (this.dashIndicator) this.dashIndicator.setDepth(depth + 2);
        if (this.meleeIndicator) this.meleeIndicator.setDepth(depth + 3);
        if (this.directionIndicator) this.directionIndicator.setDepth(depth + 5);
    }
    
    shoot() {
        if (this.shootCooldown > 0 || this.isDead || !this.scene) return;
        
        const length = Math.sqrt(this.aimDirection.x ** 2 + this.aimDirection.y ** 2);
        let shootDirection = this.aimDirection;
        
        if (length < 0.1) {
            shootDirection = { 
                x: Math.cos(this.sprite.rotation || 0), 
                y: Math.sin(this.sprite.rotation || 0) 
            };
        }
        
        try {
            this.scene.createBullet(
                this.sprite.x,
                this.sprite.y,
                shootDirection.x,
                shootDirection.y,
                this.playerNumber
            );
            
            this.shootCooldown = this.shootRate;
        } catch (error) {
            console.error('Failed to shoot:', error);
        }
    }
    
    takeDamage(amount) {
        if (this.isDead || !this.sprite) return;
        
        this.health = Math.max(0, this.health - amount);
        
        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0.3,
            duration: 100,
            yoyo: true,
            repeat: 2
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
        
        if (this.healthBar) this.healthBar.setVisible(false);
        if (this.healthBarBg) this.healthBarBg.setVisible(false);
        if (this.dashIndicator) this.dashIndicator.setVisible(false);
        if (this.meleeIndicator) this.meleeIndicator.setVisible(false);
        if (this.directionIndicator) this.directionIndicator.setVisible(false);
        
        // Notify the scene that this player died
        if (this.scene && this.scene.onPlayerDeath) {
            this.scene.onPlayerDeath(this);
        }
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
        
        if (this.healthBar) this.healthBar.setVisible(true);
        if (this.healthBarBg) this.healthBarBg.setVisible(true);
        if (this.dashIndicator) this.dashIndicator.setVisible(true);
        if (this.meleeIndicator) this.meleeIndicator.setVisible(true);
        if (this.directionIndicator) this.directionIndicator.setVisible(true);
        
        this.lastPosition = { x, y };
    }
    
    dash() {
        if (this.dashCooldown > 0 || this.isDashing || this.isDead) return;
        
        // Get dash direction from movement or facing direction
        let dashX = this.moveDirection.x;
        let dashY = this.moveDirection.y;
        
        // If not moving, dash in facing direction
        const moveLength = Math.sqrt(dashX ** 2 + dashY ** 2);
        if (moveLength < 0.1) {
            dashX = Math.cos(this.sprite.rotation || 0);
            dashY = Math.sin(this.sprite.rotation || 0);
        } else {
            // Normalize dash direction
            dashX /= moveLength;
            dashY /= moveLength;
        }
        
        this.dashDirection = { x: dashX, y: dashY };
        this.isDashing = true;
        this.dashTime = GameConfig.player.dash.duration;
        this.dashCooldown = GameConfig.player.dash.cooldown;
        
        // Visual feedback - make player semi-transparent during dash
        this.sprite.setAlpha(0.7);
        
        // Add trail effect
        this.createDashTrail();
    }
    
    updateDash(delta) {
        if (!this.isDashing) return;
        
        this.dashTime -= delta;
        
        if (this.dashTime <= 0) {
            this.isDashing = false;
            this.sprite.setAlpha(1);
        } else {
            // Apply dash velocity
            this.sprite.body.setVelocity(
                this.dashDirection.x * GameConfig.player.dash.speed,
                this.dashDirection.y * GameConfig.player.dash.speed
            );
            
            // Still constrain to arena even while dashing
            this.constrainToArena();
        }
    }
    
    createDashTrail() {
        // Create a trail effect
        const trail = this.scene.add.rectangle(
            this.sprite.x,
            this.sprite.y,
            GameConfig.player.size,
            GameConfig.player.size,
            GameConfig.player.colors[`player${this.playerNumber}`]
        );
        trail.setAlpha(0.5);
        trail.setDepth(this.sprite.depth - 1);
        
        this.scene.tweens.add({
            targets: trail,
            alpha: 0,
            scaleX: 0.5,
            scaleY: 0.5,
            duration: 300,
            onComplete: () => trail.destroy()
        });
    }
    
    melee() {
        if (this.meleeCooldown > 0 || this.isSlashing || this.isDead) return;
        
        this.isSlashing = true;
        this.slashTime = GameConfig.player.melee.duration;
        this.meleeCooldown = GameConfig.player.melee.cooldown;
        
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
        const color = GameConfig.player.colors[`player${this.playerNumber}`];
        
        graphics.fillStyle(color, 0.3);
        graphics.lineStyle(2, color, 0.8);
        
        // Draw arc sector
        const arcRadians = (GameConfig.player.melee.arc * Math.PI) / 180;
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
        this.slashSprite.setDepth(this.sprite.depth + 10);
        
        // Animate the slash
        this.scene.tweens.add({
            targets: this.slashSprite,
            alpha: { from: 0.8, to: 0 },
            duration: GameConfig.player.melee.duration,
            onComplete: () => {
                if (this.slashSprite) {
                    this.slashSprite.destroy();
                    this.slashSprite = null;
                }
            }
        });
    }
    
    checkMeleeHit() {
        // Find the other player
        const otherPlayer = this.scene.players.find(p => p.playerNumber !== this.playerNumber);
        if (!otherPlayer || otherPlayer.isDead) return;
        
        // Get the other player's hitbox corners
        const halfSize = GameConfig.player.collisionSize / 2;
        const otherX = otherPlayer.sprite.x;
        const otherY = otherPlayer.sprite.y;
        
        // Check multiple points on the other player's hitbox
        const checkPoints = [
            { x: otherX, y: otherY },                    // Center
            { x: otherX - halfSize, y: otherY - halfSize }, // Top-left
            { x: otherX + halfSize, y: otherY - halfSize }, // Top-right
            { x: otherX - halfSize, y: otherY + halfSize }, // Bottom-left
            { x: otherX + halfSize, y: otherY + halfSize }, // Bottom-right
            { x: otherX, y: otherY - halfSize },           // Top-center
            { x: otherX, y: otherY + halfSize },           // Bottom-center
            { x: otherX - halfSize, y: otherY },           // Left-center
            { x: otherX + halfSize, y: otherY }            // Right-center
        ];
        
        const myAngle = this.sprite.rotation;
        const arcRadians = (GameConfig.player.melee.arc * Math.PI) / 180;
        const range = GameConfig.player.melee.range;
        
        // Check if any point of the player is within the slash arc
        for (const point of checkPoints) {
            const dx = point.x - this.sprite.x;
            const dy = point.y - this.sprite.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Skip if point is too far
            if (distance > range) continue;
            
            // Check angle to this point
            const angleToPoint = Math.atan2(dy, dx);
            
            // Normalize angle difference
            let angleDiff = angleToPoint - myAngle;
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            
            // If any point is within the arc, it's a hit
            if (Math.abs(angleDiff) <= arcRadians / 2) {
                // Hit!
                otherPlayer.takeDamage(GameConfig.player.melee.damage);
                
                // Knockback effect (push away from attacker)
                const knockbackForce = 200;
                const knockbackAngle = Math.atan2(otherY - this.sprite.y, otherX - this.sprite.x);
                otherPlayer.sprite.body.setVelocity(
                    Math.cos(knockbackAngle) * knockbackForce,
                    Math.sin(knockbackAngle) * knockbackForce
                );
                
                return; // Stop checking after first hit
            }
        }
    }
    
    checkBulletReflection() {
        const bullets = this.scene.bullets;
        const range = GameConfig.player.melee.range;
        const arcRadians = (GameConfig.player.melee.arc * Math.PI) / 180;
        
        bullets.forEach(bullet => {
            if (!bullet || bullet.isDestroyed || !bullet.sprite) return;
            
            // Don't reflect own bullets
            if (bullet.owner === this.playerNumber) return;
            
            // Calculate distance and angle to bullet
            const dx = bullet.sprite.x - this.sprite.x;
            const dy = bullet.sprite.y - this.sprite.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > range) return;
            
            // Check if bullet is within slash arc
            const angleToBullet = Math.atan2(dy, dx);
            const myAngle = this.sprite.rotation;
            
            // Normalize angle difference
            let angleDiff = angleToBullet - myAngle;
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            
            if (Math.abs(angleDiff) <= arcRadians / 2) {
                // Reflect the bullet!
                bullet.owner = this.playerNumber; // Change ownership
                
                // Reverse and redirect velocity
                const reflectAngle = myAngle;
                bullet.velocity = {
                    x: Math.cos(reflectAngle) * GameConfig.bullet.speed,
                    y: Math.sin(reflectAngle) * GameConfig.bullet.speed
                };
                bullet.sprite.body.setVelocity(bullet.velocity.x, bullet.velocity.y);
                bullet.sprite.rotation = reflectAngle;
                
                // Change bullet color to match new owner
                const color = GameConfig.bullet.colors[`player${this.playerNumber}`];
                bullet.sprite.setTint(color);
                
                // Visual feedback for reflection
                this.createReflectEffect(bullet.sprite.x, bullet.sprite.y);
            }
        });
    }
    
    createReflectEffect(x, y) {
        const effect = this.scene.add.circle(x, y, 15, 0xFFFFFF);
        effect.setAlpha(0.8);
        effect.setDepth(1000);
        
        this.scene.tweens.add({
            targets: effect,
            scale: { from: 0.5, to: 2 },
            alpha: { from: 0.8, to: 0 },
            duration: 200,
            onComplete: () => effect.destroy()
        });
    }
    
    destroy() {
        if (this.sprite) this.sprite.destroy();
        if (this.healthBar) this.healthBar.destroy();
        if (this.healthBarBg) this.healthBarBg.destroy();
        if (this.dashIndicator) this.dashIndicator.destroy();
        if (this.meleeIndicator) this.meleeIndicator.destroy();
        if (this.slashSprite) this.slashSprite.destroy();
        if (this.directionIndicator) this.directionIndicator.destroy();
        
        this.sprite = null;
        this.healthBar = null;
        this.healthBarBg = null;
    }
}