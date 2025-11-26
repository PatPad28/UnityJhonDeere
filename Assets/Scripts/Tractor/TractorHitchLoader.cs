using System.Net.Mail;
using UnityEngine;

public class TractorHitchLoader : MonoBehaviour
{
    [SerializeField] Transform FrontHitch;
    [SerializeField] Transform BackHitch;

    ITractorAttachment tractorAttachment;

    public void Attach(ITractorAttachment attachment, HitchType hitch)
    {
        var t = attachment.Root;
        if (t != null)
        {
            Transform target = hitch == HitchType.Front ? FrontHitch : BackHitch;

            t.SetParent(target);
            t.localPosition = Vector3.zero;
            t.localRotation = Quaternion.identity;
        }

        tractorAttachment?.OnDetach();
        tractorAttachment = attachment;
        tractorAttachment?.OnAttach(this);
    }
}
