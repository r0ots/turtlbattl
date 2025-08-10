import { GameConfig } from '../config/GameConfig';

export class Crate {
    constructor(scene, x, y) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.health = 50; // Takes 2 hits to destroy
        this.isDestroyed = false;
        this.id = Math.random().toString(36).substr(2, 9); // Unique ID for hit tracking
        
        this.createSprite();
    }
    
    createSprite() {
        // Create crate sprite - let the scene add it to physics group
        this.sprite = this.scene.add.image(this.x, this.y, 'crate');
        
        // Set size and physics properties
        const crateSize = GameConfig.crate.size;
        this.sprite.setDisplaySize(crateSize, crateSize);
        
        // Store reference to this crate in sprite
        this.sprite.setData('crate', this);
        
        // Set depth based on position
        this.updateDepth();
    }
    
    takeDamage(amount) {
        if (this.isDestroyed) return;
        
        this.health -= amount;
        
        // Visual feedback - flash effect
        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
            onComplete: () => {
                if (!this.isDestroyed && this.sprite) {
                    this.sprite.setAlpha(1);
                }
            }
        });
        
        if (this.health <= 0) {
            this.destroy();
        }
    }
    
    destroy() {
        if (this.isDestroyed) return;
        
        this.isDestroyed = true;
        
        // Create destruction effect
        this.createDestructionEffect();
        
        // Play crate destruction sound if available
        if (this.scene.soundManager && this.scene.soundManager.playCrate) {
            this.scene.soundManager.playCrate();
        }
        
        // Remove from physics groups BEFORE destroying
        if (this.scene.crateGroup && this.sprite) {
            this.scene.crateGroup.remove(this.sprite, true, true);
        } else if (this.sprite) {
            // Fallback if group removal fails
            this.sprite.destroy();
        }
        
        this.sprite = null;
        
        // Remove from scene's crate list
        const index = this.scene.crates.indexOf(this);
        if (index > -1) {
            this.scene.crates.splice(index, 1);
        }
    }
    
    createDestructionEffect() {
        // Create particle/debris effect
        const particles = [];
        const particleCount = 6;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.scene.add.rectangle(
                this.x,
                this.y,
                8,
                8,
                0x8B4513 // Brown color for wood
            );
            
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 100 + Math.random() * 50;
            
            // Animate particles flying outward
            this.scene.tweens.add({
                targets: particle,
                x: particle.x + Math.cos(angle) * speed,
                y: particle.y + Math.sin(angle) * speed,
                alpha: 0,
                rotation: Math.random() * Math.PI * 2,
                duration: 500,
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
            // Use same depth calculation as players
            const depth = this.sprite.x + this.sprite.y;
            this.sprite.setDepth(depth);
        }
    }
}