using UnityEngine;

public class WheelRotation : MonoBehaviour
{
    [Header("Referencias de pivotes")]
    public Transform wheelFL_Pivot; // Eje de dirección delantero izquierdo
    public Transform wheelFR_Pivot; // Eje de dirección delantero derecho

    [Header("Referencias de ruedas")]
    public Transform wheelFL; // Rueda delantera izquierda (hija del pivot)
    public Transform wheelFR; // Rueda delantera derecha (hija del pivot)
    public Transform wheelRL; // Rueda trasera izquierda
    public Transform wheelRR; // Rueda trasera derecha

    [Header("Configuración")]
    public float wheelRadius = 0.35f;   // Radio de las ruedas
    public float steeringAngle = 25f;   // Ángulo máximo de dirección

    private Vector3 lastPosition;

    void Start()
    {
        lastPosition = transform.position;
    }

    void Update()
    {
        Vector3 movement = transform.position - lastPosition;
        float distance = movement.magnitude;

        // Cuánto deben girar las ruedas al avanzar
        float rotationAmount = (distance / (2 * Mathf.PI * wheelRadius)) * 360f;
        float direction = Vector3.Dot(movement.normalized, transform.forward) >= 0 ? 1f : -1f;

        // --- Ruedas que giran al rodar ---
        RotateWheel(wheelFL, rotationAmount * direction);
        RotateWheel(wheelFR, rotationAmount * direction);
        RotateWheel(wheelRL, rotationAmount * direction);
        RotateWheel(wheelRR, rotationAmount * direction);

        // --- Giro lateral (dirección) ---
        float steerInput = Input.GetAxis("Horizontal");
        float steerAngle = steerInput * steeringAngle;

        if (wheelFL_Pivot != null)
            wheelFL_Pivot.localRotation = Quaternion.Euler(0, steerAngle, 0);

        if (wheelFR_Pivot != null)
            wheelFR_Pivot.localRotation = Quaternion.Euler(0, steerAngle, 0);

        lastPosition = transform.position;
    }

    void RotateWheel(Transform wheel, float rotationAmount)
    {
        if (wheel != null)
        {
            // Rota sobre el eje local X
            wheel.Rotate(Vector3.right, rotationAmount, Space.Self);
        }
    }
}
