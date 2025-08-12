import { GameConfig } from '../config/GameConfig';

/**
 * Factory for creating bullet visual effects
 * Handles the visual aspects of bullet upgrades
 */
export class BulletEffectFactory {
    constructor(scene, effectManager) {
        this.scene = scene;
        this.effectManager = effectManager;
    }
    
    /**
     * Apply all visual effects to a bullet based on its stats
     */
    applyEffects(bullet, stats) {
        if (!stats) return;
        
        // Apply effects based on stats
        if (stats.homing > 0) {
            this.applyHomingEffect(bullet, stats.homing);
        }
        
        if (stats.explosive > 0) {
            this.applyExplosiveEffect(bullet, stats.explosive);
        }
        
        if (stats.piercing > 0) {
            this.applyPiercingEffect(bullet, stats.piercing);
        }
        
        if (stats.bulletSize > GameConfig.bullet.size) {
            bullet.sprite.setScale(bullet.sprite.scaleX * 1.2);
            this.applyBigBulletEffect(bullet, stats.bulletSize);
        }
    }
    
    applyHomingEffect(bullet, level) {
        // Use the effect manager for rainbow trail
        if (this.effectManager) {
            this.effectManager.addHomingEffect(bullet.sprite);
        }
    }
    
    applyExplosiveEffect(bullet, level) {
        // Explosive visual effect - to be implemented later
        // Could add fire particles, red glow, etc.
    }
    
    applyPiercingEffect(bullet, level) {
        // Simple cyan tint for piercing bullets
        bullet.sprite.setTint(0x00ffff);
    }
    
    applyBigBulletEffect(bullet, level) {
        // Create a glow effect for big bullets
        this.createGlowEffect(bullet, 0xffffff, 1.5);
    }
    
    createGlowEffect(bullet, color, intensity) {
        // Create a larger, semi-transparent copy behind the bullet for glow
        const glow = this.scene.add.graphics();
        glow.fillStyle(color, 0.3);
        glow.fillCircle(0, 0, bullet.bulletSize * intensity);
        glow.setPosition(bullet.sprite.x, bullet.sprite.y);
        glow.setDepth(bullet.sprite.depth - 1);
        
        // Update glow position to follow bullet
        const updateGlow = () => {
            if (bullet.isDestroyed || !bullet.sprite) {
                glow.destroy();
                return;
            }
            
            glow.setPosition(bullet.sprite.x, bullet.sprite.y);
            setTimeout(updateGlow, 16); // ~60fps
        };
        updateGlow();
    }
}