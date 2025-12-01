using UnityEngine;
using NativeWebSocket;
using System.Text;
using System.Collections.Generic;
using MiniJSON; // ← MiniJSON disponible más abajo

public class TractorClient : MonoBehaviour
{
    WebSocket ws;

    async void Start()
    {
        ws = new WebSocket("ws://localhost:8000/ws");

        ws.OnOpen += () => Debug.Log("🔌 Conectado a Python");
        ws.OnError += (e) => Debug.Log("❗ Error: " + e);
        ws.OnClose += (e) => Debug.Log("🔴 Conexión cerrada");

        ws.OnMessage += (bytes) =>
        {
            string json = Encoding.UTF8.GetString(bytes);

            // 📩 Mostrar JSON completo
            Debug.Log("\n📥 JSON recibido:\n" + json);

            // 🔍 Interpretar JSON dinámicamente y mostrar cada campo
            var data = Json.Deserialize(json) as Dictionary<string, object>;

            Debug.Log("\n📌 Datos procesados:");
            foreach (var item in data)
            {
                Debug.Log($"🔸 {item.Key}: {item.Value}");
            }
        };

        await ws.Connect();
    }

    void Update()
    {
        #if !UNITY_WEBGL || UNITY_EDITOR
            ws.DispatchMessageQueue();
        #endif
    }

    async void OnApplicationQuit()
    {
        await ws.Close();
    }
}
