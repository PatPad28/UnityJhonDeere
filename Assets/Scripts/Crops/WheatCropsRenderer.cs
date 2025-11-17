using System.Runtime.InteropServices;
using System.Collections.Generic;
using UnityEngine;
using System.ComponentModel;

/// <summary>
/// Responsible for having the list of crops to render.
/// Uses Graphics.DrawMeshInstancedIndirect().
/// </summary>
public class WheatCropsRenderer : MonoBehaviour
{
    [SerializeField] List<CropData> _crops = new List<CropData>();
    public int CropCount { get { return _crops.Count; } }

    [Header("Mesh Data")]
    public Mesh CropsMesh;
    public Material CropsMaterial;
    public int SubMeshIndex = 0;

    //private Bounds _bounds = new Bounds();
    private Bounds _bounds = new Bounds(Vector3.zero, Vector3.one* 10000f);


    private ComputeBuffer _cropsBuffer;
    private ComputeBuffer _argsBuffer;


    private void OnEnable()
    {
        CropEvents.OnCropAdded += AddCrop;
        CropEvents.OnCropRemoved += RemoveCrop;
    }

    private void OnDisable()
    {
        CropEvents.OnCropAdded -= AddCrop;
        CropEvents.OnCropRemoved -= RemoveCrop;
    }

    void Awake()
    {
        UpdateBuffers();
    }


    void Update()
    {
        if (_crops == null || _crops.Count == 0)
            return;
        UpdateBuffers();
        Graphics.DrawMeshInstancedIndirect(CropsMesh, SubMeshIndex, CropsMaterial, _bounds, _argsBuffer);
    }

    void UpdateBuffers()
    {
        if (_crops == null || _crops.Count == 0)
        {
            _cropsBuffer?.Release();
            _argsBuffer?.Release();
            _cropsBuffer = null;
            _argsBuffer = null;
            return;
        }

        int stride = Marshal.SizeOf(typeof(CropDataStruct));

        CropDataStruct[] cropDataStruct = new CropDataStruct[_crops.Count];
        for (int i = 0; i < _crops.Count; i++)
        {
            cropDataStruct[i] = new CropDataStruct { pos = _crops[i].pos, t = _crops[i].t };
        }
        _cropsBuffer?.Release();
        _cropsBuffer = new ComputeBuffer(_crops.Count, stride);
        _cropsBuffer.SetData(cropDataStruct);

        SubMeshIndex = Mathf.Clamp(SubMeshIndex, 0, CropsMesh.subMeshCount - 1);

        uint[] args = new uint[5] { 0, 0, 0, 0, 0 };
        if (CropsMesh != null)
        {
            args[0] = (uint)CropsMesh.GetIndexCount(SubMeshIndex);
            args[1] = (uint)_crops.Count;
            args[2] = (uint)CropsMesh.GetIndexStart(SubMeshIndex);
            args[3] = (uint)CropsMesh.GetBaseVertex(SubMeshIndex);
        }

        _argsBuffer?.Release();
        _argsBuffer = new ComputeBuffer(1, args.Length * sizeof(uint), ComputeBufferType.IndirectArguments);
        _argsBuffer.SetData(args);

        CropsMaterial.SetBuffer("positionBuffer", _cropsBuffer);
    }


    public void AddCrop(CropData crop)
    {
        _crops.Add(crop);

        Bounds meshBounds = CropsMesh != null ? CropsMesh.bounds : new Bounds(Vector3.zero, Vector3.one);

        Bounds cropBounds = new Bounds(crop.pos + meshBounds.center, meshBounds.size);


        //if (_crops.Count == 1)
        //{
        //    _bounds = cropBounds;
        //}
        //else
        //{
        //    Vector3 min = Vector3.Min(_bounds.min, cropBounds.min);
        //    Vector3 max = Vector3.Max(_bounds.max, cropBounds.max);
        //    _bounds.center = (min + max) * 0.5f;
        //    _bounds.size = max - min;
        //}

        UpdateBuffers();
    }

    public void RemoveCrop(CropData crop)
    {
        _crops.Remove(crop);

        UpdateBuffers();
    }

    private void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.yellow;

        Gizmos.DrawWireCube(_bounds.center, _bounds.size);
    }
}
