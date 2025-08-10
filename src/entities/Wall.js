import { GameConfig } from '../config/GameConfig';

export class Wall {
    constructor(scene, x, y, orientation = 'horizontal') {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.orientation = orientation; // 'horizontal' or 'vertical'
        this.health = GameConfig.wall.health; // Very high HP (5000)
        this.maxHealth = GameConfig.wall.health;
        this.isDestroyed = false;
        this.id = Math.random().toString(36).substr(2, 9); // Unique ID for hit tracking
        
        this.createSprite();
    }
    
    createSprite() {
        // Use appropriate wall image based on orientation
        const textureKey = this.orientation === 'horizontal' ? 'wall_h' : 'wall_v';
        this.sprite = this.scene.add.image(this.x, this.y, textureKey);
        
        // Set size based on orientation
        const wallWidth = GameConfig.wall.width;
        const wallHeight = GameConfig.wall.height;
        
        if (this.orientation === 'horizontal') {
            this.sprite.setDisplaySize(wallWidth, wallHeight);
        } else {
            this.sprite.setDisplaySize(wallHeight, wallWidth); // Swap for vertical
        }
        
        // Store reference to this wall in sprite
        this.sprite.setData('wall', this);
        
        // Set depth based on position
        this.updateDepth();
    }
    
    takeDamage(amount) {
        if (this.isDestroyed) return;
        
        this.health -= amount;
        
        // Visual feedback - flash effect (less intense than crates due to high HP)
        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0.8,
            duration: 50,
            yoyo: true,
            onComplete: () => {
                if (!this.isDestroyed && this.sprite) {
                    this.sprite.setAlpha(1);
                }
            }
        });
        
        // Visual health indication - get darker as health decreases
        const healthPercent = this.health / this.maxHealth;
        const tintValue = Math.floor(255 * Math.max(0.4, healthPercent)); // Never go below 40% brightness
        const tint = (tintValue << 16) | (tintValue << 8) | tintValue;
        this.sprite.setTint(tint);
        
        if (this.health <= 0) {
            this.destroy();
        }
    }
    
    destroy() {
        if (this.isDestroyed) return;
        
        this.isDestroyed = true;
        
        // Create destruction effect (larger than crates)
        this.createDestructionEffect();
        
        // Play wall destruction sound if available
        if (this.scene.soundManager && this.scene.soundManager.playWall) {
            this.scene.soundManager.playWall();
        } else if (this.scene.soundManager && this.scene.soundManager.playCrate) {
            // Fallback to crate sound
            this.scene.soundManager.playCrate();
        }
        
        // Remove from physics groups BEFORE destroying
        if (this.scene.wallGroup && this.sprite) {
            this.scene.wallGroup.remove(this.sprite, true, true);
        } else if (this.sprite) {
            // Fallback if group removal fails
            this.sprite.destroy();
        }
        
        this.sprite = null;
        
        // Remove from scene's wall list
        const index = this.scene.walls.indexOf(this);
        if (index > -1) {
            this.scene.walls.splice(index, 1);
        }
    }
    
    createDestructionEffect() {
        // Create particle/debris effect (larger than crates)
        const particles = [];
        const particleCount = 12; // More particles for walls
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.scene.add.rectangle(
                this.x,
                this.y,
                12, // Larger particles
                12,
                0x888888 // Gray color for stone/concrete
            );
            
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 120 + Math.random() * 80; // Faster particles
            
            // Animate particles flying outward
            this.scene.tweens.add({
                targets: particle,
                x: particle.x + Math.cos(angle) * speed,
                y: particle.y + Math.sin(angle) * speed,
                alpha: 0,
                rotation: Math.random() * Math.PI * 2,
                duration: 800, // Longer duration
                ease: 'Power2',
                onComplete: () => {
                    particle.destroy();
                }
            });
            
            particles.push(particle);
        }
    }
    
    updateDepth() {
        if (this.sprite) {
            // Use same depth calculation as other entities
            const depth = this.sprite.x + this.sprite.y;
            this.sprite.setDepth(depth);
        }
    }
}