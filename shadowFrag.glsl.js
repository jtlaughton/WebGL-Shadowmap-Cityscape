export default `#version 300 es
precision highp float;

uniform sampler2D uSampler;

in vec4 vColor;
in vec4 vLightSpacePos;
out vec4 outColor;

vec3 shadowCalculation(vec4 lightSpacePos) {
    // TODO: shadow calculation
    return lightSpacePos.xyz / lightSpacePos.w;
}

void main() {
    // TODO: compute shadowmap coordenates 
    vec3 coords = shadowCalculation(vLightSpacePos);

    
    // TODO: evaluate if point is in shadow or not
    coords = coords * 0.5 + 0.5;

    float currentDepth = coords.z;

    float shadow = 0.0;

    float temp_x = float(textureSize(uSampler, 0).x);
    float temp_y = float(textureSize(uSampler, 0).y);

    vec2 texelSize = vec2(1.0f / temp_x, 1.0f / temp_y);
    
    for(int x = -1; x <= 1; ++x)
    {
        for(int y = -1; y <= 1; ++y)
        {
            float pcfDepth = texture(uSampler, coords.xy + vec2(x, y) * texelSize).r;
            shadow += currentDepth - .00022 > pcfDepth ? 1.0 : 0.0;
        }
    }

    shadow /= 9.0;

    outColor = vec4((1.0 - shadow * 0.5) * vColor.rgb, 1);
}
`;