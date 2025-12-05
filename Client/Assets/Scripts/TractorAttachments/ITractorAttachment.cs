using UnityEngine;

public interface ITractorAttachment
{
    Transform Root { get; }

    void OnAttach(TractorHitchLoader tractor);
    void OnDetach();
}
