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
        
        // Create trail particle - small circle
        graphics.clear();
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(4, 4, 4);
        graphics.generateTexture('trail-particle', 8, 8);
        
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
            trailEmitter: null,
            lastTrailX: bullet.x,
            lastTrailY: bullet.y,
            colorIndex: 0
        };
        
        // Create a simple particle emitter for the trail
        effects.trailEmitter = this.scene.add.particles(bullet.x, bullet.y, 'trail-particle', {
            scale: { start: 1, end: 0.2 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 400,
            frequency: 50, // Less frequent emission
            speed: 0,
            blendMode: 'ADD',
            emitting: false
        });
        
        effects.trailEmitter.setDepth(bullet.depth - 1);
        
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
            
            // Update glow color (cheap operation)
            if (effects.glow) {
                effects.glow.color = currentColor;
            }
            
            // Update trail
            const dx = bullet.x - effects.lastTrailX;
            const dy = bullet.y - effects.lastTrailY;
            const distSq = dx * dx + dy * dy;
            
            // Only emit particles if bullet has moved significantly (squared distance for performance)
            if (distSq > 100) { // 10 pixels squared
                if (effects.trailEmitter) {
                    effects.trailEmitter.setPosition(bullet.x, bullet.y);
                    effects.trailEmitter.particleTint = currentColor;
                    effects.trailEmitter.explode(1);
                }
                
                effects.lastTrailX = bullet.x;
                effects.lastTrailY = bullet.y;
            }
        }
    }
    
    removeEffect(bullet) {
        const effects = this.activeEffects.get(bullet);
        if (!effects) return;
        
        if (effects.trailEmitter) {
            effects.trailEmitter.destroy();
        }
        
        if (effects.glow && bullet.postFX) {
            bullet.postFX.clear();
        }
        
        this.activeEffects.delete(bullet);
    }
    
    destroy() {
        for (const [bullet] of this.activeEffects) {
            this.removeEffect(bullet);
        }
        this.activeEffects.clear();
    }
}