using UnityEngine;
using NativeWebSocket;

public class SocketTest : MonoBehaviour
{
    WebSocket websocket;

    [System.Serializable]
    public class PositionData
    {
        public float x;
        public float y;
        public float z;
    }
    async void Start()
    {
        websocket = new WebSocket("ws://127.0.0.1:8000/ws");

        websocket.OnOpen += () => Debug.Log("Conexión abierta con Python");
        websocket.OnError += (e) => Debug.Log("Error: " + e);
        websocket.OnClose += (e) => Debug.Log("Conexión cerrada");

        websocket.OnMessage += (bytes) =>
        {
            var message = System.Text.Encoding.UTF8.GetString(bytes);
            
            PositionData data = JsonUtility.FromJson<PositionData>(message);

            Vector3 targetPos = new Vector3(data.x, data.y, data.z);
            transform.position = Vector3.Lerp(transform.position, targetPos, Time.deltaTime * 20);
        };

        await websocket.Connect();
    }

    void Update()
    {
        #if !UNITY_WEBGL || UNITY_EDITOR
            websocket.DispatchMessageQueue();
        #endif
    }

    private async void OnApplicationQuit()
    {
        await websocket.Close();
    }
}
