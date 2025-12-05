using NativeWebSocket;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using Unity.VisualScripting;
using UnityEngine;

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

    public GameObject grassPrefab;
    public GameObject dirtPrefab;

    public GameObject[] rockPrefabs;

    private float nextLogTime = 0f;
    public float logInterval = 5.0f;

    private GameObject[,] rockObstables;

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

    public class Parcel
    {
        public int minRow;
        public int maxRow;
        public int minCol;
        public int maxCol;
    }

    private Dictionary<int, GameObject> visualAgents = new Dictionary<int, GameObject>();
    private GameObject[,] visualGrid;
    private int gridRows = 0;
    private int gridCols = 0;

    private List<Parcel> parcels = null;
    private GameObject[,] soilGrid;

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
        float targetX = data.pos[0] * cellSize;
        float targetZ = data.pos[1] * cellSize;
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

        if (parcels == null)
        {
            parcels = DetectParcels(gridData);
            soilGrid = new GameObject[rows, cols];

            for (int r = 0; r < rows; r++)
            {
                for (int c = 0; c < cols; c++)
                {
                    bool inside = IsInParcel(r, c);

                    GameObject prefab = inside ? dirtPrefab : grassPrefab;
                    Vector3 pos = new Vector3(c * cellSize, -0.1f, r * cellSize);

                    soilGrid[r, c] = Instantiate(prefab, pos, Quaternion.identity);
                    soilGrid[r, c].transform.localScale = new Vector3(cellSize, cellSize, cellSize);
                }
            }
        }

        if (rockObstables == null)
        {
            rockObstables = new GameObject[rows, cols];
            for (int r = 0;r < rows; r++)
            {
                for (int c = 0; c < cols; c++)
                {
                    int type = gridData[r][c];

                    if (type == 1)
                    {
                        var rng = new System.Random();
                        var rock = rockPrefabs[rng.Next(rockPrefabs.Length)];

                        rockObstables[r, c] = Instantiate(rock, new Vector3(c * cellSize, 0, r * cellSize), Quaternion.identity);
                    }
                }
            }
        }

        for (int r = 0; r < rows; r++)
        {
            for (int c = 0; c < cols; c++)
            {
                int type = gridData[r][c];

                GameObject currentObj = visualGrid[r, c];

                if (type  == 0 || type == 3)
                {
                    if (currentObj != null)
                    {
                        Destroy(currentObj);
                        visualGrid[r, c] = null;
                    }
                }
                else if (type  ==  2)
                {
                    if (currentObj == null)
                    {
                        Vector3 pos = new Vector3(c * cellSize, 0, r * cellSize);
                        GameObject go = Instantiate(CropInstancerObject, Vector3.zero, Quaternion.identity);
                        CropBunchInstancer instancer = go.GetComponent<CropBunchInstancer>();
                        instancer.Init(new Vector2(pos.x, pos.z), cellSize*0.9f, cellSize*0.9f);
                        visualGrid[r, c] = go;
                    }
                }
            }
        }
    }

    private List<Parcel> DetectParcels(int[][] grid)
    {
        int rows = grid.Length;
        int cols = grid[0].Length;

        List<Parcel> result = new List<Parcel>();
        bool[,] visited = new bool[rows, cols];

        for (int r = 0; r < rows; r++)
        {
            for (int c = 0; c < cols; c++)
            {
                if (!visited[r, c] && grid[r][c] == 11) // enum border = 11
                {
                    int minR = r;
                    int maxR = r;
                    int minC = c;
                    int maxC = c;

                    Queue<(int, int)> q = new Queue<(int, int)>();
                    q.Enqueue((r, c));
                    visited[r, c] = true;

                    while (q.Count > 0)
                    {
                        var (cr, cc) = q.Dequeue();

                        minR = Mathf.Min(minR, cr);
                        maxR = Mathf.Max(maxR, cr);
                        minC = Mathf.Min(minC, cc);
                        maxC = Mathf.Max(maxC, cc);

                        int[] dr = { 1, -1, 0, 0 };
                        int[] dc = { 0, 0, 1, -1 };

                        for (int i = 0; i < 4; i++)
                        {
                            int nr = cr + dr[i];
                            int nc = cc + dc[i];

                            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols)
                            {
                                if (!visited[nr, nc] && grid[nr][nc] == 11) // enum border = 11
                                {
                                    visited[nr, nc] = true;
                                    q.Enqueue((nr, nc));
                                }
                            }
                        }
                    }

                    result.Add(new Parcel
                    {
                        minRow = minR,
                        maxRow = maxR,
                        minCol = minC,
                        maxCol = maxC
                    });
                }
            }
        }

        return result;
    }

    private bool IsInParcel(int row, int col)
    {
        if (parcels == null) return false;

        foreach (var p in parcels)
        {
            if (row > p.minRow && row < p.maxRow &&
                col > p.minCol && col < p.maxCol)
            {
                return true;
            }
        }
        return false;
    }


    private async void OnApplicationQuit()
    {
        await websocket.Close();
    }
}