using System.Collections.Generic;
using UnityEngine;

public class ManagerAgent : MonoBehaviour
{
    public List<Job> availableJobs = new List<Job>();
    public List<TractorAgent> allTractors = new List<TractorAgent>();
    public GameObject jobPrefab;
    private List<Bid> currentBids = new List<Bid>();
    private Job jobBeingBid;
    void Start()
    {
        Vector3 jobPos = new Vector3(10, 0, 10);
        GameObject marker = Instantiate(jobPrefab, jobPos, Quaternion.identity);
        Job harvestJob = new Job("Cosechar Campo A", jobPos, marker);
        availableJobs.Add(harvestJob);

        AnnounceJob(harvestJob);
    }

    void AnnounceJob(Job job)
    {
        Debug.Log("MANAGER: ¡Anunciando trabajo! " + job.jobName);
        jobBeingBid = job;
        job.status = Job.JobStatus.Bidding;

        foreach (TractorAgent tractor in allTractors)
        {
            tractor.ReceiveTaskAnnouncement(job);
        }

        Invoke("EvaluateBids", 2.0f);
    }

    public void SubmitBid(TractorAgent bidder, float bidValue)
    {
        Debug.Log($"MANAGER: Recibida oferta de {bidder.name} con valor {bidValue}");
        currentBids.Add(new Bid(bidder, bidValue));
    }

    void EvaluateBids()
    {
        if (currentBids.Count == 0)
        {
            Debug.Log("MANAGER: Nadie ofertó. Re-anunciando trabajo.");
            jobBeingBid.status = Job.JobStatus.Available;
            currentBids.Clear();
            AnnounceJob(jobBeingBid);
            return;
        }

        Bid bestBid = currentBids[0];
        foreach (Bid bid in currentBids)
        {
            if (bid.bidValue < bestBid.bidValue)
            {
                bestBid = bid;
            }
        }

        Debug.Log($"MANAGER: ¡Adjudicado! El ganador es {bestBid.bidder.name}");
        jobBeingBid.status = Job.JobStatus.Assigned;

        foreach (TractorAgent tractor in allTractors)
        {
            if (tractor == bestBid.bidder)
            {
                tractor.AwardJob(jobBeingBid);
            }
            else
            {
                tractor.LoseJob();
            }
        }
        
        currentBids.Clear();
    }
}
