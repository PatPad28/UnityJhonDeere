import React, { useEffect, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'

const API_URL = 'http://localhost:8000'

export default function PresentationCharts() {
  const [stats, setStats] = useState({ episodes: [] })
  const [activeView, setActiveView] = useState('overview')

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch(`${API_URL}/stats`)
        const data = await response.json()
        setStats(data || { episodes: [] })
      } catch (e) {
        console.error('Error:', e)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 3000)
    return () => clearInterval(interval)
  }, [])

  const episodes = stats.episodes || []

  // Calcular métricas clave
  const totalEpisodes = episodes.length
  const avgReward = episodes.length > 0 
    ? episodes.reduce((sum, ep) => sum + (ep.reward || 0), 0) / episodes.length 
    : 0
  const bestReward = stats.best_reward || 0
  const successRate = episodes.filter(ep => ep.task_complete).length / Math.max(1, episodes.length) * 100
  
  // Datos para gráficas
  const rewardData = episodes.map(ep => ({
    episode: ep.episode,
    reward: ep.reward || 0,
    planted: ep.planted || 0,
    irrigated: ep.irrigated || 0,
    harvested: ep.harvested || 0
  }))

  const efficiencyData = episodes.map(ep => ({
    episode: ep.episode,
    steps: ep.steps || 0,
    statesLearned: ep.total_states_learned || 0,
    avgEpsilon: ep.avg_epsilon || 0
  }))

  // Comparación primeros vs últimos
  const first10 = episodes.slice(0, 10)
  const last10 = episodes.slice(-10)
  
  const comparisonData = [
    {
      name: 'Primeros 10',
      reward: first10.length > 0 ? first10.reduce((s, e) => s + e.reward, 0) / first10.length : 0,
      steps: first10.length > 0 ? first10.reduce((s, e) => s + e.steps, 0) / first10.length : 0,
      harvested: first10.length > 0 ? first10.reduce((s, e) => s + e.harvested, 0) / first10.length : 0
    },
    {
      name: 'Últimos 10',
      reward: last10.length > 0 ? last10.reduce((s, e) => s + e.reward, 0) / last10.length : 0,
      steps: last10.length > 0 ? last10.reduce((s, e) => s + e.steps, 0) / last10.length : 0,
      harvested: last10.length > 0 ? last10.reduce((s, e) => s + e.harvested, 0) / last10.length : 0
    }
  ]

  // Datos de radar (performance multidimensional)
  const radarData = [
    {
      metric: 'Recompensa',
      value: (avgReward / 1000) * 100,
      fullMark: 100
    },
    {
      metric: 'Eficiencia',
      value: episodes.length > 0 ? 100 - (episodes[episodes.length - 1]?.steps || 500) / 10 : 0,
      fullMark: 100
    },
    {
      metric: 'Éxito',
      value: successRate,
      fullMark: 100
    },
    {
      metric: 'Cosecha',
      value: episodes.length > 0 ? (episodes[episodes.length - 1]?.harvested || 0) / 2 : 0,
      fullMark: 100
    },
    {
      metric: 'Aprendizaje',
      value: episodes.length > 0 ? Math.min(100, (episodes[episodes.length - 1]?.total_states_learned || 0) / 50) : 0,
      fullMark: 100
    }
  ]

  const styles = {
    container: {
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      minHeight: '100vh',
      padding: '40px',
      color: '#fff'
    },
    header: {
      marginBottom: '40px',
      textAlign: 'center'
    },
    title: {
      fontSize: '42px',
      fontWeight: 'bold',
      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      marginBottom: '16px'
    },
    subtitle: {
      fontSize: '18px',
      color: '#94a3b8'
    },
    nav: {
      display: 'flex',
      gap: '12px',
      marginBottom: '40px',
      justifyContent: 'center'
    },
    navButton: {
      padding: '12px 24px',
      borderRadius: '12px',
      border: 'none',
      fontWeight: '600',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.3s',
      background: 'rgba(59, 130, 246, 0.1)',
      color: '#94a3b8',
      backdropFilter: 'blur(10px)'
    },
    navButtonActive: {
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      color: '#fff',
      boxShadow: '0 10px 20px rgba(59, 130, 246, 0.3)'
    },
    metricsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '24px',
      marginBottom: '40px'
    },
    metricCard: {
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      padding: '28px',
      borderRadius: '16px',
      border: '2px solid #334155',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
      textAlign: 'center'
    },
    metricIcon: {
      fontSize: '48px',
      marginBottom: '16px'
    },
    metricLabel: {
      fontSize: '14px',
      color: '#94a3b8',
      marginBottom: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '1px'
    },
    metricValue: {
      fontSize: '48px',
      fontWeight: 'bold',
      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent'
    },
    chartSection: {
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      borderRadius: '20px',
      padding: '32px',
      marginBottom: '32px',
      border: '2px solid #334155',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
    },
    chartTitle: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    chartsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
      gap: '32px'
    },
    emptyState: {
      textAlign: 'center',
      padding: '80px',
      color: '#64748b'
    }
  }

  if (episodes.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>📊 Sistema Multi-Agente Agrícola</div>
          <div style={styles.subtitle}>Análisis de Performance con Q-Learning</div>
        </div>
        <div style={styles.emptyState}>
          <div style={{ fontSize: '72px', marginBottom: '24px' }}>🌾</div>
          <h2>No hay datos disponibles</h2>
          <p>Inicia el entrenamiento para ver los resultados</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.title}>📊 Sistema Multi-Agente Agrícola</div>
        <div style={styles.subtitle}>Análisis de Performance con Q-Learning</div>
      </div>

      {/* Navigation */}
      <div style={styles.nav}>
        {['overview', 'learning', 'efficiency', 'comparison'].map(view => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            style={{
              ...styles.navButton,
              ...(activeView === view ? styles.navButtonActive : {})
            }}
          >
            {view === 'overview' && '📈 Overview'}
            {view === 'learning' && '🧠 Aprendizaje'}
            {view === 'efficiency' && '⚡ Eficiencia'}
            {view === 'comparison' && '🔄 Comparación'}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={styles.metricIcon}>🎯</div>
          <div style={styles.metricLabel}>Episodios</div>
          <div style={styles.metricValue}>{totalEpisodes}</div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricIcon}>💰</div>
          <div style={styles.metricLabel}>Mejor Reward</div>
          <div style={styles.metricValue}>{bestReward.toFixed(0)}</div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricIcon}>✅</div>
          <div style={styles.metricLabel}>Tasa de Éxito</div>
          <div style={styles.metricValue}>{successRate.toFixed(0)}%</div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricIcon}>🌾</div>
          <div style={styles.metricLabel}>Cosechado</div>
          <div style={styles.metricValue}>
            {episodes[episodes.length - 1]?.harvested || 0}
          </div>
        </div>
      </div>

      {/* Charts based on active view */}
      {activeView === 'overview' && (
        <>
          <div style={styles.chartSection}>
            <div style={styles.chartTitle}>
              📈 Curva de Aprendizaje - Recompensas por Episodio
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={rewardData}>
                <defs>
                  <linearGradient id="colorReward" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="episode" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    background: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="reward" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorReward)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={styles.chartSection}>
            <div style={styles.chartTitle}>
              🎯 Performance Multidimensional
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="metric" stroke="#94a3b8" />
                <PolarRadiusAxis stroke="#94a3b8" />
                <Radar 
                  name="Performance" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.6} 
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {activeView === 'learning' && (
        <>
          <div style={styles.chartSection}>
            <div style={styles.chartTitle}>
              🌱 Progreso del Ciclo Agrícola
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={rewardData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="episode" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    background: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Line type="monotone" dataKey="planted" stroke="#e74c3c" name="Plantado" strokeWidth={2} />
                <Line type="monotone" dataKey="irrigated" stroke="#3498db" name="Irrigado" strokeWidth={2} />
                <Line type="monotone" dataKey="harvested" stroke="#27ae60" name="Cosechado" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={styles.chartSection}>
            <div style={styles.chartTitle}>
              🧠 Estados Aprendidos por Episodio
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={efficiencyData}>
                <defs>
                  <linearGradient id="colorStates" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="episode" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    background: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="statesLearned" 
                  stroke="#8b5cf6" 
                  fillOpacity={1} 
                  fill="url(#colorStates)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {activeView === 'efficiency' && (
        <>
          <div style={styles.chartSection}>
            <div style={styles.chartTitle}>
              ⚡ Eficiencia - Pasos por Episodio
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={efficiencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="episode" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    background: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="steps" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ textAlign: 'center', marginTop: '16px', color: '#94a3b8' }}>
              ✨ Menos pasos = Mayor eficiencia
            </div>
          </div>

          <div style={styles.chartSection}>
            <div style={styles.chartTitle}>
              🔍 Exploración (Epsilon) por Episodio
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={efficiencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="episode" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    background: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }} 
                />
                <Line type="monotone" dataKey="avgEpsilon" stroke="#ec4899" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {activeView === 'comparison' && (
        <div style={styles.chartSection}>
          <div style={styles.chartTitle}>
            🔄 Mejora del Sistema: Primeros vs Últimos 10 Episodios
          </div>
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ 
                  background: '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '8px'
                }} 
              />
              <Legend />
              <Bar dataKey="reward" fill="#3b82f6" name="Recompensa" />
              <Bar dataKey="steps" fill="#22c55e" name="Pasos" />
              <Bar dataKey="harvested" fill="#ec4899" name="Cosechado" />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ 
            marginTop: '32px', 
            padding: '24px', 
            background: 'rgba(34, 197, 94, 0.1)', 
            borderRadius: '12px',
            border: '2px solid rgba(34, 197, 94, 0.3)'
          }}>
            <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>💡 Insights Clave</h3>
            <ul style={{ color: '#cbd5e1', lineHeight: '1.8' }}>
              <li>El sistema aprende a maximizar recompensas con el tiempo</li>
              <li>La eficiencia mejora (menos pasos para completar tareas)</li>
              <li>La producción agrícola se optimiza progresivamente</li>
              <li>Los agentes coordinan mejor sus acciones</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}