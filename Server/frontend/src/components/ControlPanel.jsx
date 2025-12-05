import React, { useState, useEffect } from 'react'

const API_URL = 'http://localhost:8000'

export default function ControlPanel() {
  const [alpha, setAlpha] = useState(0.5)
  const [gamma, setGamma] = useState(0.95)
  const [eps, setEps] = useState(0.8)
  const [episodes, setEpisodes] = useState(50)
  const [steps, setSteps] = useState(2000)  // Aumentado para ciclo completo
  const [isTraining, setIsTraining] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [state, setState] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [mode, setMode] = useState('training')

  // Polling del estado
  useEffect(() => {
    async function fetchState() {
      try {
        const response = await fetch(`${API_URL}/state`)
        const data = await response.json()
        setState(data)
        
        if (data?.meta?.is_training) setIsTraining(true)
        else if (isTraining) setIsTraining(false)
        
        if (data?.meta?.is_running_trained) setIsRunning(true)
        else if (isRunning) setIsRunning(false)
      } catch (e) {
        console.error('Error fetching state:', e)
      }
    }

    fetchState()
    const interval = setInterval(fetchState, 1000)
    return () => clearInterval(interval)
  }, [])

  const addNotification = (message, type = 'info') => {
    const id = Date.now()
    setNotifications(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 5000)
  }

  const onStart = async () => {
    try {
      setMode('training')
      setIsTraining(true)
      const response = await fetch(`${API_URL}/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodes,
          steps_per_episode: steps,
          alpha,
          gamma,
          eps
        })
      })
      await response.json()
      addNotification(`🚀 Entrenamiento iniciado: ${episodes} episodios`, 'success')
    } catch (e) {
      setIsTraining(false)
      addNotification('❌ Error al iniciar entrenamiento', 'error')
    }
  }

  const onStop = async () => {
    try {
      await fetch(`${API_URL}/stop`, { method: 'POST' })
      setIsTraining(false)
      addNotification('⏹ Entrenamiento detenido', 'info')
    } catch (e) {
      addNotification('❌ Error al detener', 'error')
    }
  }

  const onSave = async () => {
    try {
      await fetch(`${API_URL}/save`, { method: 'POST' })
      addNotification('💾 Modelo guardado exitosamente', 'success')
    } catch (e) {
      addNotification('❌ Error al guardar', 'error')
    }
  }

  const onLoad = async () => {
    try {
      const response = await fetch(`${API_URL}/load`, { method: 'POST' })
      const result = await response.json()
      if (result.status === 'loaded') {
        addNotification('📂 Modelo cargado', 'success')
      } else {
        addNotification('⚠️ Modelo no encontrado', 'warning')
      }
    } catch (e) {
      addNotification('❌ Error al cargar', 'error')
    }
  }

  const onRunTrained = async () => {
    try {
      setMode('evaluate')
      setIsRunning(true)
      await fetch(`${API_URL}/run-trained`, { method: 'POST' })
      addNotification('▶️ Modelo ejecutándose', 'success')
    } catch (e) {
      setIsRunning(false)
      addNotification('❌ Error al ejecutar', 'error')
    }
  }

  const onStopTrained = async () => {
    try {
      await fetch(`${API_URL}/stop-trained`, { method: 'POST' })
      setIsRunning(false)
      addNotification('⏹ Ejecución detenida', 'info')
    } catch (e) {
      addNotification('❌ Error al detener', 'error')
    }
  }

  const meta = state?.meta || {}
  const agents = state?.agents || []

  // Calcular métricas agregadas
  const avgFuelPct = agents.length > 0 
    ? agents.reduce((sum, a) => sum + (a.fuel_pct || 0), 0) / agents.length 
    : 0
  const lowFuelAgents = agents.filter(a => a.is_fuel_low).length
  const criticalFuelAgents = agents.filter(a => a.is_fuel_critical).length

  const roleColors = {
    'planter': '#e74c3c',
    'harvester': '#27ae60',
    'irrigator': '#3498db'
  }

  const roleIcons = {
    'planter': '🌱',
    'harvester': '🌾',
    'irrigator': '💧'
  }

  const styles = {
    container: {
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      borderRadius: '20px',
      padding: '32px',
      border: '2px solid #334155',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
      maxWidth: '480px'
    },
    notifications: {
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    notification: {
      padding: '16px 24px',
      borderRadius: '12px',
      fontWeight: '600',
      fontSize: '14px',
      maxWidth: '380px',
      backdropFilter: 'blur(10px)',
      animation: 'slideIn 0.3s ease',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
    },
    notifSuccess: { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff' },
    notifError: { background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff' },
    notifInfo: { background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff' },
    notifWarning: { background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#fff' },

    header: { marginBottom: '28px' },
    title: {
      fontSize: '30px',
      fontWeight: 'bold',
      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      marginBottom: '12px'
    },

    modeToggle: {
      display: 'flex',
      gap: '12px',
      marginBottom: '28px'
    },
    modeButton: {
      flex: 1,
      padding: '14px',
      border: '2px solid',
      borderRadius: '12px',
      background: 'transparent',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '14px',
      transition: 'all 0.3s'
    },

    statusSection: {
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '28px',
      border: '1px solid #334155'
    },
    
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '12px',
      marginBottom: '20px'
    },
    statCard: {
      background: 'rgba(59, 130, 246, 0.1)',
      padding: '12px',
      borderRadius: '10px',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      textAlign: 'center'
    },
    statLabel: {
      fontSize: '10px',
      color: '#94a3b8',
      marginBottom: '6px',
      fontWeight: '600',
      textTransform: 'uppercase'
    },
    statValue: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#ffffff'
    },

    fuelAlert: {
      padding: '12px',
      borderRadius: '10px',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '13px',
      fontWeight: '600'
    },
    fuelAlertCritical: {
      background: 'rgba(239, 68, 68, 0.2)',
      border: '1px solid rgba(239, 68, 68, 0.5)',
      color: '#ef4444'
    },
    fuelAlertWarning: {
      background: 'rgba(245, 158, 11, 0.2)',
      border: '1px solid rgba(245, 158, 11, 0.5)',
      color: '#f59e0b'
    },
    fuelAlertGood: {
      background: 'rgba(34, 197, 94, 0.2)',
      border: '1px solid rgba(34, 197, 94, 0.5)',
      color: '#22c55e'
    },

    agentsList: { display: 'grid', gap: '10px', marginBottom: '20px' },
    agentCard: {
      background: '#1e293b',
      padding: '12px',
      borderRadius: '10px',
      border: '1px solid #334155',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '12px'
    },
    agentIcon: {
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px',
      border: '2px solid'
    },
    agentInfo: {
      flex: 1
    },
    agentName: {
      fontWeight: '600',
      color: '#ffffff',
      marginBottom: '4px'
    },
    agentBars: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    },
    barContainer: {
      flex: 1,
      height: '6px',
      background: '#0f172a',
      borderRadius: '3px',
      overflow: 'hidden'
    },
    bar: {
      height: '100%',
      borderRadius: '3px',
      transition: 'width 0.3s'
    },

    configSection: { marginBottom: '28px' },
    inputGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '14px'
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    label: { 
      fontSize: '12px', 
      fontWeight: '600', 
      color: '#94a3b8',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    input: {
      width: '100%',
      backgroundColor: '#1e293b',
      border: '2px solid #475569',
      borderRadius: '10px',
      padding: '10px 14px',
      color: '#ffffff',
      fontSize: '14px',
      outline: 'none',
      boxSizing: 'border-box',
      transition: 'border-color 0.3s'
    },

    buttonGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '14px',
      marginBottom: '14px'
    },
    button: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '14px',
      borderRadius: '12px',
      border: 'none',
      fontWeight: '600',
      fontSize: '13px',
      cursor: 'pointer',
      transition: 'all 0.3s',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    },
    buttonPrimary: { background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: '#fff' },
    buttonDanger: { background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff' },
    buttonInfo: { background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff' },
    buttonSecondary: { background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: '#fff' },
    buttonDisabled: { background: '#334155', color: '#64748b', cursor: 'not-allowed', opacity: 0.6 }
  }

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        input:focus {
          border-color: #3b82f6 !important;
        }
        button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
        }
      `}</style>

      {/* Notificaciones */}
      <div style={styles.notifications}>
        {notifications.map(notif => (
          <div
            key={notif.id}
            style={{
              ...styles.notification,
              ...(notif.type === 'success' && styles.notifSuccess),
              ...(notif.type === 'error' && styles.notifError),
              ...(notif.type === 'info' && styles.notifInfo),
              ...(notif.type === 'warning' && styles.notifWarning)
            }}
          >
            {notif.message}
          </div>
        ))}
      </div>

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.title}>⚙️ Panel de Control</div>
        </div>

        {/* Mode Toggle */}
        <div style={styles.modeToggle}>
          <button
            onClick={() => setMode('training')}
            style={{
              ...styles.modeButton,
              borderColor: mode === 'training' ? '#3b82f6' : '#475569',
              background: mode === 'training' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: mode === 'training' ? '#3b82f6' : '#94a3b8'
            }}
          >
            📚 Entrenar
          </button>
          <button
            onClick={() => setMode('evaluate')}
            style={{
              ...styles.modeButton,
              borderColor: mode === 'evaluate' ? '#3b82f6' : '#475569',
              background: mode === 'evaluate' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: mode === 'evaluate' ? '#3b82f6' : '#94a3b8'
            }}
          >
            🎬 Evaluar
          </button>
        </div>

        {/* Estado del Sistema */}
        {(isTraining || isRunning) && (
          <div style={styles.statusSection}>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#cbd5e1', marginBottom: '16px' }}>
              📊 Estado del Sistema
            </div>

            {/* Indicador de Fase */}
            <div style={{
              padding: '16px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              borderRadius: '12px',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>
                FASE ACTUAL DEL CICLO
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff' }}>
                {meta.metrics?.cycle_phase === 'planting' && '🌱 Plantando'}
                {meta.metrics?.cycle_phase === 'irrigating' && '💧 Irrigando'}
                {meta.metrics?.cycle_phase === 'harvesting' && '🌾 Cosechando'}
                {meta.metrics?.cycle_phase === 'complete' && '✅ Completado'}
                {!meta.metrics?.cycle_phase && '⏳ Iniciando...'}
              </div>
              {meta.metrics?.phase_progress !== undefined && (
                <div style={{ marginTop: '8px', fontSize: '14px', color: '#ffffff' }}>
                  Progreso: {meta.metrics.phase_progress.toFixed(0)}%
                </div>
              )}
            </div>

            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Paso</div>
                <div style={styles.statValue}>{meta.step || 0}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Plantado</div>
                <div style={styles.statValue}>{meta.planted_total || 0}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Cosechado</div>
                <div style={styles.statValue}>{meta.harvested_total || 0}</div>
              </div>
            </div>

            {/* Alerta de Combustible */}
            {criticalFuelAgents > 0 ? (
              <div style={{...styles.fuelAlert, ...styles.fuelAlertCritical}}>
                🔴 {criticalFuelAgents} agente(s) con combustible crítico
              </div>
            ) : lowFuelAgents > 0 ? (
              <div style={{...styles.fuelAlert, ...styles.fuelAlertWarning}}>
                ⚠️ {lowFuelAgents} agente(s) con combustible bajo
              </div>
            ) : (
              <div style={{...styles.fuelAlert, ...styles.fuelAlertGood}}>
                ✅ Todos los agentes con buen nivel de combustible
              </div>
            )}

            {/* Lista de Agentes */}
            <div style={styles.agentsList}>
              {agents.slice(0, 3).map(agent => (
                <div key={agent.id} style={styles.agentCard}>
                  <div
                    style={{
                      ...styles.agentIcon,
                      background: roleColors[agent.role],
                      borderColor: agent.is_fuel_critical ? '#ef4444' : roleColors[agent.role]
                    }}
                  >
                    {roleIcons[agent.role]}
                  </div>
                  <div style={styles.agentInfo}>
                    <div style={styles.agentName}>
                      Agente {agent.id} - {agent.role}
                    </div>
                    <div style={styles.agentBars}>
                      <div style={styles.barContainer}>
                        <div 
                          style={{
                            ...styles.bar,
                            width: `${agent.fuel_pct || 0}%`,
                            background: agent.fuel_pct > 30 ? '#22c55e' : agent.fuel_pct > 10 ? '#f59e0b' : '#ef4444'
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '11px', color: '#94a3b8', minWidth: '35px' }}>
                        {agent.fuel_pct || 0}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Eficiencia Promedio */}
            <div style={{
              padding: '12px',
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: '10px',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                EFICIENCIA PROMEDIO
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
                {meta.avg_fuel_efficiency?.toFixed(1) || 0}%
              </div>
            </div>
          </div>
        )}

        {/* Configuración */}
        {mode === 'training' && !isTraining && (
          <div style={styles.configSection}>
            <div style={styles.inputGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Episodios</label>
                <input
                  type="number"
                  value={episodes}
                  onChange={e => setEpisodes(+e.target.value)}
                  style={styles.input}
                  min="1"
                  max="1000"
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Pasos/Ep</label>
                <input
                  type="number"
                  value={steps}
                  onChange={e => setSteps(+e.target.value)}
                  style={styles.input}
                  min="100"
                  max="3000"
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Alpha (α)</label>
                <input
                  type="number"
                  value={alpha}
                  onChange={e => setAlpha(+e.target.value)}
                  style={styles.input}
                  min="0.01"
                  max="1"
                  step="0.01"
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Gamma (γ)</label>
                <input
                  type="number"
                  value={gamma}
                  onChange={e => setGamma(+e.target.value)}
                  style={styles.input}
                  min="0.01"
                  max="1"
                  step="0.01"
                />
              </div>

              <div style={{...styles.inputGroup, gridColumn: 'span 2'}}>
                <label style={styles.label}>Epsilon (ε)</label>
                <input
                  type="number"
                  value={eps}
                  onChange={e => setEps(+e.target.value)}
                  style={styles.input}
                  min="0.01"
                  max="1"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        )}

        {/* Botones de Control */}
        <div style={styles.buttonGrid}>
          <button
            onClick={isTraining ? onStop : onStart}
            disabled={isRunning}
            style={{
              ...styles.button,
              ...(isRunning ? styles.buttonDisabled : isTraining ? styles.buttonDanger : styles.buttonPrimary)
            }}
          >
            {isTraining ? '⏹ Detener' : '▶️ Entrenar'}
          </button>

          <button
            onClick={isRunning ? onStopTrained : onRunTrained}
            disabled={isTraining}
            style={{
              ...styles.button,
              ...(isTraining ? styles.buttonDisabled : isRunning ? styles.buttonDanger : styles.buttonInfo)
            }}
          >
            {isRunning ? '⏹ Detener' : '🎬 Evaluar'}
          </button>
        </div>

        <div style={styles.buttonGrid}>
          <button
            onClick={onSave}
            style={{ ...styles.button, ...styles.buttonSecondary }}
          >
            💾 Guardar
          </button>
          <button
            onClick={onLoad}
            style={{ ...styles.button, ...styles.buttonInfo }}
          >
            📂 Cargar
          </button>
        </div>
      </div>
    </>
  )
}