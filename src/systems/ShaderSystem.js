import { GameConfig } from '../config/GameConfig';

export class ShaderSystem {
    constructor(scene) {
        this.scene = scene;
        this.shaders = new Map();
        this.activeEffects = [];
        
        this.createShaders();
    }
    
    createShaders() {
        // Create bloom/glow shader
        this.createBloomShader();
        
        // Create chromatic aberration shader
        this.createChromaticShader();
        
        // Create distortion wave shader
        this.createDistortionShader();
        
        // Create holographic shader
        this.createHolographicShader();
        
        console.log('🌟 Shader system initialized with', this.shaders.size, 'shaders');
    }
    
    createBloomShader() {
        const bloomFragmentShader = `
        #define GLSLIFY 1
        
        precision mediump float;
        
        uniform float uTime;
        uniform float uIntensity;
        uniform vec2 uResolution;
        uniform sampler2D uMainSampler;
        
        varying vec2 outTexCoord;
        
        void main() {
            vec2 uv = outTexCoord;
            vec4 color = texture2D(uMainSampler, uv);
            
            // Create glow effect
            vec2 texelSize = 1.0 / uResolution;
            vec4 glow = vec4(0.0);
            
            // Sample surrounding pixels for bloom
            for(int x = -2; x <= 2; x++) {
                for(int y = -2; y <= 2; y++) {
                    vec2 offset = vec2(float(x), float(y)) * texelSize * 2.0;
                    glow += texture2D(uMainSampler, uv + offset) * 0.04;
                }
            }
            
            // Pulsing intensity
            float pulse = 0.8 + 0.4 * sin(uTime * 8.0);
            glow *= pulse * uIntensity;
            
            // Combine original with glow
            color.rgb += glow.rgb * glow.a;
            
            gl_FragColor = color;
        }`;
        
        this.shaders.set('bloom', {
            fragmentShader: bloomFragmentShader,
            uniforms: {
                uTime: { type: '1f', value: 0 },
                uIntensity: { type: '1f', value: 1.0 },
                uResolution: { type: '2f', value: [800, 600] }
            }
        });
    }
    
    createChromaticShader() {
        const chromaticFragmentShader = `
        #define GLSLIFY 1
        
        precision mediump float;
        
        uniform float uTime;
        uniform float uIntensity;
        uniform sampler2D uMainSampler;
        
        varying vec2 outTexCoord;
        
        void main() {
            vec2 uv = outTexCoord;
            
            // Chromatic aberration effect
            float aberration = uIntensity * 0.01 * (1.0 + 0.5 * sin(uTime * 6.0));
            
            // Sample RGB channels separately with offset
            float r = texture2D(uMainSampler, uv + vec2(aberration, 0.0)).r;
            float g = texture2D(uMainSampler, uv).g;
            float b = texture2D(uMainSampler, uv - vec2(aberration, 0.0)).b;
            float a = texture2D(uMainSampler, uv).a;
            
            gl_FragColor = vec4(r, g, b, a);
        }`;
        
        this.shaders.set('chromatic', {
            fragmentShader: chromaticFragmentShader,
            uniforms: {
                uTime: { type: '1f', value: 0 },
                uIntensity: { type: '1f', value: 1.0 }
            }
        });
    }
    
    createDistortionShader() {
        const distortionFragmentShader = `
        #define GLSLIFY 1
        
        precision mediump float;
        
        uniform float uTime;
        uniform float uIntensity;
        uniform vec2 uCenter;
        uniform sampler2D uMainSampler;
        
        varying vec2 outTexCoord;
        
        void main() {
            vec2 uv = outTexCoord;
            vec2 center = uCenter;
            
            // Distance from center
            float dist = distance(uv, center);
            
            // Ripple effect
            float ripple = sin(dist * 30.0 - uTime * 15.0) * 0.02 * uIntensity * exp(-dist * 8.0);
            
            // Apply distortion
            vec2 direction = normalize(uv - center);
            vec2 distortedUV = uv + direction * ripple;
            
            vec4 color = texture2D(uMainSampler, distortedUV);
            
            gl_FragColor = color;
        }`;
        
        this.shaders.set('distortion', {
            fragmentShader: distortionFragmentShader,
            uniforms: {
                uTime: { type: '1f', value: 0 },
                uIntensity: { type: '1f', value: 1.0 },
                uCenter: { type: '2f', value: [0.5, 0.5] }
            }
        });
    }
    
    createHolographicShader() {
        const holographicFragmentShader = `
        #define GLSLIFY 1
        
        precision mediump float;
        
        uniform float uTime;
        uniform float uIntensity;
        uniform sampler2D uMainSampler;
        
        varying vec2 outTexCoord;
        
        vec3 hsv2rgb(vec3 c) {
            vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
            vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
            return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }
        
        void main() {
            vec2 uv = outTexCoord;
            vec4 color = texture2D(uMainSampler, uv);
            
            // Create rainbow effect
            float hue = fract(uv.x * 2.0 + uv.y * 1.0 + uTime * 0.5);
            vec3 rainbow = hsv2rgb(vec3(hue, 0.8, 1.0));
            
            // Holographic interference pattern
            float interference = sin(uv.x * 50.0 + uTime * 8.0) * sin(uv.y * 50.0 + uTime * 6.0);
            interference = (interference + 1.0) * 0.5; // Normalize to 0-1
            
            // Mix original color with holographic effect
            color.rgb = mix(color.rgb, rainbow * interference, uIntensity * color.a);
            
            gl_FragColor = color;
        }`;
        
        this.shaders.set('holographic', {
            fragmentShader: holographicFragmentShader,
            uniforms: {
                uTime: { type: '1f', value: 0 },
                uIntensity: { type: '1f', value: 0.8 }
            }
        });
    }
    
