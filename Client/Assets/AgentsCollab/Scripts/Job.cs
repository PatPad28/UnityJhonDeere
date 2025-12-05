using UnityEngine;

public class Job
{
    public string jobName;
    public Vector3 targetPosition;
    public enum JobStatus { Available, Bidding, Assigned, Completed, Pending }
    public JobStatus status;
    public GameObject jobMarker;

    public Job(string jobName, Vector3 targetPosition, GameObject jobMarker)
    {
        this.jobName = jobName;
        this.targetPosition = targetPosition;
        this.status = JobStatus.Available;
        this.jobMarker = jobMarker;
    }
}
