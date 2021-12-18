export default `#version 300 es

uniform mat4 uModel;
uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uLightView;
uniform mat4 uLightProjection;
uniform vec4 uColor;
uniform vec3 uLightDir;
uniform bool uHasNormals;

in vec3 position;
in vec3 normal;

out vec4 vColor;
out vec4 vLightSpacePos;

void main() {
    // TODO: If has normals, compute color considering it
    if(uHasNormals){
        float dot_product = max(.25, dot(uLightDir, normal));
        vColor = vec4(dot_product * uColor.rgb, 1);
    }
    else{
        vColor = uColor;
    }
    // TODO: compute light space position and gl_Position
    gl_Position = uProjection * uView * uModel * vec4(position, 1);
    vLightSpacePos = uLightProjection * uLightView * uModel * vec4(position, 1);
}
`;