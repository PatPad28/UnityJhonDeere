# 🚜 UnityJhonDeere - Sistema Multi-Agente para Simulación Agrícola

## 📋 Descripción del Proyecto

UnityJhonDeere es un sistema de simulación agrícola inteligente que utiliza múltiples agentes autónomos para gestionar tareas agrícolas mediante aprendizaje por refuerzo (Q-Learning). El proyecto combina un backend en Python (FastAPI), un frontend web interactivo (React + Vite), y una aplicación cliente de visualización 3D en Unity.

Los agentes aprenden a coordinar tareas de **plantación**, **cosecha** e **irrigación** en un entorno de granja virtual, optimizando el uso de combustible, capacidad de carga y eficiencia de producción.

---

## 🏗️ Estructura del Proyecto

```
UnityJhonDeere/
├── Client/                          # Aplicación Unity (Visualización 3D)
│   ├── Assets/
│   │   ├── Scripts/                 # Scripts C# para la simulación
│   │   ├── Scenes/                  # Escenas de Unity
│   │   ├── Prefabs/                 # Prefabs de agentes y objetos
│   │   ├── Materials/               # Materiales y texturas
│   │   ├── Models/                  # Modelos 3D
│   │   ├── WebSocket/               # Scripts de comunicación WebSocket
│   │   └── AgentsCollab/            # Lógica de colaboración de agentes
│   ├── Packages/                    # Paquetes y dependencias de Unity
│   ├── ProjectSettings/             # Configuración del proyecto Unity
│   └── UIElementsSchema/            # Esquemas UI
├── Server/                          # Servidor Backend y Frontend Web
│   ├── backend/                     # API FastAPI (Python)
│   │   ├── app/
│   │   │   ├── main.py              # Punto de entrada FastAPI + WebSocket
│   │   │   ├── agents.py            # Lógica de agentes (Q-Learning)
│   │   │   ├── env.py               # Entorno de simulación (grid world)
│   │   │   ├── config.py            # Configuración del sistema
│   │   │   ├── api.py               # Endpoints REST API
│   │   │   ├── train.py             # Sistema de entrenamiento
│   │   │   ├── train_state_machine.py # Máquina de estados para entrenamiento
│   │   │   ├── sim_manager.py       # Gestor de simulación
│   │   │   └── schemas.py           # Modelos de datos Pydantic
│   │   ├── saved/                   # Q-tables y estadísticas guardadas
│   │   │   ├── train_stats.json     # Métricas de entrenamiento
│   │   │   └── train_stats.toml     # Configuración de entrenamiento
│   │   └── requirements.txt         # Dependencias Python
│   └── frontend/                    # Dashboard Web (React + Vite)
│       ├── src/
│       │   ├── App.jsx              # Componente principal
│       │   ├── main.jsx             # Punto de entrada React
│       │   ├── styles.css           # Estilos globales
│       │   ├── api/
│       │   │   └── backend.js       # Cliente API para backend
│       │   ├── components/
│       │   │   ├── FieldGrid.jsx    # Visualización del grid
│       │   │   ├── ControlPanel.jsx # Panel de control
│       │   │   ├── TrainingCharts.jsx # Gráficas de entrenamiento
│       │   │   ├── BusinessMetrics.jsx # Métricas de negocio
│       │   │   ├── LearningCurve.jsx # Curvas de aprendizaje
│       │   │   └── PresentationsCharts.jsx # Gráficas de presentación
│       │   └── pages/
│       │       └── Dashboard.jsx    # Página principal del dashboard
│       ├── index.html               # HTML base
│       ├── package.json             # Dependencias Node.js
│       ├── vite.config.js           # Configuración de Vite
│       └── README_FRONTEND.md       # Documentación del frontend
├── Library/                         # Archivos de caché de Unity (generados)
├── Logs/                            # Logs del sistema
├── UserSettings/                    # Configuraciones de usuario Unity
├── .gitignore                       # Archivos ignorados por Git
└── README.md                        # Este archivo
```

## 🎯 Componentes Principales

### 🔧 Server/Backend (FastAPI + Python)

