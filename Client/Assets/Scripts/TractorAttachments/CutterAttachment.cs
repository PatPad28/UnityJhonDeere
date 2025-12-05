using System;
using UnityEngine;

public class CutterAttachment : MonoBehaviour
{
    [Header("Configuration")]
    [Min(1)]
    public int Count = 1;
    public float Separation = 1.0f;
    public float RayDistance = 1.0f;

    public float HeightOffset = 0f;

    public GameObject PrefabCropOrigin;

    [Header("Activity")]
    public bool IsActive = true;

    void Awake()
    {

    }

    void FixedUpdate()
    {
        if (!IsActive) return;

        Vector3 from = transform.position + HeightOffset * transform.up;
        Vector3 direction = - transform.up;

        float offset = (Count - 1) * 0.5f * Separation;

        for (int i = 0; i < Count; i++)
        {
            Vector3 shift = transform.right * (i * Separation - offset);
            Ray ray = new Ray(from + shift, direction);

            RaycastHit[] hits = Physics.RaycastAll(ray, 100f);

            bool soilCollision = false;
            Vector3 soilCollisionPoint = Vector3.zero;
            bool cropCollision = false;
            foreach (RaycastHit hit in hits)
            {
                CropOrigin crop = hit.collider.GetComponent<CropOrigin>();
                if (crop != null)
                {
                    cropCollision = true;
                    break;
                }
                Soil soil = hit.collider.GetComponent<Soil>();
                if (soil != null)
                {
                    soilCollisionPoint = hit.point;
                    soilCollision = true;
                }
            }
            if (soilCollision && !cropCollision)
            {
                Instantiate(PrefabCropOrigin, soilCollisionPoint, Quaternion.identity);
            }
        }
    }

    void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.yellow;

        Vector3 from = transform.position + HeightOffset * transform.up;
        Vector3 to = transform.position - transform.up * RayDistance;

        float offset = (Count - 1) * 0.5f * Separation;

        for (int i = 0; i < Count; i++)
        {
            Vector3 shift = transform.right * (i * Separation - offset);
            Gizmos.DrawLine(from + shift, to + shift);
        }
    }
}
