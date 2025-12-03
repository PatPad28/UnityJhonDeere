using UnityEngine;
using NativeWebSocket;
using System.Collections.Generic;
using Newtonsoft.Json;
using System;

public class FarmClient : MonoBehaviour
{
    WebSocket websocket;

    [Header("Configuración")]
    public string serverUrl = "ws://localhost:8000/ws";
    public float cellSize = 3.0f;

    [Header("Prefabs")]
    public GameObject planterPrefab;
    public GameObject harvesterPrefab;
    public GameObject irrigatorPrefab;
    public GameObject plantPrefab;
    public GameObject waterPrefab;
    public GameObject obstaclePrefab;

    public GameObject CropInstancerObject;

    private float nextLogTime = 0f;
    public float logInterval = 5.0f;

    private Dictionary<(int, int), GameObject> visualCropGrid = new Dictionary<(int, int), GameObject>();

    public class AgentData
    {
        public int id;
        public int[] pos;
        public string role;
        public float fuel_pct;
        public float capacity_pct;
        public bool is_returning;
        public bool is_fuel_critical;
    }

    public class ObjectivesData
    {
        public string planted;
        public string irrigated;
        public string harvested;
    }

    public class MetaData
    {
        public int step;
        public string cycle_phase;
        public ObjectivesData objectives;
    }

    public class WorldState
    {
        public int[][] grid;
        public List<AgentData> agents;
        public MetaData meta;
    }

    private Dictionary<int, GameObject> visualAgents = new Dictionary<int, GameObject>();
    private GameObject[,] visualGrid;
    private int gridRows = 0;
    private int gridCols = 0;

    async void Start()
    {
        websocket = new WebSocket(serverUrl);

        websocket.OnOpen += () => Debug.Log(" Conectado a Python");
        websocket.OnError += (e) => Debug.LogError("Error WS: " + e);
        websocket.OnClose += (e) => Debug.Log("Desconectado");

        websocket.OnMessage += (bytes) =>
        {
            string json = System.Text.Encoding.UTF8.GetString(bytes);

            if (Time.time >= nextLogTime)
            {
                Debug.Log($"=== JSON RECIBIDO (Tiempo: {Time.time:F1}) ===\n{json}");
                nextLogTime = Time.time + logInterval;
            }

            try {
                var state = JsonConvert.DeserializeObject<WorldState>(json);
                if (state != null) ProcessState(state);
            }
            catch (Exception e) { Debug.LogError("Error JSON: " + e.Message); }
        };

        await websocket.Connect();
    }

    void Update()
    {
        #if !UNITY_WEBGL || UNITY_EDITOR
            websocket.DispatchMessageQueue();
        #endif
    }

    void ProcessState(WorldState state)
    {
        if (state.agents != null)
        {
            foreach (var agentData in state.agents) UpdateAgent(agentData);
        }

        if (state.grid != null)
        {
            UpdateGrid(state.grid);
        }
        // 3. (Opcional) Actualizar UI con state.meta
        // Debug.Log($"Fase: {state.meta.cycle_phase} - Step: {state.meta.step}");
    }

    void UpdateAgent(AgentData data)
    {
        // Conversión de Coordenadas:
        // Python: [Fila (Y), Columna (X)]
        // Unity:  X = Columna, Z = Fila
        float targetX = data.pos[1] * cellSize;
        float targetZ = data.pos[0] * cellSize;
        Vector3 targetPos = new Vector3(targetX, 0, targetZ);

        if (visualAgents.ContainsKey(data.id))
        {
            GameObject obj = visualAgents[data.id];
            obj.transform.position = Vector3.Lerp(obj.transform.position, targetPos, Time.deltaTime * 10);
            
            Vector3 dir = targetPos - obj.transform.position;
            if (dir.sqrMagnitude > 0.01f)
            {
                Quaternion rot = Quaternion.LookRotation(dir);
                obj.transform.rotation = Quaternion.Slerp(obj.transform.rotation, rot, Time.deltaTime * 15);
            }
            
        }
        else
        {
            GameObject prefab = planterPrefab;
            if (data.role == "harvester") prefab = harvesterPrefab;
            if (data.role == "irrigator") prefab = irrigatorPrefab;

            GameObject newObj = Instantiate(prefab, targetPos, Quaternion.identity);
            newObj.name = $"Tractor_{data.role}_{data.id}";
            visualAgents.Add(data.id, newObj);
        }
    }

    void UpdateGrid(int[][] gridData)
    {
        int rows = gridData.Length;
        int cols = gridData[0].Length;

        if (visualGrid == null || gridRows != rows || gridCols != cols)
        {
            gridRows = rows;
            gridCols = cols;
            visualGrid = new GameObject[rows, cols];
        }

        for (int r = 0; r < rows; r++)
        {
            for (int c = 0; c < cols; c++)
            {
                int type = gridData[r][c];

                GameObject currentObj = visualGrid[r, c];
                
                if (type == 2)
                {
                    if (currentObj == null)
                    {
                        Vector3 pos = new Vector3(c * cellSize, 0, r * cellSize);
                        visualGrid[r, c] = Instantiate(plantPrefab, pos, Quaternion.identity);
                    }
                }
                else if (type == 5)
                {
                     if (currentObj == null)
                     {
                        Vector3 pos = new Vector3(c * cellSize, 0, r * cellSize);
                        visualGrid[r, c] = Instantiate(waterPrefab, pos, Quaternion.identity);
                     }
                }
                else
                {
                    if (currentObj != null)
                    {
                        Destroy(currentObj);
                        visualGrid[r, c] = null;
                    }
                }


            }
        }
    }

    private async void OnApplicationQuit()
    {
        await websocket.Close();
    }
}