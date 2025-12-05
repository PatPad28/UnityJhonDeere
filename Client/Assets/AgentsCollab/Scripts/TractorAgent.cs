// TractorAgent.cs
using UnityEngine;
using UnityEngine.AI;

[RequireComponent(typeof(NavMeshAgent))]
public class TractorAgent : MonoBehaviour
{
    public ManagerAgent manager;
    public Transform baseLocation;
    private NavMeshAgent navAgent;

    private enum State { Idle, Working }
    private State currentState = State.Idle;
    
    private Job assignedJob;

    void Start()
    {
        navAgent = GetComponent<NavMeshAgent>();
        if (!navAgent.isOnNavMesh)
        {
            Debug.LogError($"{name}: El agente no está en la NavMesh.");
        }
    }

    void Update()
    {
        if (!navAgent.isOnNavMesh) return;

        switch (currentState)
        {
            case State.Idle:
                GoTo(baseLocation.position);
                break;

            case State.Working:
                if (!navAgent.pathPending && navAgent.remainingDistance < 0.5f)
                {
                    Debug.Log($"<color=blue>{name}: ¡Trabajo completado!</color>");
                    if (assignedJob.jobMarker != null)
                    {
                        Destroy(assignedJob.jobMarker);
                    }
                    assignedJob = null;
                    currentState = State.Idle;
                }
                break;
        }
    }

    // --- CONTRACT NET (PASO 1) ---
    public void ReceiveTaskAnnouncement(Job job)
    {
        if (currentState == State.Idle)
        {
            NavMeshPath path = new NavMeshPath();
            float distance = float.MaxValue; 

            if (navAgent.isOnNavMesh && navAgent.CalculatePath(job.targetPosition, path))
            {
                distance = GetPathLength(path);
            }
           
            Debug.Log($"{name}: Calculando oferta para {job.jobName}. Distancia = {distance}");

            if (distance < float.MaxValue)
            {
                manager.SubmitBid(job, this, distance);
            }
            else
            {
                Debug.Log($"<color=red>{name}: No puedo calcular un camino a {job.jobName}. No ofertaré.</color>");
            }
        }
    }

    // --- CONTRACT NET (PASO 3) ---
    public void AwardJob(Job job)
    {
        // ¡Protección 1!
        if (currentState == State.Working)
        {
            Debug.Log($"<color=yellow>{name}: Ya estoy 'Working', no puedo aceptar {job.jobName}</color>");
            return; 
        }

        Debug.Log($"<color=blue>{name}: ¡Gané la licitación! Yendo a {job.jobName}</color>");
        this.assignedJob = job;
        currentState = State.Working; 
        GoTo(job.targetPosition);
    }

    public void LoseJob()
    {
        Debug.Log($"{name}: Perdí la licitación. Sigo esperando.");
    }
    
    // ¡¡LA FUNCIÓN CLAVE!!
    public bool IsIdle()
    {
        return currentState == State.Idle;
    }

    // --- Funciones de Utilidad ---
    
    void GoTo(Vector3 destination)
    {
        if (!navAgent.isOnNavMesh || (navAgent.destination == destination && !navAgent.isPathStale))
        {
             return;
        }
        if(navAgent.isOnNavMesh)
        {
            navAgent.SetDestination(destination);
        }
    }

    float GetPathLength(NavMeshPath path)
    {
        float length = 0.0f;
        if (path.status != NavMeshPathStatus.PathComplete)
        {
            return float.MaxValue;
        }
        for (int i = 0; i < path.corners.Length - 1; i++)
        {
            length += Vector3.Distance(path.corners[i], path.corners[i + 1]);
        }
        if (length == 0.0f)
        {
            return 0.01f;
        }
        return length;
    }
}