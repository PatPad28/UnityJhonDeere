using System.Runtime.InteropServices;
using UnityEngine;

public class CropsInstancer : MonoBehaviour
{
    public Bounds Bounds;

    public int DimensionDensity = 1;

    private CropData[] _crops;

    public Mesh CropsMesh;
    public Material CropsMaterial;
    public int SubMeshIndex = 0;

    private ComputeBuffer _cropsBuffer;
    private ComputeBuffer _argsBuffer;

    void Awake()
    {
        UpdateBuffers();
    }

    void Update()
    {
        UpdateBuffers();
        Graphics.DrawMeshInstancedIndirect(CropsMesh, SubMeshIndex, CropsMaterial, Bounds, _argsBuffer);
    }

    void UpdateBuffers()
    {
        if (DimensionDensity < 1) DimensionDensity = 1;

        int cropsCount = DimensionDensity * DimensionDensity;
        int stride = Marshal.SizeOf(typeof(CropDataStruct));
        _crops = new CropData[cropsCount];
        for (int i = 0; i < cropsCount; i++)
        {
            float dx = Bounds.extents.x * 2 / DimensionDensity;
            float dz = Bounds.extents.z * 2 / DimensionDensity;
            float x = Bounds.center.x - Bounds.extents.x + (dx * (i % DimensionDensity)) + dx / 2;
            float z = Bounds.center.z - Bounds.extents.z + (dz * (i / DimensionDensity)) + dz / 2;
            _crops[i] = new CropData { pos = new Vector3(x, Bounds.center.y, z), t = 0 };
        }

        CropDataStruct[] cropDataStruct = new CropDataStruct[cropsCount];
        for (int i = 0; i < cropsCount; i++)
        {
            cropDataStruct[i] = new CropDataStruct { pos = _crops[i].pos, t = _crops[i].t };
        }


        _cropsBuffer?.Release();
        _cropsBuffer = new ComputeBuffer(cropsCount, stride);
        _cropsBuffer.SetData(cropDataStruct);

        SubMeshIndex = Mathf.Clamp(SubMeshIndex, 0, CropsMesh.subMeshCount - 1);

        uint[] args = new uint[5] { 0, 0, 0, 0, 0 };
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

        CropsMaterial.SetBuffer("positionBuffer", _cropsBuffer);
    }

    void OnDestroy()
    {
        _cropsBuffer?.Release();
        _cropsBuffer = null;

        _argsBuffer?.Release();
        _argsBuffer = null;
    }

    private void OnDrawGizmos()
    {
        Gizmos.color = Color.yellow;
        Gizmos.DrawWireCube(Bounds.center, Bounds.size);
    }
}
