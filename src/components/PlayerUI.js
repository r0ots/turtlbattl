import { GameConfig } from '../config/GameConfig';
import { IsometricUtils } from '../utils/IsometricUtils';

export class PlayerUI {
    constructor(player) {
        this.player = player;
        this.scene = player.scene;
        this.sprite = player.sprite;
        
        // UI elements
        this.healthBar = null;
        this.healthBarBg = null;
        this.dashIndicator = null;
        this.meleeIndicator = null;
        this.directionIndicator = null;
        
        this.createHealthBar();
        this.createDirectionIndicator();
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
            GameConfig.player.colors[`player${this.player.playerNumber}`]
        );
        
        this.healthBarBg.setOrigin(0.5, 0.5);
        this.healthBar.setOrigin(0, 0.5);
        this.healthBar.x -= config.width / 2;
        
        // Create dash cooldown indicator
        const dashConfig = GameConfig.ui.dashIndicator;
        this.dashIndicator = this.scene.add.rectangle(
            this.sprite.x,
            this.sprite.y - config.offsetY - dashConfig.offsetY,
            config.width,
            dashConfig.height,
            dashConfig.cooldownColor
        );
        this.dashIndicator.setOrigin(0, 0.5);
        this.dashIndicator.x -= config.width / 2;
        
        // Create melee cooldown indicator
        const meleeConfig = GameConfig.ui.meleeIndicator;
        this.meleeIndicator = this.scene.add.rectangle(
            this.sprite.x,
            this.sprite.y - config.offsetY - meleeConfig.offsetY,
            config.width,
            meleeConfig.height,
            meleeConfig.cooldownColor
        );
        this.meleeIndicator.setOrigin(0, 0.5);
        this.meleeIndicator.x -= config.width / 2;
    }
    
    createDirectionIndicator() {
        // Create a triangle based on config settings
        const indicatorConfig = GameConfig.ui.directionIndicator;
        const baseColor = GameConfig.player.colors[`player${this.player.playerNumber}`];
        const darkColor = Phaser.Display.Color.GetColor(
            ((baseColor >> 16) & 0xFF) * indicatorConfig.darknessFactor,
            ((baseColor >> 8) & 0xFF) * indicatorConfig.darknessFactor,
            (baseColor & 0xFF) * indicatorConfig.darknessFactor
        );
        
        // Triangle size based on config ratio
        const triangleSize = GameConfig.player.size * indicatorConfig.sizeRatio; // 32px
        
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
    
    update() {
        if (!this.sprite) return;
        
        try {
            this.updateHealthBar();
            this.updateDirectionIndicator();
        } catch (error) {
            console.error('Error updating player UI:', error);
        }
    }
    
    updateHealthBar() {
        if (!this.healthBar || !this.healthBarBg || !this.sprite) return;
        
        const config = GameConfig.ui.healthBar;
        
        this.healthBarBg.x = this.sprite.x;
        this.healthBarBg.y = this.sprite.y - config.offsetY;
        
        this.healthBar.x = this.sprite.x - config.width / 2;
        this.healthBar.y = this.sprite.y - config.offsetY;
        
        const healthPercent = Math.max(0, Math.min(1, this.player.health / this.player.maxHealth));
        this.healthBar.scaleX = healthPercent;
        
        // Update dash indicator
        if (this.dashIndicator) {
            this.dashIndicator.x = this.sprite.x - config.width / 2;
            this.dashIndicator.y = this.sprite.y - config.offsetY - GameConfig.ui.dashIndicator.offsetY;
            
            // Show cooldown progress
            const dashPercent = Math.max(0, 1 - (this.player.movement.dashCooldown / GameConfig.player.dash.cooldown));
            this.dashIndicator.scaleX = dashPercent;
            
            // Change color based on availability
            if (this.player.movement.dashCooldown <= 0) {
                this.dashIndicator.setFillStyle(GameConfig.ui.dashIndicator.readyColor);
            } else {
                this.dashIndicator.setFillStyle(GameConfig.ui.dashIndicator.cooldownColor);
            }
        }
        
        // Update melee indicator
        if (this.meleeIndicator) {
            this.meleeIndicator.x = this.sprite.x - config.width / 2;
            this.meleeIndicator.y = this.sprite.y - config.offsetY - GameConfig.ui.meleeIndicator.offsetY;
            
            // Show cooldown progress
            const meleePercent = Math.max(0, 1 - (this.player.combat.meleeCooldown / GameConfig.player.melee.cooldown));
            this.meleeIndicator.scaleX = meleePercent;
            
            // Change color based on availability
            if (this.player.combat.meleeCooldown <= 0) {
                this.meleeIndicator.setFillStyle(GameConfig.ui.meleeIndicator.readyColor);
            } else {
                this.meleeIndicator.setFillStyle(GameConfig.ui.meleeIndicator.cooldownColor);
            }
        }
    }
    
    updateDirectionIndicator() {
        // Always update direction indicator position and rotation (it needs to follow the player)
        if (this.directionIndicator) {
            this.directionIndicator.x = this.sprite.x;
            this.directionIndicator.y = this.sprite.y;
            this.directionIndicator.rotation = this.sprite.rotation;
        }
    }
    
    updateDepth(positionChanged = false) {
        if (!this.sprite || !positionChanged) return;
        
        const depth = IsometricUtils.getDepth(this.sprite.x, this.sprite.y);
        
        if (this.healthBar) this.healthBar.setDepth(depth + 1);
        if (this.healthBarBg) this.healthBarBg.setDepth(depth);
        if (this.dashIndicator) this.dashIndicator.setDepth(depth + 2);
        if (this.meleeIndicator) this.meleeIndicator.setDepth(depth + 3);
        if (this.directionIndicator) this.directionIndicator.setDepth(depth + 5);
    }
    
    setVisible(visible) {
        if (this.healthBar) this.healthBar.setVisible(visible);
        if (this.healthBarBg) this.healthBarBg.setVisible(visible);
        if (this.dashIndicator) this.dashIndicator.setVisible(visible);
        if (this.meleeIndicator) this.meleeIndicator.setVisible(visible);
        if (this.directionIndicator) this.directionIndicator.setVisible(visible);
    }
    
    destroy() {
        if (this.healthBar) {
            this.healthBar.destroy();
            this.healthBar = null;
        }
        
        if (this.healthBarBg) {
            this.healthBarBg.destroy();
            this.healthBarBg = null;
        }
        
        if (this.dashIndicator) {
            this.dashIndicator.destroy();
            this.dashIndicator = null;
        }
        
        if (this.meleeIndicator) {
            this.meleeIndicator.destroy();
            this.meleeIndicator = null;
        }
        
        if (this.directionIndicator) {
            this.directionIndicator.clear();
            this.directionIndicator.destroy();
            this.directionIndicator = null;
        }
        
        this.player = null;
        this.scene = null;
        this.sprite = null;
    }
}