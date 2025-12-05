// ManagerAgent.cs
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.Linq;

public class ManagerAgent : MonoBehaviour
{
    public List<Job> availableJobs = new List<Job>();
    public List<TractorAgent> allTractors = new List<TractorAgent>();
    public GameObject jobPrefab;
    public float jobSpawnRate = 0.5f;
    public float jobRequeueTime = 1.0f;

    private Dictionary<Job, List<Bid>> currentBids = new Dictionary<Job, List<Bid>>();

    void Start()
    {
        StartCoroutine(SpawnJobsCoroutine());
    }

    IEnumerator SpawnJobsCoroutine()
    {
        while (true)
        {
            yield return new WaitForSeconds(jobSpawnRate);

            float spawnX = Random.Range(-14.5f, 14.5f);
            float spawnZ = Random.Range(-14.5f, 14.5f);
            Vector3 jobPos = new Vector3(spawnX, 0, spawnZ);
            
            GameObject marker = Instantiate(jobPrefab, jobPos, Quaternion.identity);
            Job newJob = new Job($"Job-{Random.Range(100,999)}", jobPos, marker);
            
            availableJobs.Add(newJob);
            Debug.Log($"<color=green>MANAGER: ¡Nuevo trabajo publicado! {newJob.jobName}</color>");
        }
    }

    void Update()
    {
        List<Job> jobsToAnnounce = availableJobs.Where(j => j.status == Job.JobStatus.Available).ToList();

        if (jobsToAnnounce.Count > 0)
        {
            foreach (Job job in jobsToAnnounce)
            {
                AnnounceJob(job);
            }
        }
    }

    void AnnounceJob(Job job)
    {
        if (job.status != Job.JobStatus.Available) return;
        
        Debug.Log($"MANAGER: ¡Anunciando trabajo! {job.jobName}");
        job.status = Job.JobStatus.Bidding;

        if (!currentBids.ContainsKey(job))
        {
            currentBids.Add(job, new List<Bid>());
        }
        else
        {
            currentBids[job].Clear();
        }

        foreach (TractorAgent tractor in allTractors)
        {
            tractor.ReceiveTaskAnnouncement(job);
        }
        
        // ¡Baja este tiempo si quieres aún más caos!
        StartCoroutine(EvaluateBidsCoroutine(job, 0.1f)); 
    }

    public void SubmitBid(Job job, TractorAgent bidder, float bidValue)
    {
        if (currentBids.ContainsKey(job))
        {
            currentBids[job].Add(new Bid(bidder, bidValue));
        }
    }

    IEnumerator EvaluateBidsCoroutine(Job job, float delay)
    {
        yield return new WaitForSeconds(delay);

        if (!currentBids.ContainsKey(job))
        {
            yield break;
        }

        List<Bid> bids = currentBids[job];

        if (bids.Count == 0)
        {
            Debug.Log($"MANAGER: Nadie ofertó por {job.jobName}. Poniendo en espera.");
            job.status = Job.JobStatus.Pending;
            currentBids.Remove(job);
            StartCoroutine(RequeueJobCoroutine(job, jobRequeueTime));
            yield break;
        }

        Bid bestBid = bids[0];
        foreach (Bid bid in bids)
        {
            if (bid.bidValue < bestBid.bidValue)
            {
                bestBid = bid;
            }
        }

        // --- ¡LA DOBLE COMPROBACIÓN CRUCIAL! ---
        // Chequear si el ganador SIGUE disponible
        if (bestBid.bidder.IsIdle() == false)
        {
            Debug.Log($"<color=orange>MANAGER: El ganador {bestBid.bidder.name} ya estaba ocupado. Re-subastando {job.jobName}.</color>");
            job.status = Job.JobStatus.Pending; // Poner en espera
            currentBids.Remove(job);
            StartCoroutine(RequeueJobCoroutine(job, 1.0f)); // Re-subastar rápido
            yield break;
        }
        // ----------------------------------------

        // ¡Ahora sí! El ganador está confirmado
        Debug.Log($"<color=green>MANAGER: ¡Adjudicado! {job.jobName} es para {bestBid.bidder.name}</color>");
        job.status = Job.JobStatus.Assigned;
        availableJobs.Remove(job);

        foreach (TractorAgent tractor in allTractors)
        {
            if (tractor == bestBid.bidder)
            {
                tractor.AwardJob(job);
            }
            else
            {
                if (bids.Any(b => b.bidder == tractor))
                {
                    tractor.LoseJob();
                }
            }
        }
        
        currentBids.Remove(job);
    }
    
    IEnumerator RequeueJobCoroutine(Job job, float delay)
    {
        yield return new WaitForSeconds(delay);
        
        if (job.status == Job.JobStatus.Pending)
        {
            Debug.Log($"MANAGER: {job.jobName} vuelve a estar disponible.");
            job.status = Job.JobStatus.Available;
        }
    }
}