import { GameConfig } from '../config/GameConfig';
import { GameEvents } from '../events/GameEvents';

export class PlayerMovement {
    constructor(player) {
        this.player = player;
        this.scene = player.scene;
        this.sprite = player.sprite;
        this.eventBus = player.eventBus;
        
        // Movement state
        this.moveDirection = { x: 0, y: 0 };
        this.aimDirection = { x: 0, y: 0 };
        this.lastPosition = { x: player.sprite.x, y: player.sprite.y };
        
        // Dash properties
        this.isDashing = false;
        this.dashCooldown = 0;
        this.dashDirection = { x: 0, y: 0 };
        this.dashTime = 0;
    }
    
    handleInput(gamepad) {
        this.moveDirection = { x: 0, y: 0 };
        this.aimDirection = { x: 0, y: 0 };
        
        if (gamepad && gamepad.connected) {
            try {
                this.moveDirection.x = gamepad.leftStick?.x || 0;
                this.moveDirection.y = gamepad.leftStick?.y || 0;
                
                this.aimDirection.x = gamepad.rightStick?.x || 0;
                this.aimDirection.y = gamepad.rightStick?.y || 0;
                
                // RB button for dash (button index 5)
                if (gamepad.buttons && gamepad.buttons[5]?.pressed) {
                    this.dash();
                }
            } catch (error) {
                console.warn('Movement input error:', error);
            }
        }
    }
    
    update(delta) {
        if (this.player.isDead || !this.sprite) return;
        
        try {
            this.updateMovement();
            this.constrainToArena();
            this.updateRotation();
            
            // Update position tracking
            if (this.lastPosition.x !== this.sprite.x || this.lastPosition.y !== this.sprite.y) {
                this.lastPosition = { x: this.sprite.x, y: this.sprite.y };
                return true; // Position changed
            }
            
            // Update dash
            if (this.dashCooldown > 0) {
                this.dashCooldown -= delta;
            }
            this.updateDash(delta);
            
            return false; // Position unchanged
        } catch (error) {
            console.error('Error updating player movement:', error);
            return false;
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
            moveX * this.player.speed,
            moveY * this.player.speed
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
    
    dash() {
        if (this.dashCooldown > 0 || this.isDashing || this.player.isDead) return;
        
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
        
        // Emit dash event
        this.eventBus.emit(GameEvents.PLAYER_DASH, {
            player: this.player,
            playerNumber: this.player.playerNumber,
            position: { x: this.sprite.x, y: this.sprite.y },
            direction: this.dashDirection
        });
        
        // Visual feedback - make player semi-transparent during dash
        this.sprite.setAlpha(0.7);
        
        // Add trail effect through player
        if (this.player.createDashTrail) {
            this.player.createDashTrail();
        }
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
    
    getShootDirection() {
        const length = Math.sqrt(this.aimDirection.x ** 2 + this.aimDirection.y ** 2);
        
        if (length < 0.1) {
            return { 
                x: Math.cos(this.sprite.rotation || 0), 
                y: Math.sin(this.sprite.rotation || 0) 
            };
        }
        
        return this.aimDirection;
    }
    
    destroy() {
        this.player = null;
        this.scene = null;
        this.sprite = null;
        this.moveDirection = null;
        this.aimDirection = null;
        this.dashDirection = null;
        this.lastPosition = null;
    }
}