El backend es el cerebro del sistema, implementando:

- **FastAPI WebSocket**: Comunicación en tiempo real con Unity
- **Sistema Multi-Agente**: 6 agentes con roles especializados
    - 2 **Plantadores** (planter)
    - 2 **Cosechadores** (harvester)
    - 2 **Irrigadores** (irrigator)
- **Q-Learning**: Algoritmo de aprendizaje por refuerzo
- **Gestión de Recursos**: Combustible, capacidad de carga, recarga en graneros
- **Simulación de Cultivos**: Ciclo de vida (planted → irrigated -> harvestable)
- **API REST**: Endpoints para control, métricas y entrenamiento

#### Archivos Clave del Backend

- **`main.py`**: Servidor WebSocket que maneja la comunicación con Unity, ejecuta pasos de simulación y coordina acciones de agentes
- **`agents.py`**: Clase `FarmAgent` con lógica Q-Learning, roles, combustible y capacidades
- **`env.py`**: Clase `Environment` que maneja el grid world, cultivos, obstáculos y lógica de movimiento
- **`config.py`**: Configuración global (tamaño del grid, posiciones de graneros, parámetros de Q-Learning)
- **`train.py`**: Sistema de entrenamiento automático de agentes
- **`api.py`**: Endpoints REST para control del backend (`/start`, `/stop`, `/reset`, `/metrics`, etc.)

### 🌐 Server/Frontend (React + Vite)

Dashboard web interactivo con visualización en tiempo real:

- **FieldGrid**: Visualización 2D del grid con agentes, cultivos y obstáculos
- **ControlPanel**: Controles para iniciar/detener simulación y entrenamiento
- **TrainingCharts**: Gráficas de recompensas, pasos y eficiencia
- **BusinessMetrics**: Métricas de producción, costos y ROI
- **LearningCurve**: Evolución del aprendizaje de los agentes

### 🎮 Client (Unity 3D)

Aplicación de visualización 3D que:

- Se conecta al backend vía WebSocket
- Renderiza agentes, cultivos y entorno en 3D
- Muestra animaciones de movimiento y acciones
- Permite interacción visual con la simulación

---

## 📦 Requisitos del Sistema

### Requisitos Generales

- **Sistema Operativo**: Windows 10/11, macOS, Linux
- **Python**: 3.8 o superior
- **Node.js**: 16.x o superior
- **npm**: 8.x o superior
- **Unity**: 6000.2.10f1 (Editor)
- **Git**: Para clonar el repositorio

### Dependencias Python (Backend)

Las dependencias se encuentran en `Server/backend/requirements.txt`:

```txt
fastapi
uvicorn
uvicorn[standard]
pydantic
numpy
scipy
toml
python-multipart
aiofiles
```

### Dependencias Node.js (Frontend)

Las dependencias se encuentran en `Server/frontend/package.json`:

```json
{
    "dependencies": {
        "axios": "^1.4.0",
        "react": "^18.2.0",
        "react-dom": "^18.2.0"
    },
    "devDependencies": {
        "vite": "^5.0.0",
        "@vitejs/plugin-react": "^4.0.0"
    }
}
```

## 🚀 Instalación y Configuración

### 1️⃣ Clonar el Repositorio

```bash
git clone https://github.com/PatPad28/UnityJhonDeere.git
cd UnityJhonDeere
```

### 2️⃣ Configuración del Backend (Python)

#### Paso 1: Crear Entorno Virtual

```bash
cd Server\backend
python -m venv venv
```

#### Paso 2: Activar el Entorno Virtual

**En Windows (CMD):**

```bash
venv\Scripts\activate.bat
```

**En macOS/Linux:**

```bash
source venv/bin/activate
```

#### Paso 3: Instalar Dependencias

Con el entorno virtual activado:

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

Esto instalará todas las librerías necesarias:

- **fastapi**: Framework web moderno y rápido
- **uvicorn**: Servidor ASGI para FastAPI
- **pydantic**: Validación de datos
- **numpy**: Cálculos numéricos
- **scipy**: Herramientas científicas
- **toml**: Lectura/escritura de archivos TOML
- **python-multipart**: Soporte para form-data
- **aiofiles**: Operaciones de archivo asíncronas

