using System;

public static class CropEvents
{
    public static event Action<CropData> OnCropAdded;
    public static event Action<CropData> OnCropRemoved;

    public static event Action<float> OnTimeElapsed;

    public static void Add(CropData crop) => OnCropAdded?.Invoke(crop);
    public static void Remove(CropData crop) => OnCropRemoved?.Invoke(crop);

    /// <summary>
    /// Time elapsed in seconds to make a plant grow.
    /// </summary>
    /// <param name="t">seconds elapsed</param>
    public static void TimeElapsed(float t) => OnTimeElapsed?.Invoke(t);
}