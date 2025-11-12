using UnityEngine;

public class TractorAgent : MonoBehaviour
{
    public float speed = 5f;
    public ManagerAgent manager;
    private enum State { Idle, Bidding, Working, Returning }
    private State currentState = State.Idle;
    private Job assignedJob;

    void Update()
    {
        if (currentState == State.Working)
        {
            Vector3 target = assignedJob.targetPosition;
            transform.position = Vector3.MoveTowards(transform.position, target, speed * Time.deltaTime);

            if (Vector3.Distance(transform.position, target) < 0.5f)
            {
                Debug.Log($"{name}: ¡Trabajo completado!");
                Destroy(assignedJob.jobMarker);
                assignedJob = null;
                currentState = State.Idle; 
            }
        }
    }

    public void ReceiveTaskAnnouncement(Job job)
    {
        if (currentState == State.Idle)
        {
            currentState = State.Bidding;
            
            float distance = Vector3.Distance(transform.position, job.targetPosition);
            Debug.Log($"{name}: Calculando oferta. Distancia = {distance}");
            
            manager.SubmitBid(this, distance);
        }
    }

    public void AwardJob(Job job)
    {
        Debug.Log($"{name}: ¡Gané la licitación! Yendo al trabajo.");
        this.assignedJob = job;
        currentState = State.Working;
    }

    public void LoseJob()
    {
        Debug.Log($"{name}: Perdí la licitación. Sigo esperando.");
        currentState = State.Idle;
    }
}
