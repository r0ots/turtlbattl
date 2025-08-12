precision mediump float;

uniform float time;
uniform vec2 resolution;

varying vec2 outTexCoord;

void main(void) {
    vec2 uv = outTexCoord;
    
    // Simple test pattern - should show animated colors
    vec3 color = vec3(
        sin(time + uv.x * 10.0) * 0.5 + 0.5,
        sin(time + uv.y * 10.0 + 2.0) * 0.5 + 0.5,
        sin(time + uv.x * uv.y * 10.0 + 4.0) * 0.5 + 0.5
    );
    
    gl_FragColor = vec4(color, 1.0);
}