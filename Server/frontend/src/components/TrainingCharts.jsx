import React, { useEffect, useState } from 'react'

const API_URL = 'http://localhost:8000'

export default function TrainingCharts() {
  const [stats, setStats] = useState({ episodes: [] })
  const [activeChart, setActiveChart] = useState('overview')

  useEffect(() => {
    let mounted = true
    async function loop() {
      try {
        const response = await fetch(`${API_URL}/stats`)
        const s = await response.json()
        if (!mounted) return
        setStats(s || { episodes: [] })
      } catch (e) {
        console.error('Error fetching stats:', e)
      }
      if (!mounted) return
      setTimeout(loop, 2000)
    }
    loop()
    return () => { mounted = false }
  }, [])

  const episodes = stats.episodes || []
  const lastEpisodes = episodes.slice(-50)

  const styles = {
    container: {
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      borderRadius: '20px',
      padding: '32px',
      border: '2px solid #334155',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.6)'
    },
    header: {
      marginBottom: '28px'
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#ffffff',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    tabs: {
      display: 'flex',
      gap: '12px',
      marginBottom: '24px',
      borderBottom: '2px solid #334155',
      paddingBottom: '12px'
    },
    tab: {
      padding: '12px 24px',
      borderRadius: '10px 10px 0 0',
      border: 'none',
      fontWeight: '600',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.3s',
      background: 'transparent',
      color: '#94a3b8'
    },
    tabActive: {
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      color: '#ffffff',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
    },
    chartContainer: {
      background: '#1e293b',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px',
      border: '1px solid #334155'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginTop: '24px'
    },
    statCard: {
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      textAlign: 'center',
      transition: 'all 0.3s'
    },
    statLabel: {
      fontSize: '13px',
      color: '#94a3b8',
      marginBottom: '10px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    statValue: {
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#ffffff'
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
        <div style={styles.title}>
          📊 Análisis de Entrenamiento
        </div>
        <div style={styles.emptyState}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📈</div>
          <div style={{ fontSize: '18px', fontWeight: '600' }}>No hay datos aún</div>
          <div style={{ marginTop: '8px' }}>Inicia el entrenamiento para ver las métricas</div>
        </div>
      </div>
    )
  }

  // Calcular métricas
  const totalEpisodes = episodes.length
  const avgReward = episodes.reduce((sum, ep) => sum + (ep.reward || 0), 0) / totalEpisodes
  const bestReward = stats.best_reward || 0
  const avgFuelEfficiency = episodes.reduce((sum, ep) => sum + (ep.avg_fuel_efficiency || 0), 0) / totalEpisodes
  const avgTimeSaved = episodes.reduce((sum, ep) => sum + (ep.time_saved_pct || 0), 0) / totalEpisodes
  const successRate = episodes.filter(ep => ep.task_complete).length / totalEpisodes * 100
  const totalFuelConsumed = episodes.reduce((sum, ep) => sum + (ep.fuel_consumed || 0), 0)

  // Calcular mejora
  const first10 = episodes.slice(0, 10)
  const last10 = episodes.slice(-10)
  const improvement = last10.length > 0 && first10.length > 0
    ? ((last10.reduce((s, e) => s + e.reward, 0) / last10.length) - 
       (first10.reduce((s, e) => s + e.reward, 0) / first10.length))
    : 0

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>
          📊 Análisis de Entrenamiento Multi-Agente
        </div>
        
        {/* Tabs */}
        <div style={styles.tabs}>
          {[
            { id: 'overview', label: '🎯 Visión General' },
            { id: 'fuel', label: '⛽ Combustible' },
            { id: 'efficiency', label: '⚡ Eficiencia' },
            { id: 'comparison', label: '📊 Comparación' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveChart(tab.id)}
              style={{
                ...styles.tab,
                ...(activeChart === tab.id ? styles.tabActive : {})
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Area */}
      <div style={styles.chartContainer}>
        {activeChart === 'overview' && <OverviewChart data={lastEpisodes} />}
        {activeChart === 'fuel' && <FuelChart data={lastEpisodes} />}
        {activeChart === 'efficiency' && <EfficiencyChart data={lastEpisodes} />}
        {activeChart === 'comparison' && <ComparisonChart data={episodes} />}
      </div>

      {/* Statistics Grid */}
      <div style={styles.statsGrid}>
        <div style={{...styles.statCard, border: '1px solid rgba(59, 130, 246, 0.5)'}}>
          <div style={styles.statLabel}>📚 Episodios</div>
          <div style={styles.statValue}>{totalEpisodes}</div>
        </div>

        <div style={{...styles.statCard, border: '1px solid rgba(34, 197, 94, 0.5)'}}>
          <div style={styles.statLabel}>💰 Mejor Reward</div>
          <div style={{...styles.statValue, color: '#22c55e'}}>{bestReward.toFixed(0)}</div>
        </div>

        <div style={{...styles.statCard, border: '1px solid rgba(245, 158, 11, 0.5)'}}>
          <div style={styles.statLabel}>⛽ Efic. Combustible</div>
          <div style={{...styles.statValue, color: '#f59e0b'}}>{avgFuelEfficiency.toFixed(1)}%</div>
        </div>

        <div style={{...styles.statCard, border: '1px solid rgba(139, 92, 246, 0.5)'}}>
          <div style={styles.statLabel}>⏱️ Tiempo Ahorrado</div>
          <div style={{...styles.statValue, color: '#8b5cf6'}}>{avgTimeSaved.toFixed(1)}%</div>
        </div>

        <div style={{...styles.statCard, border: '1px solid rgba(236, 72, 153, 0.5)'}}>
          <div style={styles.statLabel}>✅ Tasa de Éxito</div>
          <div style={{...styles.statValue, color: '#ec4899'}}>{successRate.toFixed(0)}%</div>
        </div>

        <div style={{...styles.statCard, border: '1px solid rgba(20, 184, 166, 0.5)'}}>
          <div style={styles.statLabel}>📈 Mejora</div>
          <div style={{
            ...styles.statValue, 
            color: improvement >= 0 ? '#14b8a6' : '#ef4444'
          }}>
            {improvement >= 0 ? '+' : ''}{improvement.toFixed(0)}
          </div>
        </div>
      </div>
    </div>
  )
}

// Gráfica de Visión General
function OverviewChart({ data }) {
  const canvasRef = React.useRef(null)

  React.useEffect(() => {
    if (!canvasRef.current || data.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)

    const rewards = data.map(d => d.reward || 0)
    const maxReward = Math.max(...rewards, 1)
    const minReward = Math.min(...rewards, 0)
    const range = maxReward - minReward

    const padding = 50
    const chartW = w - padding * 2
    const chartH = h - padding * 2

    // Fondo del gráfico
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(padding, padding, chartW, chartH)

    // Grid horizontal
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartH / 5) * i
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(w - padding, y)
      ctx.stroke()

      const value = maxReward - (range / 5) * i
      ctx.fillStyle = '#64748b'
      ctx.font = '12px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(value.toFixed(0), padding - 10, y + 4)
    }

    // Gradiente para área
    const gradient = ctx.createLinearGradient(0, padding, 0, h - padding)
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)')
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0)')

    // Área bajo la curva
    ctx.fillStyle = gradient
    ctx.beginPath()
    data.forEach((d, i) => {
      const x = padding + (chartW / (data.length - 1)) * i
      const y = h - padding - ((d.reward - minReward) / range) * chartH
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.lineTo(w - padding, h - padding)
    ctx.lineTo(padding, h - padding)
    ctx.closePath()
    ctx.fill()

    // Línea principal
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 3
    ctx.beginPath()
    data.forEach((d, i) => {
      const x = padding + (chartW / (data.length - 1)) * i
      const y = h - padding - ((d.reward - minReward) / range) * chartH
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Puntos
    data.forEach((d, i) => {
      const x = padding + (chartW / (data.length - 1)) * i
      const y = h - padding - ((d.reward - minReward) / range) * chartH
      
      ctx.fillStyle = '#1e293b'
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#3b82f6'
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    })

    // Título
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Curva de Aprendizaje - Recompensas', w / 2, 25)

  }, [data])

  return <canvas ref={canvasRef} width={900} height={350} style={{ width: '100%', height: 'auto' }} />
}

// Gráfica de Combustible
function FuelChart({ data }) {
  const canvasRef = React.useRef(null)

  React.useEffect(() => {
    if (!canvasRef.current || data.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)

    const fuelData = data.map(d => d.avg_fuel_efficiency || 0)
    const maxFuel = 100

    const padding = 50
    const chartW = w - padding * 2
    const chartH = h - padding * 2

    // Fondo
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(padding, padding, chartW, chartH)

    // Grid
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartH / 5) * i
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(w - padding, y)
      ctx.stroke()

      ctx.fillStyle = '#64748b'
      ctx.font = '12px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`${100 - i * 20}%`, padding - 10, y + 4)
    }

    // Línea de eficiencia
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 3
    ctx.beginPath()
    data.forEach((d, i) => {
      const x = padding + (chartW / (data.length - 1)) * i
      const y = h - padding - ((d.avg_fuel_efficiency || 0) / maxFuel) * chartH
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Puntos
    data.forEach((d, i) => {
      const x = padding + (chartW / (data.length - 1)) * i
      const y = h - padding - ((d.avg_fuel_efficiency || 0) / maxFuel) * chartH
      
      ctx.fillStyle = '#0f172a'
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#f59e0b'
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    })

    // Línea de referencia (80%)
    const refY = h - padding - (80 / maxFuel) * chartH
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(padding, refY)
    ctx.lineTo(w - padding, refY)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = '#22c55e'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('Meta: 80%', padding + 10, refY - 5)

    // Título
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('⛽ Eficiencia de Combustible por Episodio', w / 2, 25)

  }, [data])

  return <canvas ref={canvasRef} width={900} height={350} style={{ width: '100%', height: 'auto' }} />
}

// Gráfica de Eficiencia (Tiempo Ahorrado)
function EfficiencyChart({ data }) {
  const canvasRef = React.useRef(null)

  React.useEffect(() => {
    if (!canvasRef.current || data.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)

    const steps = data.map(d => d.steps || 0)
    const maxSteps = Math.max(...steps, 1)

    const padding = 50
    const chartW = w - padding * 2
    const chartH = h - padding * 2
    const barWidth = chartW / data.length

    // Fondo
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(padding, padding, chartW, chartH)

    // Barras
    data.forEach((d, i) => {
      const x = padding + barWidth * i
      const barH = (d.steps / maxSteps) * chartH
      const y = h - padding - barH

      const gradient = ctx.createLinearGradient(x, y, x, h - padding)
      gradient.addColorStop(0, '#8b5cf6')
      gradient.addColorStop(1, '#6d28d9')

      ctx.fillStyle = gradient
      ctx.fillRect(x + 2, y, barWidth - 4, barH)
    })

    // Título
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('⚡ Pasos por Episodio (Menos = Mejor)', w / 2, 25)

    ctx.fillStyle = '#94a3b8'
    ctx.font = '12px sans-serif'
    ctx.fillText('La optimización reduce el tiempo necesario para completar tareas', w / 2, h - 10)

  }, [data])

  return <canvas ref={canvasRef} width={900} height={350} style={{ width: '100%', height: 'auto' }} />
}

// Comparación
function ComparisonChart({ data }) {
  if (data.length < 20) {
    return (
      <div style={{ textAlign: 'center', padding: '80px', color: '#64748b' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
        <div style={{ fontSize: '16px' }}>Necesitas al menos 20 episodios para ver la comparación</div>
      </div>
    )
  }

  const first10 = data.slice(0, 10)
  const last10 = data.slice(-10)

  const avgFirst = {
    reward: first10.reduce((s, e) => s + e.reward, 0) / 10,
    fuelEff: first10.reduce((s, e) => s + (e.avg_fuel_efficiency || 0), 0) / 10,
    timeSaved: first10.reduce((s, e) => s + (e.time_saved_pct || 0), 0) / 10
  }

  const avgLast = {
    reward: last10.reduce((s, e) => s + e.reward, 0) / 10,
    fuelEff: last10.reduce((s, e) => s + (e.avg_fuel_efficiency || 0), 0) / 10,
    timeSaved: last10.reduce((s, e) => s + (e.time_saved_pct || 0), 0) / 10
  }

  const improvement = {
    reward: ((avgLast.reward - avgFirst.reward) / avgFirst.reward * 100).toFixed(1),
    fuelEff: ((avgLast.fuelEff - avgFirst.fuelEff) / avgFirst.fuelEff * 100).toFixed(1),
    timeSaved: ((avgLast.timeSaved - avgFirst.timeSaved) / Math.max(1, avgFirst.timeSaved) * 100).toFixed(1)
  }

  const compStyles = {
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '24px',
      padding: '20px'
    },
    card: {
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      padding: '24px',
      borderRadius: '16px',
      border: '2px solid #334155'
    },
    title: {
      fontSize: '16px',
      color: '#94a3b8',
      marginBottom: '20px',
      fontWeight: '600'
    },
    values: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '16px'
    },
    value: {
      textAlign: 'center'
    },
    valueLabel: {
      fontSize: '11px',
      color: '#64748b',
      marginBottom: '8px'
    },
    valueNumber: {
      fontSize: '28px',
      fontWeight: 'bold'
    },
    improvement: {
      fontSize: '18px',
      fontWeight: 'bold',
      textAlign: 'center',
      padding: '12px',
      borderRadius: '8px',
      background: 'rgba(59, 130, 246, 0.1)'
    }
  }

  return (
    <div>
      <h3 style={{ color: '#ffffff', textAlign: 'center', marginBottom: '30px', fontSize: '20px' }}>
        📊 Comparación: Primeros 10 vs Últimos 10 Episodios
      </h3>
      
      <div style={compStyles.grid}>
        {/* Reward */}
        <div style={compStyles.card}>
          <div style={compStyles.title}>💰 Recompensa</div>
          <div style={compStyles.values}>
            <div style={compStyles.value}>
              <div style={compStyles.valueLabel}>Primeros</div>
              <div style={{...compStyles.valueNumber, color: '#ef4444'}}>
                {avgFirst.reward.toFixed(0)}
              </div>
            </div>
            <div style={compStyles.value}>
              <div style={compStyles.valueLabel}>Últimos</div>
              <div style={{...compStyles.valueNumber, color: '#22c55e'}}>
                {avgLast.reward.toFixed(0)}
              </div>
            </div>
          </div>
          <div style={{
            ...compStyles.improvement,
            color: improvement.reward >= 0 ? '#22c55e' : '#ef4444'
          }}>
            {improvement.reward >= 0 ? '↑' : '↓'} {Math.abs(improvement.reward)}%
          </div>
        </div>

        {/* Fuel Efficiency */}
        <div style={compStyles.card}>
          <div style={compStyles.title}>⛽ Eficiencia Combustible</div>
          <div style={compStyles.values}>
            <div style={compStyles.value}>
              <div style={compStyles.valueLabel}>Primeros</div>
              <div style={{...compStyles.valueNumber, color: '#ef4444'}}>
                {avgFirst.fuelEff.toFixed(1)}%
              </div>
            </div>
            <div style={compStyles.value}>
              <div style={compStyles.valueLabel}>Últimos</div>
              <div style={{...compStyles.valueNumber, color: '#22c55e'}}>
                {avgLast.fuelEff.toFixed(1)}%
              </div>
            </div>
          </div>
          <div style={{
            ...compStyles.improvement,
            color: improvement.fuelEff >= 0 ? '#22c55e' : '#ef4444'
          }}>
            {improvement.fuelEff >= 0 ? '↑' : '↓'} {Math.abs(improvement.fuelEff)}%
          </div>
        </div>

        {/* Time Saved */}
        <div style={compStyles.card}>
          <div style={compStyles.title}>⏱️ Tiempo Ahorrado</div>
          <div style={compStyles.values}>
            <div style={compStyles.value}>
              <div style={compStyles.valueLabel}>Primeros</div>
              <div style={{...compStyles.valueNumber, color: '#ef4444'}}>
                {avgFirst.timeSaved.toFixed(1)}%
              </div>
            </div>
            <div style={compStyles.value}>
              <div style={compStyles.valueLabel}>Últimos</div>
              <div style={{...compStyles.valueNumber, color: '#22c55e'}}>
                {avgLast.timeSaved.toFixed(1)}%
              </div>
            </div>
          </div>
          <div style={{
            ...compStyles.improvement,
            color: improvement.timeSaved >= 0 ? '#22c55e' : '#ef4444'
          }}>
            {improvement.timeSaved >= 0 ? '↑' : '↓'} {Math.abs(improvement.timeSaved)}%
          </div>
        </div>
      </div>

      {/* Insights */}
      <div style={{
        marginTop: '32px',
        padding: '24px',
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.05) 100%)',
        borderRadius: '12px',
        border: '2px solid rgba(34, 197, 94, 0.3)'
      }}>
        <h4 style={{ color: '#22c55e', marginBottom: '16px', fontSize: '16px' }}>💡 Insights Clave</h4>
        <ul style={{ color: '#cbd5e1', lineHeight: '1.8', paddingLeft: '20px' }}>
          <li>El sistema aprende a maximizar recompensas optimizando rutas y decisiones</li>
          <li>La eficiencia de combustible mejora mediante planificación inteligente de viajes</li>
          <li>El tiempo ahorrado aumenta por la coordinación efectiva entre agentes</li>
          <li>La optimización reduce costos operativos y aumenta productividad</li>
        </ul>
      </div>
    </div>
  )
}