### 3️⃣ Configuración del Frontend (React)

#### Paso 1: Navegar al Frontend

```bash
cd ..\frontend
```

#### Paso 2: Instalar Dependencias de Node.js

```bash
npm install
```

Esto instalará:

- **React** y **React DOM**: Librería de UI
- **Vite**: Bundler rápido y moderno
- **Axios**: Cliente HTTP para peticiones
- **@vitejs/plugin-react**: Plugin de React para Vite

### 4️⃣ Configuración del Cliente Unity

#### Paso 1: Abrir el Proyecto en Unity

1. Abre **Unity Hub**
2. Haz clic en **Add → Add project from disk**
3. Selecciona la carpeta `Client` del proyecto
4. Asegúrate de tener instalada la versión **Unity 6000.2.10f1**
5. Abre el proyecto

#### Paso 2: Configurar WebSocket

El cliente Unity se conecta automáticamente a `ws://localhost:8000/ws` cuando se ejecuta. Si necesitas cambiar la URL del servidor, busca los scripts de WebSocket en `Assets/WebSocket/`.

## ▶️ Ejecución del Sistema

### Orden de Ejecución Recomendado

Para que todo funcione correctamente, sigue este orden:

### 1️⃣ Iniciar el Backend

**Para el tablero 2D**
```bash
cd Server\backend
venv\Scripts\activate.bat
uvicorn app.api:app --reload
```

**Para unity en 3D**
```bash
cd Server\backend
venv\Scripts\activate.bat
uvicorn app.main:app --reload
```

**Salida esperada:**

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
✅ Q-Tables cargadas correctamente.
```

### 2️⃣ Iniciar el Frontend (Dashboard Web)

En una nueva terminal:

```bash
cd Server\frontend
npm run dev
```

**Salida esperada:**

```
 VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Abre tu navegador en `http://localhost:5173`

### 3️⃣ Iniciar Unity

1. Abre el proyecto Client en Unity Editor
2. Carga la escena principal desde `Assets/Scenes/FarmScene`
3. Haz clic en el botón Play ▶️
4. Unity se conectará automáticamente al backend vía WebSocket

## 🎮 Uso del Sistema

### 🌐 Dashboard Web (Frontend)

El dashboard cuenta con 2 pestañas principales:

---

#### 🎯 Pestaña "Simulación"

- **FieldGrid**: Visualización del grid 60x40 con:
    - 🟩 Células vacías
    - 🟥 Obstáculos
    - 🌱 Cultivos (planted, growing, mature, harvestable)
    - 🚜 Agentes de diferentes colores según su rol
    - 🏭 Graneros y almacenes

- **ControlPanel**: Botones de control:
    - ▶️ **Start Simulation**: Inicia la simulación en modo inferencia
    - ⏸️ **Pause**: Pausa la simulación
    - 🔄 **Reset**: Reinicia el entorno
    - 🔧 **Load Q-Tables**: Carga Q-tables guardadas

- **BusinessMetrics**: Métricas en tiempo real:
    - Total de cultivos cosechados
    - Combustible consumido
    - Eficiencia de cosecha
    - Coste operativo
    - ROI estimado

---

#### 📊 Pestaña "Entrenamiento"

- **TrainingCharts**: Gráficas de entrenamiento:
    - Recompensa acumulada por episodio
    - Pasos por episodio
    - Tasa de exploración (epsilon)
    - Convergencia del Q-Learning

- **ControlPanel de Entrenamiento**:
    - 🎓 **Start Training**: Inicia entrenamiento automático
    - 💾 **Save Q-Tables**: Guarda el estado actual
    - 📈 **View Stats**: Muestra estadísticas de entrenamiento

---

### 🎮 Cliente Unity

- **Vista 3D**: Observa la simulación en 3D con cámaras libres
- **Agentes**: Modelos 3D animados de tractores/maquinaria
- **Cultivos**: Visualización del crecimiento de plantas
