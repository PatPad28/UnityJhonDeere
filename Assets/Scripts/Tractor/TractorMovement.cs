using UnityEngine;

public class TractorMovement : MonoBehaviour
{
    public float speed = 5f;
    public float turnSpeed = 50f;

    void Update()
    {
        float move = Input.GetAxis("Vertical") * speed * Time.deltaTime;   // W/S o ↑/↓
        float turn = Input.GetAxis("Horizontal") * turnSpeed * Time.deltaTime; // A/D o ←/→

        transform.Translate(0, 0, -move);
        transform.Rotate(0, turn, 0);
    }
}
