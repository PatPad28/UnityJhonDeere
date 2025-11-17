using UnityEditor;
using UnityEngine;

[CustomEditor(typeof(CropOrigin))]
public class CropOriginEditor : Editor
{
    public override void OnInspectorGUI()
    {
        base.OnInspectorGUI();

        var crop = (CropOrigin)target;

        float t = 0f;

        if(crop.CropData != null) t = crop.CropData.t;

        GUILayout.Label("Growth percentage: " + t);
        if (Application.isPlaying)
            Repaint();
    }
}
