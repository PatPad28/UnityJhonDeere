Shader "Instanced/CropsInstanceLit"
{
    Properties
    {
        _ColorA ("Color A", 2D) = "white" {}
        _ColorB ("Color B", 2D) = "white" {}

        _SmoothStart ("Smooth Start", float) = 0
        _SmoothEnd ("Smooth End", float) = 1

        _MinLight ("Min Light", float) = 0

        _WindDirection ("Wind Direction (xy)", Vector) = (0, 0, 0, 0)
        _WindSpeed ("Wind Speed", float) = 0
        _WindFrecuency ("Wind Frecuency", float) = 0
        _WindStrength ("Wind Strength", float) = 0

        _StemHeight ("Stem Height", float) = 1
    }

    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }
        LOD 200

        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }

            HLSLPROGRAM
            #pragma target 4.5
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_instancing
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            #include "CropsWind.hlsl"

            struct CropsData {
                float3 pos;
                float t;
            };
            StructuredBuffer<CropsData> positionBuffer;

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS   : NORMAL;
                float2 uv         : TEXCOORD0;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            struct Varyings
            {
                float4 posHCS : SV_POSITION;
                float3 posWS  : TEXCOORD0;
                float3 normalWS : TEXCOORD1;
                float2 uv : TEXCOORD2;
                float t : TEXCOORD3;
                UNITY_VERTEX_OUTPUT_STEREO
            };

            TEXTURE2D(_ColorA);
            SAMPLER(sampler_ColorA);

            TEXTURE2D(_ColorB);
            SAMPLER(sampler_ColorB);

            CBUFFER_START(UnityPerMaterial)
                float _SmoothStart;
                float _SmoothEnd;
                float _MinLight;

                float4 _WindDirection;
                float _WindSpeed;
                float _WindFrecuency;
                float _WindStrength;
                float _StemHeight;
            CBUFFER_END

            void Setup() {} // requerido por instancing procedural

            Varyings vert(Attributes IN, uint instanceID : SV_InstanceID)
            {
                Varyings OUT;
                UNITY_SETUP_INSTANCE_ID(IN);
                UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(OUT);

                CropsData crop = positionBuffer[instanceID];

                float3 baseWorld = TransformObjectToWorld(IN.positionOS.xyz) + crop.pos;

                float height = IN.positionOS.y / _StemHeight;
                float time = _Time.y;

                float2 windDir = normalize(_WindDirection.xy);
                float3 windOffset = ApplyWind(
                    baseWorld, height, time,
                    windDir,
                    _WindStrength,
                    _WindFrecuency,
                    _WindSpeed
                );
                float3 worldPos = baseWorld + windOffset;

                OUT.posWS = worldPos;
                OUT.posHCS = TransformWorldToHClip(worldPos);
                OUT.normalWS = normalize(TransformObjectToWorldNormal(IN.normalOS));
                OUT.uv = IN.uv;
                OUT.t = crop.t;

                return OUT;
            }

            half4 frag(Varyings IN) : SV_Target
            {
                float s = smoothstep(_SmoothStart, _SmoothEnd, IN.t);

                half4 colA = SAMPLE_TEXTURE2D(_ColorA, sampler_ColorA, IN.uv);
                half4 colB = SAMPLE_TEXTURE2D(_ColorB, sampler_ColorB, IN.uv);

                half4 baseCol = lerp(colA, colB, s);

                Light mainLight = GetMainLight();
                half3 N = normalize(IN.normalWS);
                half3 L = normalize(mainLight.direction);
                half NdotL = saturate(dot(N, -L));

                half3 lighting = max(NdotL, _MinLight) * mainLight.color;

                #if defined(_MAIN_LIGHT_SHADOWS)
                    float4 shadowCoord = TransformWorldToShadowCoord(IN.posWS);
                    lighting *= MainLightRealtimeShadow(shadowCoord);
                #endif

                return half4(baseCol.rgb * lighting, baseCol.a);
            }
            ENDHLSL
        }

        // Sombra (necesaria para que el objeto proyecte sombras)
        Pass
        {
            Name "ShadowCaster"
            Tags { "LightMode"="ShadowCaster" }

            HLSLPROGRAM
            #pragma target 4.5
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_instancing
            #pragma instancing_options procedural:Setup
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            #include "CropsWind.hlsl"

            struct CropsData { float3 pos; float t; };
            StructuredBuffer<CropsData> positionBuffer;

            struct Attributes
            {
                float4 positionOS : POSITION;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
            };

            CBUFFER_START(UnityPerMaterial)
                float _SmoothStart;
                float _SmoothEnd;
                float _MinLight;

                float4 _WindDirection;  // xy = dirección
                float _WindSpeed;
                float _WindFrecuency;
                float _WindStrength;
                float _StemHeight;
            CBUFFER_END

            void Setup() {}

            Varyings vert(Attributes IN, uint instanceID : SV_InstanceID)
            {
                Varyings OUT;
                UNITY_SETUP_INSTANCE_ID(IN);
                UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(OUT);

                CropsData crop = positionBuffer[instanceID];

                float3 baseWorld = TransformObjectToWorld(IN.positionOS.xyz) + crop.pos;

                float height = IN.positionOS.y / _StemHeight;
                float time = _Time.y;

                float2 windDir = normalize(_WindDirection.xy);
                float3 windOffset = ApplyWind(
                    baseWorld, height, time,
                    windDir,
                    _WindStrength,
                    _WindFrecuency,
                    _WindSpeed
                );
                float3 worldPos = baseWorld + windOffset;

                OUT.positionHCS = TransformWorldToHClip(worldPos);

                return OUT;
            }

            float4 frag(Varyings IN) : SV_Target
            {
                return 0;
            }
            ENDHLSL
        }
    }
}
