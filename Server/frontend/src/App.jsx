import React, { useState } from 'react'
import FieldGrid from './components/FieldGrid'
import ControlPanel from './components/ControlPanel'
import TrainingCharts from './components/TrainingCharts'
import BusinessMetrics from './components/BusinessMetrics'
import LearningCurve from './components/LearningCurve'

export default function App() {
  const [activeTab, setActiveTab] = useState('simulation')

  const styles = {
    app: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0f1e 0%, #1a1f35 50%, #0a0f1e 100%)',
      padding: '20px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    },
    header: {
      textAlign: 'center',
      marginBottom: '32px',
      padding: '32px 20px',
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)',
      borderRadius: '20px',
      border: '2px solid #334155',
      backdropFilter: 'blur(10px)'
    },
    title: {
      fontSize: '48px',
      fontWeight: 'bold',
      background: 'linear-gradient(135deg, #22c55e 0%, #14b8a6 50%, #3b82f6 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      marginBottom: '12px',
      textShadow: '0 0 40px rgba(34, 197, 94, 0.3)'
    },
    subtitle: {
      fontSize: '20px',
      color: '#94a3b8',
      marginBottom: '24px'
    },
    description: {
      fontSize: '15px',
      color: '#cbd5e1',
      maxWidth: '800px',
      margin: '0 auto',
      lineHeight: '1.6'
    },
    tabs: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'center',
      marginBottom: '32px',
      flexWrap: 'wrap'
    },
    tab: {
      padding: '14px 28px',
      borderRadius: '12px',
      border: '2px solid',
      background: 'transparent',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '15px',
      transition: 'all 0.3s',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    tabActive: {
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      borderColor: '#3b82f6',
      color: '#ffffff',
      boxShadow: '0 8px 20px rgba(59, 130, 246, 0.4)'
    },
    tabInactive: {
      borderColor: '#475569',
      color: '#94a3b8',
      background: 'rgba(30, 41, 59, 0.3)'
    },
    content: {
      maxWidth: '1600px',
      margin: '0 auto'
    },
    gridLayout: {
      display: 'grid',
      gridTemplateColumns: '1fr 480px',
      gap: '24px',
      alignItems: 'start'
    },
    mainArea: {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    },
    sidePanel: {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      position: 'sticky',
      top: '20px'
    },
    fullWidth: {
      width: '100%'
    },
    footer: {
      marginTop: '48px',
      padding: '24px',
      textAlign: 'center',
      background: 'rgba(15, 23, 42, 0.6)',
      borderRadius: '16px',
      border: '1px solid #334155'
    },
    footerText: {
      color: '#64748b',
      fontSize: '14px'
    },
    badge: {
      display: 'inline-block',
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      marginLeft: '8px'
    },
    badgeNew: {
      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
      color: '#ffffff'
    }
  }

  const tabs = [
    { id: 'simulation', label: '🎮 Simulación', icon: '🎮' },
    { id: 'analytics', label: '📊 Análisis', icon: '📊' },
    { id: 'business', label: '💼 Impacto Negocio', icon: '💼' }
  ]

  return (
    <div style={styles.app}>

      {/* Tabs */}
      <div style={styles.tabs}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : styles.tabInactive)
            }}
            onMouseEnter={e => {
              if (activeTab !== tab.id) {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.borderColor = '#3b82f6'
              }
            }}
            onMouseLeave={e => {
              if (activeTab !== tab.id) {
                e.target.style.transform = 'translateY(0)'
                e.target.style.borderColor = '#475569'
              }
            }}
          >
            <span style={{ fontSize: '20px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {activeTab === 'simulation' && (
          <div style={styles.gridLayout}>
            <div style={styles.mainArea}>
              <FieldGrid />
              <LearningCurve />
            </div>
            <div style={styles.sidePanel}>
              <ControlPanel />
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div style={styles.fullWidth}>
            <TrainingCharts />
          </div>
        )}

        {activeTab === 'business' && (
          <div style={styles.fullWidth}>
            <BusinessMetrics />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerText}>
          <strong>Sistema Multi-Agente con Q-Learning</strong> • 
          Optimización de Recursos Agrícolas • 
          Análisis de ROI y Sostenibilidad
        </div>
        <div style={{ ...styles.footerText, marginTop: '8px', fontSize: '12px' }}>
          Desarrollado con React + Python FastAPI • 
          Aprendizaje por Refuerzo • 
          Gestión Inteligente de Combustible
        </div>
      </footer>
    </div>
  )
}