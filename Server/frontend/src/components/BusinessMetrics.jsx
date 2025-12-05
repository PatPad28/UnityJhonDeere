import React, { useEffect, useState } from 'react'

const API_URL = 'http://localhost:8000'

export default function BusinessMetrics() {
  const [stats, setStats] = useState({ episodes: [] })
  const [state, setState] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, stateRes] = await Promise.all([
          fetch(`${API_URL}/stats`),
          fetch(`${API_URL}/state`)
        ])
        const statsData = await statsRes.json()
        const stateData = await stateRes.json()
        setStats(statsData || { episodes: [] })
        setState(stateData)
      } catch (e) {
        console.error('Error fetching data:', e)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [])

  const episodes = stats.episodes || []

  // Calcular métricas de negocio
  const calculateBusinessMetrics = () => {
    if (episodes.length === 0) return null

    const lastEpisode = episodes[episodes.length - 1]
    const avgFuelEfficiency = episodes.reduce((sum, ep) => sum + (ep.avg_fuel_efficiency || 0), 0) / episodes.length
    const avgTimeSaved = episodes.reduce((sum, ep) => sum + (ep.time_saved_pct || 0), 0) / episodes.length
    const totalHarvested = episodes.reduce((sum, ep) => sum + (ep.harvested || 0), 0)
    
    // Cálculos de ROI (simulados)
    const fuelCostPerUnit = 3.5 // USD por unidad de combustible
    const hourlyLaborCost = 25 // USD por hora
    const cropValuePerUnit = 15 // USD por cultivo cosechado

    // Combustible ahorrado (comparado con baseline del 50% de eficiencia)
    const baselineEfficiency = 50
    const fuelSavingsPercent = Math.max(0, avgFuelEfficiency - baselineEfficiency)
    const fuelCostSavings = (fuelSavingsPercent / 100) * fuelCostPerUnit * 1000 // Por 1000 operaciones

    // Tiempo ahorrado en dinero
    const timeSavingsValue = (avgTimeSaved / 100) * hourlyLaborCost * 40 // 40 horas base

    // Productividad aumentada
    const productivityIncrease = totalHarvested * cropValuePerUnit

    // ROI total (retorno en 6 meses simulado)
    const implementationCost = 5000 // Costo inicial estimado
    const monthlySavings = fuelCostSavings + timeSavingsValue
    const sixMonthSavings = monthlySavings * 6
    const roi = ((sixMonthSavings - implementationCost) / implementationCost) * 100

    // Reducción de emisiones de CO2 (1 unidad combustible ≈ 2.3 kg CO2)
    const co2Reduction = (fuelSavingsPercent / 100) * 2.3 * 1000

    return {
      fuelEfficiency: avgFuelEfficiency,
      timeSaved: avgTimeSaved,
      fuelCostSavings: fuelCostSavings,
      timeSavingsValue: timeSavingsValue,
      productivityValue: productivityIncrease,
      roi: roi,
      co2Reduction: co2Reduction,
      monthlySavings: monthlySavings,
      annualSavings: monthlySavings * 12,
      paybackPeriod: implementationCost / Math.max(1, monthlySavings)
    }
  }

  const metrics = calculateBusinessMetrics()

  const styles = {
    container: {
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      borderRadius: '20px',
      padding: '32px',
      border: '2px solid #334155',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.6)'
    },
    header: {
      marginBottom: '32px',
      textAlign: 'center'
    },
    title: {
      fontSize: '32px',
      fontWeight: 'bold',
      background: 'linear-gradient(135deg, #22c55e 0%, #14b8a6 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      marginBottom: '12px'
    },
    subtitle: {
      fontSize: '16px',
      color: '#94a3b8'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '20px',
      marginBottom: '32px'
    },
    card: {
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      padding: '28px',
      borderRadius: '16px',
      border: '2px solid',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
      transition: 'all 0.3s'
    },
    cardIcon: {
      fontSize: '48px',
      marginBottom: '16px'
    },
    cardLabel: {
      fontSize: '14px',
      color: '#94a3b8',
      marginBottom: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '1px'
    },
    cardValue: {
      fontSize: '42px',
      fontWeight: 'bold',
      marginBottom: '8px'
    },
    cardSubtext: {
      fontSize: '13px',
      color: '#64748b'
    },
    roiSection: {
      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.05) 100%)',
      padding: '32px',
      borderRadius: '16px',
      border: '2px solid rgba(34, 197, 94, 0.3)',
      marginBottom: '32px'
    },
    roiTitle: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#22c55e',
      marginBottom: '24px',
      textAlign: 'center'
    },
    roiGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px'
    },
    roiCard: {
      background: 'rgba(15, 23, 42, 0.5)',
      padding: '20px',
      borderRadius: '12px',
      textAlign: 'center',
      border: '1px solid rgba(34, 197, 94, 0.2)'
    },
    benefitsList: {
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      padding: '32px',
      borderRadius: '16px',
      border: '2px solid #334155'
    },
    benefitsTitle: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#ffffff',
      marginBottom: '24px'
    },
    benefit: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '16px',
      marginBottom: '20px',
      padding: '16px',
      background: 'rgba(59, 130, 246, 0.05)',
      borderRadius: '12px',
      border: '1px solid rgba(59, 130, 246, 0.2)'
    },
    benefitIcon: {
      fontSize: '32px',
      minWidth: '40px'
    },
    benefitContent: {
      flex: 1
    },
    benefitTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#ffffff',
      marginBottom: '8px'
    },
    benefitText: {
      fontSize: '14px',
      color: '#94a3b8',
      lineHeight: '1.6'
    },
    emptyState: {
      textAlign: 'center',
      padding: '80px',
      color: '#64748b'
    }
  }

  if (!metrics) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>💼 Impacto de Negocio</div>
        </div>
        <div style={styles.emptyState}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📊</div>
          <div style={{ fontSize: '18px', fontWeight: '600' }}>No hay datos disponibles</div>
          <div style={{ marginTop: '8px' }}>Entrena el modelo para ver el análisis de ROI</div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.title}>💼 Impacto de Negocio y ROI</div>
        <div style={styles.subtitle}>
          Análisis cuantitativo del valor generado por la optimización
        </div>
      </div>

      {/* Métricas Principales */}
      <div style={styles.grid}>
        <div style={{...styles.card, borderColor: '#22c55e'}}>
          <div style={styles.cardIcon}>💰</div>
          <div style={styles.cardLabel}>Ahorro Mensual</div>
          <div style={{...styles.cardValue, color: '#22c55e'}}>
            ${metrics.monthlySavings.toFixed(0)}
          </div>
          <div style={styles.cardSubtext}>En costos operativos</div>
        </div>

        <div style={{...styles.card, borderColor: '#3b82f6'}}>
          <div style={styles.cardIcon}>⚡</div>
          <div style={styles.cardLabel}>Tiempo Ahorrado</div>
          <div style={{...styles.cardValue, color: '#3b82f6'}}>
            {metrics.timeSaved.toFixed(1)}%
          </div>
          <div style={styles.cardSubtext}>Reducción en tiempo de operación</div>
        </div>

        <div style={{...styles.card, borderColor: '#f59e0b'}}>
          <div style={styles.cardIcon}>⛽</div>
          <div style={styles.cardLabel}>Eficiencia Combustible</div>
          <div style={{...styles.cardValue, color: '#f59e0b'}}>
            {metrics.fuelEfficiency.toFixed(1)}%
          </div>
          <div style={styles.cardSubtext}>Optimización vs baseline</div>
        </div>

        <div style={{...styles.card, borderColor: '#14b8a6'}}>
          <div style={styles.cardIcon}>🌱</div>
          <div style={styles.cardLabel}>CO₂ Reducido</div>
          <div style={{...styles.cardValue, color: '#14b8a6'}}>
            {metrics.co2Reduction.toFixed(0)} kg
          </div>
          <div style={styles.cardSubtext}>Impacto ambiental positivo</div>
        </div>
      </div>

      {/* Sección ROI */}
      <div style={styles.roiSection}>
        <div style={styles.roiTitle}>📈 Retorno de Inversión (ROI)</div>
        <div style={styles.roiGrid}>
          <div style={styles.roiCard}>
            <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
              ROI (6 meses)
            </div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#22c55e' }}>
              {metrics.roi.toFixed(0)}%
            </div>
          </div>

          <div style={styles.roiCard}>
            <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
              Ahorro Anual
            </div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#22c55e' }}>
              ${metrics.annualSavings.toFixed(0)}
            </div>
          </div>

          <div style={styles.roiCard}>
            <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
              Periodo de Recuperación
            </div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#22c55e' }}>
              {metrics.paybackPeriod.toFixed(1)} meses
            </div>
          </div>
        </div>
      </div>

      {/* Beneficios Clave */}
      <div style={styles.benefitsList}>
        <div style={styles.benefitsTitle}>🎯 Beneficios Clave del Sistema</div>

        <div style={styles.benefit}>
          <div style={styles.benefitIcon}>💡</div>
          <div style={styles.benefitContent}>
            <div style={styles.benefitTitle}>Optimización Inteligente de Rutas</div>
            <div style={styles.benefitText}>
              Los agentes aprenden las rutas más eficientes, reduciendo el consumo de combustible 
              y minimizando el desgaste de maquinaria. Esto se traduce en ahorros directos de 
              ${metrics.fuelCostSavings.toFixed(0)}/mes.
            </div>
          </div>
        </div>

        <div style={styles.benefit}>
          <div style={styles.benefitIcon}>⏱️</div>
          <div style={styles.benefitContent}>
            <div style={styles.benefitTitle}>Reducción de Tiempos Operativos</div>
            <div style={styles.benefitText}>
              El sistema completa las tareas {metrics.timeSaved.toFixed(1)}% más rápido que métodos 
              tradicionales, liberando recursos para otras actividades y aumentando la productividad 
              general de la operación.
            </div>
          </div>
        </div>

        <div style={styles.benefit}>
          <div style={styles.benefitIcon}>🤝</div>
          <div style={styles.benefitContent}>
            <div style={styles.benefitTitle}>Coordinación Multi-Agente</div>
            <div style={styles.benefitText}>
              Los agentes coordinan sus acciones automáticamente, evitando colisiones y optimizando 
              el uso del espacio. Esto elimina tiempos muertos y mejora la eficiencia operativa.
            </div>
          </div>
        </div>

        <div style={styles.benefit}>
          <div style={styles.benefitIcon}>📊</div>
          <div style={styles.benefitContent}>
            <div style={styles.benefitTitle}>Toma de Decisiones Basada en Datos</div>
            <div style={styles.benefitText}>
              El sistema aprende continuamente de sus acciones, mejorando su desempeño con cada 
              operación. Las métricas en tiempo real permiten ajustes inmediatos y decisiones 
              informadas.
            </div>
          </div>
        </div>

        <div style={styles.benefit}>
          <div style={styles.benefitIcon}>🌍</div>
          <div style={styles.benefitContent}>
            <div style={styles.benefitTitle}>Sostenibilidad Ambiental</div>
            <div style={styles.benefitText}>
              La reducción de {metrics.co2Reduction.toFixed(0)}kg de CO₂ contribuye a prácticas 
              agrícolas más sostenibles. Esto no solo beneficia al medio ambiente, sino que también 
              mejora la imagen corporativa y cumple con regulaciones ambientales.
            </div>
          </div>
        </div>

        <div style={styles.benefit}>
          <div style={styles.benefitIcon}>🔄</div>
          <div style={styles.benefitContent}>
            <div style={styles.benefitTitle}>Escalabilidad y Adaptabilidad</div>
            <div style={styles.benefitText}>
              El sistema puede adaptarse fácilmente a diferentes tamaños de campo y tipos de 
              cultivo. Su arquitectura modular permite agregar más agentes según las necesidades 
              operativas sin requerir rediseño completo.
            </div>
          </div>
        </div>
      </div>

      {/* Conclusión */}
      <div style={{
        marginTop: '32px',
        padding: '24px',
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
        borderRadius: '16px',
        border: '2px solid rgba(59, 130, 246, 0.3)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '12px' }}>
          💎 Recomendación
        </div>
        <div style={{ fontSize: '15px', color: '#cbd5e1', lineHeight: '1.7' }}>
          La implementación de este sistema multi-agente con Q-Learning ofrece un ROI de{' '}
          <strong style={{ color: '#22c55e' }}>{metrics.roi.toFixed(0)}%</strong> en solo 6 meses, 
          con un periodo de recuperación de{' '}
          <strong style={{ color: '#22c55e' }}>{metrics.paybackPeriod.toFixed(1)} meses</strong>.
          Además de los ahorros económicos directos, se obtienen beneficios en sostenibilidad, 
          eficiencia operativa y capacidad de adaptación a condiciones cambiantes.
        </div>
      </div>
    </div>
  )
}