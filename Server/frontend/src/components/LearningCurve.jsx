import React, { useEffect, useState } from 'react'
import { getStats } from '../api/backend'

export default function LearningCurve() {
  const [stats, setStats] = useState({ episodes: [] })

  useEffect(() => {
    let mounted = true
    
    async function loop() {
      try {
        const s = await getStats()
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
  const lastEpisodes = episodes.slice(-5)

  const styles = {
    container: {
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid #334155',
      boxShadow: '0 10px 15px rgba(0, 0, 0, 0.3)'
    },
    title: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#ffffff',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
      marginBottom: '16px'
    },
    statCard: {
      background: 'rgba(59, 130, 246, 0.1)',
      padding: '12px',
      borderRadius: '8px',
      border: '1px solid rgba(59, 130, 246, 0.3)'
    },
    statLabel: {
      fontSize: '11px',
      color: '#94a3b8',
      marginBottom: '4px',
      fontWeight: '600'
    },
    statValue: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#ffffff'
    },
    episodeList: {
      background: '#0f172a',
      borderRadius: '8px',
      padding: '12px',
      border: '1px solid #334155'
    },
    episodeItem: {
      fontSize: '12px',
      color: '#cbd5e1',
      padding: '6px 0',
      borderBottom: '1px solid #1e293b',
      fontFamily: 'monospace'
    },
    emptyState: {
      textAlign: 'center',
      padding: '30px',
      color: '#64748b',
      fontSize: '14px'
    }
  }

  if (episodes.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.title}>
          📊 Estadísticas
        </div>
        <div style={styles.emptyState}>
          Sin datos de entrenamiento aún
        </div>
      </div>
    )
  }

  const totalEpisodes = episodes.length
  const avgReward = episodes.reduce((sum, ep) => sum + (ep.reward || 0), 0) / totalEpisodes
  const bestReward = stats.best_reward || 0
  const lastHarvested = episodes[episodes.length - 1]?.harvested || 0

  return (
    <div style={styles.container}>
      <div style={styles.title}>
        📊 Estadísticas
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Episodios</div>
          <div style={styles.statValue}>{totalEpisodes}</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Mejor</div>
          <div style={styles.statValue}>{bestReward.toFixed(0)}</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Promedio</div>
          <div style={styles.statValue}>{avgReward.toFixed(0)}</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>🌾 Cosecha</div>
          <div style={styles.statValue}>{lastHarvested}</div>
        </div>
      </div>

      <div style={styles.episodeList}>
        {lastEpisodes.slice().reverse().map((ep, idx) => (
          <div key={idx} style={styles.episodeItem}>
            Ep {ep.episode}: R={ep.reward?.toFixed(0)} | H={ep.harvested}
          </div>
        ))}
      </div>
    </div>
  )
}