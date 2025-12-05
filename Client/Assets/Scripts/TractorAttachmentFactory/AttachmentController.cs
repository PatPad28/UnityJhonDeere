using UnityEngine;

public class AttachmentController : MonoBehaviour
{
    public TractorHitchLoader selected;
    public TractorAttachmentFactory factory;

    public void Equip(AttachmentType type)
    {
        if (selected == null) return;

        var att = factory.Create(type);
        var hitch = factory.GetHitch(type);

        selected.Attach(att, hitch);
    }
}
