precision mediump float;

uniform float time;
uniform vec2 resolution;
uniform sampler2D uMainSampler;

varying vec2 outTexCoord;

// Rainbow HSV to RGB conversion
vec3 hsv2rgb(vec3 hsv) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(hsv.xxx + K.xyz) * 6.0 - K.www);
    return hsv.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), hsv.y);
}

void main(void) {
    vec2 uv = outTexCoord;
    vec2 center = vec2(0.5, 0.5);
    
    // Distance from center
    float dist = distance(uv, center);
    
    // Only render within a circle, no squares!
    if (dist > 0.5) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }
    
    vec3 color = vec3(0.0);
    
    // Create smooth circular glow
    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    glow = pow(glow, 1.5);
    
    // Rainbow color that changes over time
    float hue = fract(time * 0.4 + dist * 0.5);
    vec3 rainbowColor = hsv2rgb(vec3(hue, 0.9, 1.0));
    
    // Add the glow
    color = rainbowColor * glow;
    
    // Add rotating sparkles (no rays!)
    float angle = atan(uv.y - 0.5, uv.x - 0.5);
    float sparkle = sin(angle * 12.0 - time * 8.0) * sin(dist * 30.0 + time * 5.0);
    sparkle = smoothstep(0.7, 1.0, sparkle);
    color += vec3(sparkle) * 0.3 * glow;
    
    // Pulsing effect
    float pulse = 0.8 + 0.2 * sin(time * 6.0);
    color *= pulse;
    
    // Alpha based on distance for smooth edges
    float alpha = glow * 0.8;
    
    gl_FragColor = vec4(color, alpha);
}