#ifndef CROPS_WIND_INCLUDED
#define CROPS_WIND_INCLUDED

float SmoothNoise(float2 p, float time, float freq, float speed)
{
    float t = time * speed;

    float n =
        sin(dot(p * freq, float2(12.9898, 78.233)) + t * 0.7) * 0.5 +
        cos(dot(p * freq, float2(4.898, 7.23)) + t * 1.3) * 0.5;

    return n * 0.5 + 0.5;
}

float3 ApplyWind(float3 worldPos, float height, float time, float2 windDir, float windStrength, float windFreq,float windSpeed)
{
    float n = SmoothNoise(worldPos.xz * 0.08, time, windFreq, windSpeed);

    float h = saturate(height);
    float heightFactor = h * h;

    float w = n * windStrength * heightFactor;

    return float3(windDir.x * w, 0, windDir.y * w);
}

#endif