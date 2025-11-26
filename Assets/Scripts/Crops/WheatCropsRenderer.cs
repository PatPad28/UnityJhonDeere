using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using UnityEngine;

/// <summary>
/// Responsible for having the list of crops to render.
/// Uses Graphics.DrawMeshInstancedIndirect().
/// </summary>
public class WheatCropsRenderer : MonoBehaviour
{
    [System.Serializable]
    public class MeshGrowthPoint
    {
        [Range(0f, 1f)]
        public float Value;
        public Mesh Mesh;
        public int SubMeshIndex;
    }

    [SerializeField] List<CropData> _crops = new List<CropData>();
    public int CropCount { get { return _crops.Count; } }

    private Bounds _bounds = new Bounds(Vector3.zero, Vector3.one* 10000f);

    [Header("Meshes Data")]
    public Material CropsMaterial;

    public MeshGrowthPoint[] MeshPoints;

    // Buffers
    private class BufferData
    {
        public ComputeBuffer InstancesBuffer;
        public ComputeBuffer ArgsBuffer;
    }
    private BufferData[] _bufferDatas;

    private ComputeBuffer _allInstances;

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
        CreateBufferDatas();
    }


    void Update()
    {
        if (_crops.Count <= 0) return;

        UpdateBuffers();

        var mpb = new MaterialPropertyBlock();
        for (int i = 0; i < MeshPoints.Length; i++)
        {
            var bd = _bufferDatas[i];
            if (bd == null) continue;
            var mesh = MeshPoints[i].Mesh;
            if (mesh == null) continue;

            mpb.Clear();
            mpb.SetBuffer("positionBuffer", bd.InstancesBuffer);

            Graphics.DrawMeshInstancedIndirect(mesh, MeshPoints[i].SubMeshIndex, CropsMaterial, _bounds, bd.ArgsBuffer, 0, mpb);
        }

    }

    private void FixedUpdate()
    {
    }

    void UpdateBuffers()
    {
        if (_allInstances == null || _allInstances.count != _crops.Count)
            CreateBufferDatas();

        int stride = Marshal.SizeOf(typeof(CropDataStruct));

        CropDataStruct[] cropDataStruct = new CropDataStruct[_crops.Count];
        for (int i = 0; i < _crops.Count; i++)
        {
            cropDataStruct[i] = new CropDataStruct { pos = _crops[i].pos, t = _crops[i].t };
        }

        _allInstances?.Release();
        _allInstances = new ComputeBuffer(Mathf.Max(1, _crops.Count), stride);
        _allInstances.SetData(cropDataStruct);

        for (int i = 0; i < MeshPoints.Length; i++)
        {
            float min = i == 0 ? 0 : MeshPoints[i-1].Value;
            float max = i == MeshPoints.Length -1 ? 1.01f : MeshPoints[i].Value;
            FilterGroup(_allInstances, _bufferDatas[i].InstancesBuffer, cropDataStruct.Length, min, max);


            uint[] args = new uint[5] { 0, 0, 0, 0, 0 };
            if (MeshPoints[i].Mesh != null)
            {
                args[0] = (uint)MeshPoints[i].Mesh.GetIndexCount(MeshPoints[i].SubMeshIndex);
                args[1] = 0;
                args[2] = (uint)MeshPoints[i].Mesh.GetIndexStart(MeshPoints[i].SubMeshIndex);
                args[3] = (uint)MeshPoints[i].Mesh.GetBaseVertex(MeshPoints[i].SubMeshIndex);
            }

            _bufferDatas[i].ArgsBuffer.SetData(args);

            ComputeBuffer.CopyCount(_bufferDatas[i].InstancesBuffer, _bufferDatas[i].ArgsBuffer, sizeof(uint));
        }
    }

    [SerializeField] ComputeShader _compute;

    void FilterGroup(ComputeBuffer allInstances, ComputeBuffer groupBuffer, int count, float minT, float maxT)
    {
        int kernel = _compute.FindKernel("CSMain");

        _compute.SetBuffer(kernel, "AllInstances", allInstances);
        _compute.SetBuffer(kernel, "ResultBuffer", groupBuffer);

        _compute.SetInt("InstanceCount", count);
        _compute.SetFloat("MinT", minT);
        _compute.SetFloat("MaxT", maxT);

        // IMPORTANTE: resetear contador
        groupBuffer.SetCounterValue(0);

        int groups = Mathf.CeilToInt(count / 256f);
        _compute.Dispatch(kernel, groups, 1, 1);
    }

    /// <summary>
    /// Creates empty Buffers
    /// </summary>
    void CreateBufferDatas()
    {
        ClearBuffers();

        _bufferDatas = new BufferData[MeshPoints.Length];
        for (int i = 0; i < MeshPoints.Length; i++)
        {
            int stride = Marshal.SizeOf(typeof(CropDataStruct));

            _bufferDatas[i] = new BufferData();
            _bufferDatas[i].InstancesBuffer = new ComputeBuffer(_crops.Count > 0 ? _crops.Count : 1, stride, ComputeBufferType.Append);
            _bufferDatas[i].InstancesBuffer.SetCounterValue(0);

            _bufferDatas[i].ArgsBuffer = new ComputeBuffer(1, 5 * sizeof(uint), ComputeBufferType.IndirectArguments);
        }
    }

    void ClearBuffers()
    {
        if (_bufferDatas != null)
        {
            for (int i = 0; i < _bufferDatas.Length; i++)
            {
                _bufferDatas[i].InstancesBuffer?.Release();
                _bufferDatas[i].ArgsBuffer?.Release();
                _bufferDatas[i].InstancesBuffer = null;
                _bufferDatas[i].ArgsBuffer = null;
            }
        }
        _bufferDatas = null;

        _allInstances?.Release();
        _allInstances = null;
    }

    public void AddCrop(CropData crop)
    {
        _crops.Add(crop);

        //Bounds meshBounds = CropsMesh != null ? CropsMesh.bounds : new Bounds(Vector3.zero, Vector3.one);
        //Bounds cropBounds = new Bounds(crop.pos + meshBounds.center, meshBounds.size);

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
    }

    private void OnDestroy()
    {
        ClearBuffers();
    }

    private void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.yellow;
        Gizmos.DrawWireCube(_bounds.center, _bounds.size);
    }
}
