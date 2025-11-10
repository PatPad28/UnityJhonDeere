using UnityEngine;

public class CameraFollow : MonoBehaviour
{
    public Transform target;       // El tractor a seguir
    public Vector3 offset = new Vector3(0f, 5f, -10f); // Posición relativa
    public float smoothSpeed = 5f; // Velocidad de suavizado

    void LateUpdate()
    {
        if (target == null) return;

        // Posición deseada de la cámara
        Vector3 desiredPosition = target.position - target.TransformDirection(offset);

        // Movimiento suave hacia la posición deseada
        transform.position = Vector3.Lerp(transform.position, desiredPosition, smoothSpeed * Time.deltaTime);

        // La cámara mira al tractor
        transform.LookAt(target);
    }
}
