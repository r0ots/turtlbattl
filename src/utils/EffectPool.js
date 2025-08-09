export class EffectPool {
    constructor(scene) {
        this.scene = scene;
        this.pools = {
            trail: [],
            reflect: []
        };
    }
    
    getTrailEffect() {
        try {
            let trail = this.pools.trail.find(t => !t.active);
            
            if (!trail) {
                // Create new trail effect
                const rectangle = this.scene.add.rectangle(0, 0, 40, 40, 0xFFFFFF);
                rectangle.setVisible(false);
                trail = {
                    object: rectangle,
                    active: false,
                    tween: null
                };
                this.pools.trail.push(trail);
            }
            
            return trail;
        } catch (error) {
            console.error('Error getting trail effect from pool:', error);
            // Fallback: create a temporary effect
            try {
                const rectangle = this.scene.add.rectangle(0, 0, 40, 40, 0xFFFFFF);
                rectangle.setVisible(false);
                return {
                    object: rectangle,
                    active: false,
                    tween: null
                };
            } catch (fallbackError) {
                console.error('Failed to create fallback trail effect:', fallbackError);
                return null;
            }
        }
    }
    
    getReflectEffect() {
        let reflect = this.pools.reflect.find(r => !r.active);
        
        if (!reflect) {
            // Create new reflect effect
            const circle = this.scene.add.circle(0, 0, 15, 0xFFFFFF);
            circle.setVisible(false);
            reflect = {
                object: circle,
                active: false,
                tween: null
            };
            this.pools.reflect.push(reflect);
        }
        
        return reflect;
    }
    
    releaseEffect(effect) {
        try {
            if (!effect || !effect.object) return;
            
            if (effect.tween) {
                this.scene.tweens.remove(effect.tween);
                effect.tween = null;
            }
            
            effect.active = false;
            effect.object.setVisible(false);
            effect.object.setAlpha(1);
            effect.object.setScale(1);
        } catch (error) {
            console.error('Error releasing effect:', error);
        }
    }
    
    destroy() {
        // Clean up all pooled effects
        Object.values(this.pools).forEach(pool => {
            pool.forEach(effect => {
                if (effect.tween) {
                    this.scene.tweens.remove(effect.tween);
                }
                if (effect.object) {
                    effect.object.destroy();
                }
            });
        });
        
        this.pools = { trail: [], reflect: [] };
        this.scene = null;
    }
}