export default `#version 300 es
precision highp float;

uniform sampler2D uSampler;

in vec2 vTexcoord;
out vec4 outColor;


void main() {
    vec4 color = texture(uSampler, vTexcoord);
    float depth = color.r;
    outColor = vec4(vec3(depth),1);// + vec4(0,-1,0,1);
}
`;