import { GameConfig } from '../config/GameConfig.js';
import { GameEvents } from '../events/GameEvents.js';

export class ExplosionSystem {
    constructor(scene) {
        this.scene = scene;
    }
    
    createExplosion(x, y, damage = GameConfig.explosion.damage, owner = 0, radius = GameConfig.explosion.radius) {
        try {
            // Create visual explosion effect
            this.createExplosionEffect(x, y, radius);
            
            // Apply damage to all players and crates in range
            this.applyExplosionDamage(x, y, damage, owner, radius);
            
        } catch (error) {
            console.error('Error creating explosion:', error);
        }
    }
    
    createExplosionEffect(x, y, radius = GameConfig.explosion.radius) {
        const config = GameConfig.explosion;
        
        // Add screen flash effect
        if (this.scene.shaderManager) {
            // Note: Screen flash effects not implemented in ShaderManager yet
            // this.scene.shaderManager.createScreenFlash(0xffffff, 0.4, 150);
            // this.scene.shaderManager.createExplosionWave(x, y, radius * 2, 800);
        }
        
        // Create explosion circle
        const explosion = this.scene.add.graphics();
        explosion.setPosition(x, y);
        explosion.setDepth(1000);
        
        // Create multiple explosion layers for more dramatic effect
        const layers = [
            { color: 0xffffff, alpha: 1.0, scale: 0.3, duration: 100 },  // Bright core
            { color: 0xffaa00, alpha: 0.8, scale: 0.6, duration: 200 },  // Orange middle
            { color: 0xff4400, alpha: 0.6, scale: 1.0, duration: 300 },  // Red outer
            { color: 0x444444, alpha: 0.4, scale: 1.4, duration: 500 }   // Smoke
        ];
        
        layers.forEach((layer, index) => {
            setTimeout(() => {
                const layerGraphics = this.scene.add.graphics();
                layerGraphics.setPosition(x, y);
                layerGraphics.setDepth(1000 - index);
                
                // Fill the explosion circle
                layerGraphics.fillStyle(layer.color, layer.alpha);
                layerGraphics.fillCircle(0, 0, radius * layer.scale);
                
                // Add glow ring
                layerGraphics.lineStyle(4, layer.color, layer.alpha * 0.7);
                layerGraphics.strokeCircle(0, 0, radius * layer.scale * 1.2);
                
                // Animate this layer
                this.scene.tweens.add({
                    targets: layerGraphics,
                    scaleX: { from: 0.1, to: 1.8 },
                    scaleY: { from: 0.1, to: 1.8 },
                    alpha: { from: layer.alpha, to: 0 },
                    duration: layer.duration,
                    ease: 'Power2',
                    onComplete: () => {
                        layerGraphics.destroy();
                    }
                });
            }, index * 50); // Stagger the layers
        });
        
        // Screen shake effect
        this.scene.cameras.main.shake(200, 0.008);
        
        // Create particle effects
        this.createExplosionParticles(x, y, radius);
    }
    
    createExplosionParticles(x, y, radius) {
        // Create flying debris particles
        const particleCount = Math.floor(radius / 10) + 8;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
            const distance = radius * (0.8 + Math.random() * 0.4);
            const size = 2 + Math.random() * 4;
            
            const particle = this.scene.add.graphics();
            particle.fillStyle(0xffaa00, 0.9);
            particle.fillCircle(0, 0, size);
            particle.setPosition(x, y);
            particle.setDepth(999);
            
            // Animate particle flying outward
            this.scene.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                alpha: { from: 0.9, to: 0 },
                scaleX: { from: 1, to: 0.1 },
                scaleY: { from: 1, to: 0.1 },
                duration: 400 + Math.random() * 200,
                ease: 'Power2',
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
    }
    
    applyExplosionDamage(x, y, damage, owner, radius = GameConfig.explosion.radius) {
        
        // Damage players
        this.scene.players.forEach(player => {
            if (player && !player.isDead) {
                const distance = Math.sqrt(
                    Math.pow(player.sprite.x - x, 2) + 
                    Math.pow(player.sprite.y - y, 2)
                );
                
                if (distance <= radius) {
                    // Reduce damage based on distance (closer = more damage)
                    const damageMultiplier = Math.max(0.3, 1 - (distance / radius));
                    const finalDamage = Math.floor(damage * damageMultiplier);
                    
                    // Don't damage the owner (player who shot the explosive bullet)
                    if (player.playerNumber !== owner) {
                        player.takeDamage(finalDamage);
                        
                        // Apply knockback
                        const knockbackForce = 300 * damageMultiplier;
                        const angle = Math.atan2(player.sprite.y - y, player.sprite.x - x);
                        const knockbackX = Math.cos(angle) * knockbackForce;
                        const knockbackY = Math.sin(angle) * knockbackForce;
                        
                        player.sprite.body.setVelocity(
                            player.sprite.body.velocity.x + knockbackX,
                            player.sprite.body.velocity.y + knockbackY
                        );
                        
                        // Emit explosion hit event
                        this.scene.eventBus.emit(GameEvents.BULLET_HIT, {
                            player: player,
                            position: { x, y }
                        });
                    }
                }
            }
        });
        
        // Damage crates
        this.scene.crates.forEach(crate => {
            if (crate && !crate.isDestroyed) {
                const distance = Math.sqrt(
                    Math.pow(crate.sprite.x - x, 2) + 
                    Math.pow(crate.sprite.y - y, 2)
                );
                
                if (distance <= radius) {
                    const damageMultiplier = Math.max(0.3, 1 - (distance / radius));
                    const finalDamage = Math.floor(damage * damageMultiplier);
                    crate.takeDamage(finalDamage);
                }
            }
        });
    }
    
    destroy() {
        this.scene = null;
    }
}