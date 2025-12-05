import axios from 'axios'

// Usar variable de entorno o fallback a localhost
// const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000'
const API_URL = 'http://localhost:8000'

const API = axios.create({ 
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptor para manejo de errores
API.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

/**
 * Obtiene el estado actual de la simulación
 */
export async function getState() {
  try {
    const response = await API.get('/state')
    return response.data
  } catch (error) {
    console.error('Error getting state:', error)
    return null
  }
}

/**
 * Inicia el entrenamiento
 */
export async function startTrain(payload) {
  try {
    const response = await API.post('/train', payload)
    return response.data
  } catch (error) {
    console.error('Error starting training:', error)
    throw error
  }
}

/**
 * Detiene el entrenamiento
 */
export async function stopTrain() {
  try {
    const response = await API.post('/stop')
    return response.data
  } catch (error) {
    console.error('Error stopping training:', error)
    throw error
  }
}

/**
 * Actualiza parámetros
 */
export async function updateParams(params) {
  try {
    const response = await API.post('/params', params)
    return response.data
  } catch (error) {
    console.error('Error updating params:', error)
    throw error
  }
}

/**
 * Obtiene estadísticas
 */
export async function getStats() {
  try {
    const response = await API.get('/stats')
    return response.data
  } catch (error) {
    console.error('Error getting stats:', error)
    return { episodes: [] }
  }
}

/**
 * Guarda Q-tables
 */
export async function saveQ() {
  try {
    const response = await API.post('/save')
    console.log('✅ Q-tables saved:', response.data)
    return response.data
  } catch (error) {
    console.error('Error saving Q-tables:', error)
    throw error
  }
}

/**
 * Carga Q-tables
 */
export async function loadQ() {
  try {
    const response = await API.post('/load')
    console.log('✅ Q-tables loaded:', response.data)
    return response.data
  } catch (error) {
    console.error('Error loading Q-tables:', error)
    throw error
  }
}

/**
 * Ejecuta modelo entrenado
 */
export async function runTrainedModel() {
  try {
    const response = await API.post('/run-trained')
    console.log('✅ Trained model started:', response.data)
    return response.data
  } catch (error) {
    console.error('Error running trained model:', error)
    throw error
  }
}

/**
 * Detiene modelo entrenado
 */
export async function stopTrained() {
  try {
    const response = await API.post('/stop-trained')
    console.log('✅ Trained model stopped:', response.data)
    return response.data
  } catch (error) {
    console.error('Error stopping trained model:', error)
    throw error
  }
}

/**
 * Obtiene progreso de entrenamiento
 */
export async function getTrainingProgress() {
  try {
    const [state, stats] = await Promise.all([
      getState(),
      getStats()
    ])
    
    if (!state || !stats) return null
    
    const episodes = stats.episodes || []
    const lastEp = episodes[episodes.length - 1]
    
    return {
      state: state,
      isTraining: state?.meta?.is_training || false,
      isRunning: state?.meta?.is_running_trained || false,
      currentStep: state?.meta?.step || 0,
      totalHarvested: state?.meta?.harvested_total || 0,
      episodes: episodes,
      bestReward: stats?.best_reward || 0,
      bestEpisode: stats?.best_episode || 0,
      lastEpisode: lastEp
    }
  } catch (error) {
    console.error('Error getting training progress:', error)
    return null
  }
}

export default API