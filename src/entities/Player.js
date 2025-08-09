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
            
            this.sprite.setCollideWorldBounds(true);
            this.sprite.body.setSize(GameConfig.player.collisionSize, GameConfig.player.collisionSize);
            
            this.sprite.setData('player', this);
            
            this.createHealthBar();
            
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
    }
    
    update(delta) {
        if (this.isDead || !this.sprite) return;
        
        try {
            this.handleInput();
            this.updateMovement();
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
            
            this.updateDash(delta);
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
    
    updateRotation() {
        if (!this.sprite) return;
        
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
    }
    
    updateDepth() {
        if (!this.sprite) return;
        
        const depth = IsometricUtils.getDepth(this.sprite.x, this.sprite.y);
        this.sprite.setDepth(depth);
        
        if (this.healthBar) this.healthBar.setDepth(depth + 1);
        if (this.healthBarBg) this.healthBarBg.setDepth(depth);
        if (this.dashIndicator) this.dashIndicator.setDepth(depth + 2);
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
    
    destroy() {
        if (this.sprite) this.sprite.destroy();
        if (this.healthBar) this.healthBar.destroy();
        if (this.healthBarBg) this.healthBarBg.destroy();
        if (this.dashIndicator) this.dashIndicator.destroy();
        
        this.sprite = null;
        this.healthBar = null;
        this.healthBarBg = null;
    }
}