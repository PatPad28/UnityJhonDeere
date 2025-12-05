using UnityEditor;
using UnityEngine;
using static WheatCropsRenderer;

[CustomEditor(typeof(WheatCropsRenderer))]
public class WheatCropsRendererEditor : Editor
{
    const float sliderHeight = 18f;
    const float thumbWidth = 10f;

    public override void OnInspectorGUI()
    {
        base.OnInspectorGUI();

        var renderer = (WheatCropsRenderer)target;
        var points = renderer.MeshPoints;

        if (points == null)
            return;

        EditorGUILayout.Space(6);
        EditorGUILayout.LabelField("Multi-Point Slider: (from 0 to value)", EditorStyles.boldLabel);

        // DON’T draw if empty
        if (points.Length > 0)
        {
            DrawMultiSlider(points);
        }

        EditorGUILayout.Space(4);

        // LIST OF POINTS
        for (int i = 0; i < points.Length; i++)
        {
            EditorGUILayout.BeginHorizontal();
            points[i].Value = EditorGUILayout.Slider(points[i].Value, 0f, 1f);
            points[i].Mesh = (Mesh)EditorGUILayout.ObjectField(points[i].Mesh, typeof(Mesh), false);
            points[i].SubMeshIndex = EditorGUILayout.IntField(points[i].SubMeshIndex, GUILayout.Width(30));
            EditorGUILayout.EndHorizontal();
        }

        EditorGUILayout.Space(4);

        // BUTTONS INSIDE SLIDER AREA
        EditorGUILayout.BeginHorizontal();

        if (GUILayout.Button("+ Add Point", GUILayout.Height(22)))
        {
            AddPoint(renderer);
        }

        GUI.enabled = points.Length > 0;
        if (GUILayout.Button("- Remove Last", GUILayout.Height(22)))
        {
            RemovePoint(renderer);
        }
        GUI.enabled = true;

        EditorGUILayout.EndHorizontal();


        if (Application.isPlaying)
            Repaint();
    }

    void AddPoint(WheatCropsRenderer renderer)
    {
        var list = renderer.MeshPoints;
        float newValue = 0.5f;

        if (list.Length > 0)
            newValue = Mathf.Clamp01(list[list.Length - 1].Value + 0.1f);

        System.Array.Resize(ref list, list.Length + 1);
        list[list.Length - 1] = new WheatCropsRenderer.MeshGrowthPoint { Value = newValue, SubMeshIndex = 0 };

        renderer.MeshPoints = list;
        EditorUtility.SetDirty(renderer);
    }

    void RemovePoint(WheatCropsRenderer renderer)
    {
        var list = renderer.MeshPoints;
        if (list.Length == 0)
            return;

        System.Array.Resize(ref list, list.Length - 1);
        renderer.MeshPoints = list;
        EditorUtility.SetDirty(renderer);
    }


    void DrawMultiSlider(MeshGrowthPoint[] points)
    {
        Rect sliderRect = GUILayoutUtility.GetRect(0, sliderHeight);
        EditorGUI.DrawRect(sliderRect, new Color(0.18f, 0.18f, 0.18f));

        var lineRect = new Rect(
            sliderRect.x + 2,
            sliderRect.y + sliderRect.height * 0.5f - 1,
            sliderRect.width - 4,
            2
        );
        EditorGUI.DrawRect(lineRect, new Color(0.35f, 0.35f, 0.35f));

        Event e = Event.current;

        for (int i = 0; i < points.Length; i++)
        {
            float x = sliderRect.x + Mathf.Clamp01(points[i].Value) * sliderRect.width;
            Rect thumbRect = new Rect(x - thumbWidth * 0.5f, sliderRect.y, thumbWidth, sliderRect.height);

            EditorGUI.DrawRect(thumbRect, Color.cyan);

            if (e.type == EventType.MouseDown && thumbRect.Contains(e.mousePosition))
            {
                GUIUtility.hotControl = i + 1000;
                e.Use();
            }

            if (GUIUtility.hotControl == i + 1000)
            {
                if (e.type == EventType.MouseDrag)
                {
                    float t = Mathf.InverseLerp(sliderRect.x, sliderRect.xMax, e.mousePosition.x);
                    points[i].Value = Mathf.Clamp01(t);
                    GUI.changed = true;
                }

                if (e.type == EventType.MouseUp)
                    GUIUtility.hotControl = 0;
            }
        }

        System.Array.Sort(points, (a, b) => a.Value.CompareTo(b.Value));
    }
}
