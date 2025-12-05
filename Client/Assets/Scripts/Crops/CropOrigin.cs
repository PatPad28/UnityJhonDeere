using UnityEngine;

public class CropOrigin : MonoBehaviour
{
    public CropData CropData;

    [Min(1)]
    public float SecondsToGrow = 100f;

    void Awake()
    {
        CropData = new CropData { pos = transform.position, t = 0};
    }

    private void OnEnable()
    {
        CropEvents.Add(CropData);
        CropEvents.OnTimeElapsed += Grow;
    }

    private void OnDisable()
    {
        CropEvents.Remove(CropData);
        CropEvents.OnTimeElapsed -= Grow;
    }

    /// <summary>
    /// Make this CropData grow by 't' seconds.
    /// </summary>
    /// <param name="t"> seconds elapsed</param>
    private void Grow(float t)
    {
        CropData.t = Mathf.Clamp01(CropData.t + t / SecondsToGrow);

    }
}
