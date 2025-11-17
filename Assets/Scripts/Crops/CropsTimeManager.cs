using UnityEngine;

public class CropsTimeManager : MonoBehaviour
{
    public float TimeScale = 1f;

    public  bool IsPlaying = true;

    void FixedUpdate()
    {
        if (IsPlaying)
        {
            CropEvents.TimeElapsed(Time.fixedDeltaTime * TimeScale);
        }
    }
}
