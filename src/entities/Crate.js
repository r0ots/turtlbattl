import { GameConfig } from '../config/GameConfig';

export class Crate {
    constructor(scene, x, y, isExplosive) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.health = 50; // Takes 2 hits to destroy
        this.isDestroyed = false;
        this.id = Math.random().toString(36).substr(2, 9); // Unique ID for hit tracking
        
        // 10% chance to be explosive (ignore parameter since it's coming from PatternPlacer orientation)
        this.isExplosive = Math.random() < 0.1;
        
        // Debug: Log when explosive crate is created
        if (this.isExplosive) {
            console.log('💣 Explosive crate created at', x, y);
        }
        
        this.createSprite();
    }
    
    createSprite() {
        // Create crate sprite - let the scene add it to physics group
        this.sprite = this.scene.add.image(this.x, this.y, 'crate');
        
        // Set size and physics properties
        const crateSize = GameConfig.crate.size;
        this.sprite.setDisplaySize(crateSize, crateSize);
        
        // Make explosive crates red
        if (this.isExplosive) {
            this.sprite.setTint(0xff3333);  // Bright red tint
        }
        
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
        
        // If explosive crate, create explosion that damages nearby players
        if (this.isExplosive) {
            this.createExplosion();
        } else {
            // Regular destruction effect for normal crates
            this.createDestructionEffect();
        }
        
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
    
    createExplosion() {
        const explosionRadius = 150;
        const explosionDamage = 40;
        
        // Create visual explosion effect
        // Main explosion flash
        const flash = this.scene.add.circle(this.x, this.y, 10, 0xffff00, 1);
        flash.setDepth(1000);
        
        // Expand and fade the flash
        this.scene.tweens.add({
            targets: flash,
            scale: explosionRadius / 10,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => flash.destroy()
        });
        
        // Create fire ring
        const ring = this.scene.add.circle(this.x, this.y, 20, 0xff4400, 0.8);
        ring.setDepth(999);
        
        this.scene.tweens.add({
            targets: ring,
            scale: explosionRadius / 20,
            alpha: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: () => ring.destroy()
        });
        
        // Create debris particles with fire colors
        const particleCount = 12;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 150 + Math.random() * 100;
            
            // Fire colored particles
            const colors = [0xff0000, 0xff4400, 0xff8800, 0xffaa00, 0xffff00];
            const particle = this.scene.add.circle(
                this.x,
                this.y,
                4 + Math.random() * 4,
                Phaser.Math.RND.pick(colors),
                1
            );
            
            particle.setDepth(998);
            
            // Animate particles flying outward
            this.scene.tweens.add({
                targets: particle,
                x: particle.x + Math.cos(angle) * speed,
                y: particle.y + Math.sin(angle) * speed,
                scale: 0,
                alpha: 0,
                duration: 600 + Math.random() * 200,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
        
        // Damage nearby players
        if (this.scene.players) {
            this.scene.players.forEach(player => {
                if (player && !player.isDead) {
                    const distance = Phaser.Math.Distance.Between(
                        this.x, this.y,
                        player.sprite.x, player.sprite.y
                    );
                    
                    if (distance <= explosionRadius) {
                        // Damage falls off with distance
                        const damageMultiplier = 1 - (distance / explosionRadius);
                        const finalDamage = Math.floor(explosionDamage * damageMultiplier);
                        
                        if (finalDamage > 0) {
                            player.takeDamage(finalDamage);
                            
                            // Knockback effect
                            const knockbackAngle = Math.atan2(
                                player.sprite.y - this.y,
                                player.sprite.x - this.x
                            );
                            const knockbackForce = 200 * damageMultiplier;
                            
                            if (player.sprite.body) {
                                player.sprite.body.setVelocity(
                                    Math.cos(knockbackAngle) * knockbackForce,
                                    Math.sin(knockbackAngle) * knockbackForce
                                );
                            }
                        }
                    }
                }
            });
        }
        
        // Play explosion sound if available
        if (this.scene.soundManager && this.scene.soundManager.playExplosion) {
            this.scene.soundManager.playExplosion();
        }
        
        // Camera shake for explosion
        this.scene.cameras.main.shake(200, 0.01);
    }
    
    updateDepth() {
        if (this.sprite) {
            // Use same depth calculation as players
            const depth = this.sprite.x + this.sprite.y;
            this.sprite.setDepth(depth);
        }
    }
}