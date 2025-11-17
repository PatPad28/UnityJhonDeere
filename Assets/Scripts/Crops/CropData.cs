using UnityEngine;

public class CropData
{
    /// <summary>
    /// Global position
    /// </summary>
    public Vector3 pos;

    /// <summary>
    /// Normalized growth time [0-1]
    /// </summary>
    public float t;
}

public struct CropDataStruct
{
    public Vector3 pos;
    public float t;
}