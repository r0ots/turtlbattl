precision mediump float;

uniform float time;
uniform vec2 resolution;
uniform sampler2D uMainSampler;

varying vec2 outTexCoord;

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main(void) {
    vec2 uv = outTexCoord;
    vec2 center = vec2(0.5, 0.5);
    
    // Distance from center
    float dist = distance(uv, center);
    
    // Create circular gradient that fades to transparent
    float circle = 1.0 - smoothstep(0.0, 0.5, dist);
    
    // Create spiral/swirl effect
    float angle = atan(uv.y - 0.5, uv.x - 0.5);
    float spiral = angle + dist * 3.0 - time * 4.0;
    
    // Rainbow hue that changes with time and position
    float hue = fract(spiral / (2.0 * 3.14159) + time * 0.5);
    
    // Convert HSV to RGB for smooth rainbow
    vec3 color = hsv2rgb(vec3(hue, 1.0, 1.0));
    
    // Add sparkles
    float sparkle = sin(spiral * 8.0) * sin(time * 10.0 + dist * 20.0);
    sparkle = pow(max(0.0, sparkle), 20.0);
    color += vec3(sparkle);
    
    // Create soft glow around edges
    float glow = exp(-dist * 3.0);
    
    // Pulsing effect
    float pulse = 0.8 + 0.2 * sin(time * 6.0);
    
    // Combine everything with nice alpha falloff
    float alpha = circle * pulse * 0.7;
    alpha *= (1.0 - dist * 1.5); // Extra falloff for smoother edges
    
    gl_FragColor = vec4(color * glow, alpha);
}