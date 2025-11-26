using System.Collections.Generic;
using System.Net.Mail;
using UnityEngine;

public enum AttachmentType
{
    Cutter,
    Sprayer,
    Cultivator
}

[System.Serializable]
public class AttachmentEntry
{
    public AttachmentType type;
    public HitchType hitch;
    public GameObject prefab;
}

[CreateAssetMenu(fileName = "TractorAttachmentFactory", menuName = "Scriptable Objects/TractorAttachmentFactory")]
public class TractorAttachmentFactory : ScriptableObject
{
    [SerializeField] List<AttachmentEntry> attachments;

    public ITractorAttachment Create(AttachmentType type)
    {
        var entry = attachments.Find(e => e.type == type);
        if (entry == null) return null;

        var go = Instantiate(entry.prefab);
        return go.GetComponent<ITractorAttachment>();
    }

    public HitchType GetHitch(AttachmentType type)
    {
        var entry = attachments.Find(e => e.type == type);
        return entry != null ? entry.hitch : HitchType.Back;
    }
}
