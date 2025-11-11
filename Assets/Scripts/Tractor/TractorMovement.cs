using UnityEngine;

public class TractorMovement : MonoBehaviour
{
    public float speed = 5f;
    public float turnSpeed = 50f;

    void Update()
    {
        float move = Input.GetAxis("Vertical") * speed * Time.deltaTime;   // W/S o ↑/↓
        float turn = Input.GetAxis("Horizontal") * turnSpeed * Time.deltaTime; // A/D o ←/→

        // Mover hacia adelante o atrás
        transform.Translate(0, 0, -move);

        // Solo permitir girar si el tractor está moviéndose
        if (Mathf.Abs(move) > 0.01f)
        {
            transform.Rotate(0, turn, 0);
        }
    }
}
