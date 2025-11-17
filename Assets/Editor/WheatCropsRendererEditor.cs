using UnityEditor;
using UnityEngine;

[CustomEditor(typeof(WheatCropsRenderer))]
public class WheatCropsRendererEditor : Editor
{
    public override void OnInspectorGUI()
    {
        base.OnInspectorGUI();

        var renderer = (WheatCropsRenderer)target;
        int cropCount = renderer.CropCount;

        GUILayout.Label("Value: " + cropCount);

        if (Application.isPlaying)
            Repaint();
    }
}
