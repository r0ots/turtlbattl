precision mediump float;

uniform float time;
uniform vec2 resolution;
uniform vec2 bulletPos;

varying vec2 outTexCoord;

#define twopi 6.28319

vec3 hsv2rgb(vec3 hsv) {
    hsv.yz = clamp(hsv.yz, 0.0, 1.0);
    return hsv.z * (0.63 * hsv.y * (cos(twopi * (hsv.x + vec3(0.0, 2.0/3.0, 1.0/3.0))) - 1.0) + 1.0);
}

float random(float co) {
    return fract(sin(co * 12.989) * 43758.545);
}

void main(void) {
    vec2 uv = outTexCoord;
    vec2 pixelPos = gl_FragCoord.xy;
    
    // Start with black
    vec3 color = vec3(0.0);
    
    // Convert bullet position to UV space
    vec2 bulletUV = bulletPos / resolution;
    float dist = distance(uv, bulletUV);
    
    // Only render particles near the bullet
    if (dist < 0.15) {
        // Number of particles
        const int nb_particles = 12;
        
        for(int i = 0; i < nb_particles; i++) {
            float fi = float(i);
            float particleTime = time - fi * 0.02;
            
            // Particle offset with some randomness
            vec2 offset = vec2(
                sin(particleTime * 4.0 + fi * 2.5) * 0.03,
                cos(particleTime * 3.5 + fi * 1.8) * 0.03
            );
            
            vec2 particlePos = bulletUV + offset;
            float pDist = distance(uv, particlePos);
            
            // Main particle glow
            float intensity = 1.0 / (pDist * 200.0 + 0.01);
            
            // Add star rays (horizontal and vertical)
            vec2 uvOffset = uv - particlePos;
            float hRay = 1.0 / (abs(uvOffset.y) * 500.0 + 0.01);
            float vRay = 1.0 / (abs(uvOffset.x) * 500.0 + 0.01);
            
            // Add diagonal rays
            float d1Ray = 1.0 / (abs(uvOffset.x - uvOffset.y) * 700.0 + 0.01);
            float d2Ray = 1.0 / (abs(uvOffset.x + uvOffset.y) * 700.0 + 0.01);
            
            // Combine all rays with lower intensity for diagonals
            intensity += (hRay + vRay) * 0.15 + (d1Ray + d2Ray) * 0.08;
            
            intensity = pow(intensity, 1.8);
            
            // Rainbow color based on time and particle index
            float hue = fract(time * 0.3 + fi * 0.08);
            vec3 particleColor = hsv2rgb(vec3(hue, 0.85, 1.0));
            
            // Fade based on distance from bullet
            float fade = 1.0 - (pDist / 0.15);
            fade = clamp(fade, 0.0, 1.0);
            
            // Sparkling effect
            float sparkle = sin(particleTime * 15.0 + fi * 3.0) * 0.5 + 0.5;
            
            // Add this particle's contribution
            color += particleColor * intensity * fade * sparkle * 0.4;
        }
        
        // Main bullet glow
        float mainGlow = 1.0 / (dist * 100.0 + 0.01);
        mainGlow = pow(mainGlow, 2.0);
        
        // Bright white core
        if (dist < 0.02) {
            float coreIntensity = 1.0 - (dist / 0.02);
            coreIntensity = pow(coreIntensity, 2.0);
            color += vec3(1.0, 1.0, 1.0) * coreIntensity;
        }
        
        // Rainbow halo around bullet
        float haloHue = fract(time * 0.5);
        vec3 haloColor = hsv2rgb(vec3(haloHue, 0.7, 1.0));
        color += haloColor * mainGlow * 0.5;
    }
    
    // Clamp to prevent overflow
    color = clamp(color, 0.0, 1.0);
    
    gl_FragColor = vec4(color, 1.0);
}