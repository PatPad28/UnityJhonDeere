using System.Runtime.InteropServices;
using UnityEditor;
using UnityEngine;

public class CropBunchInstancer : MonoBehaviour
{
    public Bounds Bounds;

    public int DimensionDensity = 1;

    private CropData[] _crops;

    public Mesh CropsMesh;
    public Material CropsMaterial;
    private Material _runtimeMaterial;
    public int SubMeshIndex = 0;

    private ComputeBuffer _cropsBuffer;
    private ComputeBuffer _argsBuffer;

    bool _initialized = false;

    void Awake()
    {
        // copia del material
        if (CropsMaterial != null)
            _runtimeMaterial = new Material(CropsMaterial);
        else
            Debug.LogError("CropsInstancer no tiene material asignado.");
    }

    void Update()
    {
        if (!_initialized) return;

        UpdateBuffers();
        Graphics.DrawMeshInstancedIndirect(
            CropsMesh,
            SubMeshIndex,
            _runtimeMaterial,
            Bounds,
            _argsBuffer
        );
    }

    public void Init(Vector2 worldCenterXZ, float sizeX, float sizeZ)
    {
        Bounds = new Bounds(
            new Vector3(worldCenterXZ.x, transform.position.y, worldCenterXZ.y),
            new Vector3(sizeX, Bounds.size.y == 0 ? 2 : Bounds.size.y, sizeZ)
        );

        _initialized = true;

        UpdateBuffers();
    }

    void UpdateBuffers()
    {
        if (!_initialized) return;
        if (DimensionDensity < 1) DimensionDensity = 1;

        int cropsCount = DimensionDensity * DimensionDensity;
        int stride = Marshal.SizeOf(typeof(CropDataStruct));

        _crops = new CropData[cropsCount];

        // local pos
        float dx = Bounds.size.x / DimensionDensity;
        float dz = Bounds.size.z / DimensionDensity;

        for (int i = 0; i < cropsCount; i++)
        {
            float x = -Bounds.extents.x + dx * (i % DimensionDensity) + dx * 0.5f;
            float z = -Bounds.extents.z + dz * (i / DimensionDensity) + dz * 0.5f;

            _crops[i] = new CropData { pos = new Vector3(x, 0f, z), t = 0f };
        }

        CropDataStruct[] cropDataStruct = new CropDataStruct[cropsCount];
        for (int i = 0; i < cropsCount; i++)
        {
            cropDataStruct[i] = new CropDataStruct
            {
                pos = _crops[i].pos,
                t = _crops[i].t
            };
        }

        _cropsBuffer?.Release();
        _cropsBuffer = new ComputeBuffer(cropsCount, stride);
        _cropsBuffer.SetData(cropDataStruct);

        SubMeshIndex = Mathf.Clamp(SubMeshIndex, 0, CropsMesh.subMeshCount - 1);

        uint[] args = new uint[5];
        if (CropsMesh != null)
        {
            args[0] = (uint)CropsMesh.GetIndexCount(SubMeshIndex);
            args[1] = (uint)cropsCount;
            args[2] = (uint)CropsMesh.GetIndexStart(SubMeshIndex);
            args[3] = (uint)CropsMesh.GetBaseVertex(SubMeshIndex);
        }

        _argsBuffer?.Release();
        _argsBuffer = new ComputeBuffer(1, args.Length * sizeof(uint), ComputeBufferType.IndirectArguments);
        _argsBuffer.SetData(args);

        _runtimeMaterial.SetBuffer("positionBuffer", _cropsBuffer);
    }

    void OnDestroy()
    {
        _cropsBuffer?.Release();
        _cropsBuffer = null;

        _argsBuffer?.Release();
        _argsBuffer = null;
    }

    void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.yellow;
        Gizmos.DrawWireCube(Bounds.center, Bounds.size);
    }


#if UNITY_EDITOR
    [System.Serializable]
    public struct InitParams
    {
        public Vector2 worldCenterXZ;
        public float sizeX;
        public float sizeZ;
    }

    [SerializeField] InitParams _initParams;

    [ContextMenu("Apply Init (Editor)")]
    void EditorApplyInit()
    {
        Init(
            _initParams.worldCenterXZ,
            _initParams.sizeX,
            _initParams.sizeZ
        );
    }
#endif
}