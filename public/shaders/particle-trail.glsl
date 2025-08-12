precision mediump float;

uniform float time;
uniform vec2 resolution;
uniform float bulletPosX;
uniform float bulletPosY;
uniform float bulletVelX;
uniform float bulletVelY;

varying vec2 outTexCoord;

// Synaptic-style particle trail - adapted for rainbow bullets
const int TRAIL_LENGTH = 40;
const int stepsPerFrame = 8;

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float hash(float n) {
    return fract(sin(n) * 43758.5453);
}

float mag(vec3 p) {
    return dot(p, p);
}

void main(void) {
    vec2 fragCoord = outTexCoord * resolution;
    vec2 uv = outTexCoord;
    
    vec3 color = vec3(0.0);
    
    // Ready for the beautiful particle trail effect!
    
    // Only render if bullet is active (not at -100, -100)
    if (bulletPosX < 0.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0); // Fully transparent
        return;
    }
    
    // Simple trailing glow effect
    if (bulletPosX > 0.0 && bulletPosY > 0.0) {
        vec2 bulletScreenPos = vec2(bulletPosX, bulletPosY);
        
        // Create a long trailing glow behind the bullet
        for (int i = 0; i < TRAIL_LENGTH; i++) {
            float fi = float(i);
            
            // Calculate trail positions - assume bullet came from center of screen
            // This is a simple approximation for a trailing effect
            vec2 screenCenter = resolution * 0.5;
            vec2 bulletDirection = normalize(bulletScreenPos - screenCenter);
            
            // Create trail points going backwards from the bullet (reverse direction)
            vec2 trailPos = bulletScreenPos + bulletDirection * fi * 8.0;
            
            // Add some width to the trail
            float trailWidth = 3.0 + fi * 0.5;
            for (int j = -2; j <= 2; j++) {
                vec2 offsetPos = trailPos;
                float fj = float(j);
                
                // Add perpendicular offset for trail width
                vec2 perpendicular = vec2(-bulletDirection.y, bulletDirection.x);
                offsetPos += perpendicular * fj * trailWidth;
                
                // Distance from current pixel to this trail point
                float dist = distance(fragCoord, offsetPos);
                float intensity = 12.0 / (dist + 1.0 + fi * 0.3);
                intensity = pow(intensity, 2.2);
                
                // Fade based on trail distance
                float fade = 1.0 - (fi / float(TRAIL_LENGTH));
                fade *= fade;
                
                // Additional fade for trail width
                float widthFade = 1.0 - abs(fj) * 0.2;
                
                // Rainbow color
                float hue = fract(fi * 0.03 + time * 0.2);
                vec3 trailColor = hsv2rgb(vec3(hue, 0.8, 1.0));
                
                color += trailColor * intensity * fade * widthFade * 0.15;
            }
        }
        
        // Bright bullet core
        float bulletDist = distance(fragCoord, bulletScreenPos);
        float bulletGlow = 25.0 / (bulletDist + 1.0);
        bulletGlow = pow(bulletGlow, 2.5);
        
        float coreHue = fract(time * 0.4);
        vec3 coreColor = hsv2rgb(vec3(coreHue, 0.9, 1.0));
        color += coreColor * bulletGlow * 0.4;
    }
    
    // The synaptic effect includes its own core glow above
    
    // Clamp final color
    color = clamp(color, 0.0, 1.0);
    
    // Calculate alpha based on effect intensity - transparent when no effect
    float alpha = length(color);
    alpha = clamp(alpha, 0.0, 1.0);
    
    gl_FragColor = vec4(color, alpha);
}