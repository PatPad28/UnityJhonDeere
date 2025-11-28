using UnityEngine;
using NativeWebSocket;

public class MultiAgentSocket : MonoBehaviour
{
    public GameObject[] agents; // ← necesitas 2 objetos en escena
    WebSocket ws;

    [System.Serializable]
    public class AgentData
    {
        public float x, y, z;
    }

    async void Start()
    {
        ws = new WebSocket("ws://127.0.0.1:8000/ws");

        ws.OnOpen += () => Debug.Log("Conexión abierta con Python");
        ws.OnError += (e) => Debug.Log("Error: " + e);
        ws.OnClose += (e) => Debug.Log("Conexión cerrada");

        ws.OnMessage += (bytes) =>
        {
            string json = System.Text.Encoding.UTF8.GetString(bytes);
            AgentData[] data = JsonHelper.FromJson<AgentData>(json);

            for(int i=0; i<data.Length; i++)
            {
                Vector3 target = new Vector3(data[i].x, data[i].y, data[i].z);
                agents[i].transform.position = Vector3.Lerp(
                    agents[i].transform.position, target, Time.deltaTime*10);
            }
        };

        await ws.Connect();
    }

    void Update() { ws.DispatchMessageQueue(); }
}

public static class JsonHelper {
    public static T[] FromJson<T>(string json) {
        string wrapper = "{\"Items\":" + json + "}";
        return JsonUtility.FromJson<Wrapper<T>>(wrapper).Items;
    }
    [System.Serializable]
    private class Wrapper<T> { public T[] Items; }
}
