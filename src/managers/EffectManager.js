export class EffectManager {
    constructor(scene) {
        this.scene = scene;
        this.activeEffects = new Map();
        this.rainbowColors = [
            0xff0000, 0xff7700, 0xffdd00, 0x00ff00, 
            0x0099ff, 0x6633ff, 0xcc00ff
        ];
        this.initialized = false;
        this.globalColorIndex = 0;
        this.lastColorUpdate = 0;
        this.trailParticles = []; // Store all trail particles
    }
    
    initialize() {
        if (this.initialized) return;
        
        this.createParticleTextures();
        this.initialized = true;
    }
    
    createParticleTextures() {
        // Check if textures already exist
        if (this.scene.textures.exists('trail-particle')) return;
        
        const graphics = this.scene.add.graphics();
        
        // Create trail particle - soft circle
        graphics.clear();
        for (let i = 8; i >= 1; i--) {
            const alpha = Math.pow(i / 8, 2);
            graphics.fillStyle(0xffffff, alpha);
            graphics.fillCircle(8, 8, i);
        }
        graphics.generateTexture('trail-particle', 16, 16);
        
        graphics.destroy();
    }
    
    addHomingEffect(bullet) {
        if (!this.initialized) this.initialize();
        
        // Simple glow effect without constant tweening
        const glow = bullet.postFX.addGlow(0xff0000, 4, 0, false, 0.1, 24);
        
        const effects = {
            bullet: bullet,
            type: 'homing',
            glow: glow,
            lastTrailX: bullet.x,
            lastTrailY: bullet.y,
            colorIndex: 0,
            trailSprites: [] // Store trail sprites for this bullet
        };
        
        this.activeEffects.set(bullet, effects);
        
        return effects;
    }
    
    update() {
        const now = this.scene.time.now;
        
        // Update global color less frequently
        if (now - this.lastColorUpdate > 50) {
            this.globalColorIndex = (this.globalColorIndex + 1) % this.rainbowColors.length;
            this.lastColorUpdate = now;
        }
        
        const currentColor = this.rainbowColors[this.globalColorIndex];
        
        for (const [bullet, effects] of this.activeEffects) {
            if (!bullet || !bullet.active || bullet.getData('isDestroyed')) {
                this.removeEffect(bullet);
                continue;
            }
            
            // Update glow color
            if (effects.glow) {
                effects.glow.color = currentColor;
            }
            
            // Create trail sprites
            const dx = bullet.x - effects.lastTrailX;
            const dy = bullet.y - effects.lastTrailY;
            const distSq = dx * dx + dy * dy;
            
            // Only create trail if bullet has moved enough
            if (distSq > 64) { // 8 pixels squared
                // Create a trail sprite at the current position
                const trailSprite = this.scene.add.sprite(bullet.x, bullet.y, 'trail-particle');
                trailSprite.setTint(currentColor);
                trailSprite.setAlpha(0.6);
                trailSprite.setScale(0.8);
                trailSprite.setDepth(bullet.depth - 1);
                trailSprite.setBlendMode(Phaser.BlendModes.ADD);
                
                // Store reference to clean up later
                effects.trailSprites.push(trailSprite);
                this.trailParticles.push({
                    sprite: trailSprite,
                    createdAt: now,
                    lifespan: 500
                });
                
                // Fade out the trail sprite
                this.scene.tweens.add({
                    targets: trailSprite,
                    alpha: 0,
                    scale: 0.1,
                    duration: 500,
                    ease: 'Power2',
                    onComplete: () => {
                        trailSprite.destroy();
                        const index = effects.trailSprites.indexOf(trailSprite);
                        if (index > -1) {
                            effects.trailSprites.splice(index, 1);
                        }
                    }
                });
                
                effects.lastTrailX = bullet.x;
                effects.lastTrailY = bullet.y;
            }
        }
        
        // Clean up old trail particles
        this.trailParticles = this.trailParticles.filter(particle => {
            if (now - particle.createdAt > particle.lifespan) {
                if (particle.sprite && particle.sprite.active) {
                    particle.sprite.destroy();
                }
                return false;
            }
            return true;
        });
    }
    
    removeEffect(bullet) {
        const effects = this.activeEffects.get(bullet);
        if (!effects) return;
        
        // Clean up trail sprites
        if (effects.trailSprites) {
            effects.trailSprites.forEach(sprite => {
                if (sprite && sprite.active) {
                    sprite.destroy();
                }
            });
        }
        
        if (effects.glow && bullet.postFX) {
            bullet.postFX.clear();
        }
        
        this.activeEffects.delete(bullet);
    }
    
    destroy() {
        // Clean up all trail particles
        this.trailParticles.forEach(particle => {
            if (particle.sprite && particle.sprite.active) {
                particle.sprite.destroy();
            }
        });
        this.trailParticles = [];
        
        for (const [bullet] of this.activeEffects) {
            this.removeEffect(bullet);
        }
        this.activeEffects.clear();
    }
}