    // Apply bloom effect to a sprite
    applyBloomEffect(sprite, intensity = 1.0) {
        if (!sprite || !this.shaders.has('bloom')) return;
        
        const shader = this.scene.add.shader('bloom', sprite.x, sprite.y, sprite.width, sprite.height);
        shader.setUniforms(this.shaders.get('bloom').uniforms);
        shader.setUniform('uIntensity.value', intensity);
        shader.setUniform('uResolution.value', [this.scene.cameras.main.width, this.scene.cameras.main.height]);
        
        // Match sprite properties
        shader.setOrigin(sprite.originX, sprite.originY);
        shader.setDepth(sprite.depth + 1);
        
        return shader;
    }
    
    // Apply holographic effect to a sprite
    applyHolographicEffect(sprite, intensity = 0.8) {
        if (!sprite || !this.shaders.has('holographic')) return;
        
        const pipeline = this.scene.renderer.pipelines.get('holographic');
        if (pipeline) {
            sprite.setPipeline('holographic');
            sprite.pipeline.setFloat1('uIntensity', intensity);
        }
        
        return sprite;
    }
    
    // Create screen flash effect
    createScreenFlash(color = 0xffffff, intensity = 0.8, duration = 200) {
        const flash = this.scene.add.rectangle(
            this.scene.cameras.main.centerX,
            this.scene.cameras.main.centerY,
            this.scene.cameras.main.width,
            this.scene.cameras.main.height,
            color,
            intensity
        );
        
        flash.setDepth(10000);
        flash.setScrollFactor(0);
        
        // Fade out quickly
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: duration,
            ease: 'Power2',
            onComplete: () => {
                flash.destroy();
            }
        });
        
        return flash;
    }
    
    // Create explosion distortion wave
    createExplosionWave(x, y, maxRadius = 200, duration = 1000) {
        // Create multiple expanding rings for more dramatic effect
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.createDistortionWave(x, y, maxRadius + i * 50, duration - i * 200);
            }, i * 100);
        }
    }
    
    createDistortionWave(x, y, maxRadius = 200, duration = 800) {
        const wave = this.scene.add.graphics();
        wave.setDepth(9999);
        
        let currentRadius = 0;
        const startTime = Date.now();
        
        const updateWave = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                wave.destroy();
                return;
            }
            
            currentRadius = maxRadius * progress;
            const alpha = 1 - progress;
            
            wave.clear();
            wave.lineStyle(4, 0xffffff, alpha * 0.8);
            wave.strokeCircle(x, y, currentRadius);
            
            // Add inner glow
            wave.lineStyle(2, 0x88ffff, alpha * 0.6);
            wave.strokeCircle(x, y, currentRadius * 0.8);
        };
        
        // Update the wave each frame
        const timer = this.scene.time.addEvent({
            delay: 16, // ~60fps
            callback: updateWave,
            repeat: Math.floor(duration / 16)
        });
        
        return wave;
    }
    
    // Create bullet trail effect
    createBulletTrail(bullet, color = 0x00ffff, length = 5) {
        if (!bullet || !bullet.sprite) return;
        
        const trail = this.scene.add.graphics();
        trail.setDepth(bullet.sprite.depth - 1);
        
        const trailPoints = [];
        let lastUpdate = 0;
        
        const updateTrail = (time) => {
            if (!bullet.sprite || bullet.isDestroyed) {
                trail.destroy();
                return;
            }
            
            // Add new point every few frames
            if (time - lastUpdate > 32) { // Every 2 frames at 60fps
                trailPoints.push({
                    x: bullet.sprite.x,
                    y: bullet.sprite.y
                });
                
                // Limit trail length
                if (trailPoints.length > length) {
                    trailPoints.shift();
                }
                
                lastUpdate = time;
            }
            
            // Draw trail
            trail.clear();
            if (trailPoints.length > 1) {
                for (let i = 0; i < trailPoints.length - 1; i++) {
                    const alpha = (i / trailPoints.length) * 0.8;
                    const width = (i / trailPoints.length) * 3 + 1;
                    
                    trail.lineStyle(width, color, alpha);
                    trail.lineBetween(
                        trailPoints[i].x, trailPoints[i].y,
                        trailPoints[i + 1].x, trailPoints[i + 1].y
                    );
                }
            }
        };
        
        // Store reference for cleanup
        bullet.trailEffect = { trail, updateTrail };
        
        return trail;
    }
    
    update(time, delta) {
        // Update shader time uniforms
        for (const [name, shader] of this.shaders) {
            if (shader.uniforms.uTime) {
                shader.uniforms.uTime.value = time * 0.001; // Convert to seconds
            }
        }
        
        // Update active effects
        this.activeEffects = this.activeEffects.filter(effect => {
            if (effect.update) {
                return effect.update(time, delta);
            }
            return true;
        });
    }
    
    destroy() {
        this.shaders.clear();
        this.activeEffects = [];
    }
}