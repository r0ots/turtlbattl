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
        
        // Create explosion circle
        const explosion = this.scene.add.graphics();
        explosion.setPosition(x, y);
        explosion.setDepth(1000);
        
        // Initial explosion flash
        explosion.fillStyle(config.color, 0.8);
        explosion.fillCircle(0, 0, radius * 0.4);
        
        // Expanding ring effect
        explosion.lineStyle(8, config.color, 0.6);
        explosion.strokeCircle(0, 0, radius * 0.7);
        
        // Animate explosion
        this.scene.tweens.add({
            targets: explosion,
            scaleX: { from: 0.1, to: 1.5 },
            scaleY: { from: 0.1, to: 1.5 },
            alpha: { from: 0.8, to: 0 },
            duration: config.duration,
            ease: 'Power2',
            onComplete: () => {
                explosion.destroy();
            }
        });
        
        // Add screen shake effect
        this.scene.cameras.main.shake(200, 0.01);
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