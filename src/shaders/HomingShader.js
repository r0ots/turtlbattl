export const HomingVertexShader = `
precision mediump float;

attribute vec2 inPosition;

void main()
{
    gl_Position = vec4(inPosition, 0.0, 1.0);
}
`;

export const HomingFragmentShader = `
precision mediump float;

uniform float time;
uniform vec2 resolution;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    
    // Make a bright, obvious effect
    vec3 color = vec3(1.0, 0.0, 1.0); // Bright magenta
    
    // Add some animation
    float pulse = 0.5 + 0.5 * sin(time * 3.0);
    
    gl_FragColor = vec4(color * pulse, 1.0);
}
`;

export const ExplosiveVertexShader = `
precision mediump float;

attribute vec2 inPosition;

void main()
{
    gl_Position = vec4(inPosition, 0.0, 1.0);
}
`;

export const ExplosiveFragmentShader = `
precision mediump float;

uniform float uTime;
uniform vec2 uResolution;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(uv, center);
    
    // Fire colors
    vec3 fireCore = vec3(1.0, 1.0, 0.8);      // White hot
    vec3 fireMiddle = vec3(1.0, 0.5, 0.0);    // Orange
    vec3 fireOuter = vec3(0.8, 0.0, 0.0);     // Red
    
    // Create fire gradient
    vec3 fireColor = mix(fireOuter, fireMiddle, smoothstep(0.3, 0.6, 1.0 - dist));
    fireColor = mix(fireColor, fireCore, smoothstep(0.6, 0.8, 1.0 - dist));
    
    // Add flickering
    float flicker = random(uv + uTime) * 0.3 + 0.7;
    fireColor *= flicker;
    
    // Pulsing intensity
    float pulse = 1.0 + 0.4 * sin(uTime * 12.0);
    
    // Create final fire effect
    vec3 finalColor = fireColor * pulse;
    
    // Add some alpha for nice blending
    float alpha = 0.9 * (1.0 - dist * 1.5);
    
    gl_FragColor = vec4(finalColor, alpha);
}
`;

export const GlowVertexShader = `
precision mediump float;

attribute vec2 inPosition;

void main()
{
    gl_Position = vec4(inPosition, 0.0, 1.0);
}
`;

export const GlowFragmentShader = `
precision mediump float;

uniform float uTime;
uniform float uIntensity;
uniform vec3 uGlowColor;

void main() {
    vec2 uv = gl_FragCoord.xy / vec2(32.0, 32.0); // Fixed resolution for now
    
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(uv, center);
    
    // Create smooth glow
    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    glow = pow(glow, 2.0) * uIntensity;
    
    // Pulsing effect
    float pulse = 1.0 + 0.3 * sin(uTime * 6.0);
    glow *= pulse;
    
    // Create glow effect
    vec3 finalColor = uGlowColor * glow;
    
    gl_FragColor = vec4(finalColor, glow * 0.8);
}
`;