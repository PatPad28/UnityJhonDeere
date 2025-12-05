import React, { useRef, useEffect, useState } from 'react'

const API_URL = 'http://localhost:8000'

export default function FieldGrid({ simFrames = null }) {
  const canvasRef = useRef(null)
  const [gridData, setGridData] = useState(null)
  const [isPaused, setIsPaused] = useState(false)
  const [showUI, setShowUI] = useState(true)
  const [showFuel, setShowFuel] = useState(true)

  // Polling en tiempo real
  useEffect(() => {
    if (simFrames || isPaused) return
    let mounted = true
    
    async function loop() {
      try {
        const response = await fetch(`${API_URL}/state`)
        const data = await response.json()
        if (!mounted) return
        setGridData(data)
      } catch (e) {
        console.error('Error getting state:', e)
      }
      if (!mounted) return
      setTimeout(loop, 300)
    }
    
    loop()
    return () => { mounted = false }
  }, [simFrames, isPaused])

  // Dibujo del canvas
  useEffect(() => {
    if (!gridData || !gridData.grid) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const grid = gridData.grid
    const h = grid.length
    const w = grid[0]?.length || 0
    
    if (w === 0 || h === 0) return
    
    const tile = 14

    const DPR = window.devicePixelRatio || 1
    canvas.style.width = (w * tile) + 'px'
    canvas.style.height = (h * tile) + 'px'
    canvas.width = Math.floor(w * tile * DPR)
    canvas.height = Math.floor(h * tile * DPR)
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0)

    // === FONDO GENERAL ===
    ctx.fillStyle = '#5a6e4a'
    ctx.fillRect(0, 0, w * tile, h * tile)

    // === DIBUJAR CELDAS ===
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = grid[y][x]
        const px = x * tile
        const py = y * tile

        if (v === 0) { // TIERRA
          ctx.fillStyle = '#a0826d'
          ctx.fillRect(px, py, tile, tile)
          
        } else if (v === 1) { // OBSTÁCULO
          ctx.fillStyle = '#505050'
          ctx.fillRect(px, py, tile, tile)
          ctx.fillStyle = '#404040'
          ctx.fillRect(px + 2, py + 2, tile - 4, tile - 4)
          
        } else if (v === 2) { // CULTIVO
          ctx.fillStyle = '#6b8e4e'
          ctx.fillRect(px, py, tile, tile)
          
          ctx.fillStyle = '#8bc34a'
          ctx.beginPath()
          ctx.arc(px + tile/2, py + tile/2, tile * 0.35, 0, Math.PI * 2)
          ctx.fill()
          
        } else if (v === 3) { // COSECHADO
          ctx.fillStyle = '#d4a76a'
          ctx.fillRect(px, py, tile, tile)
          
        } else if (v === 11) { // BORDE DE PARCELA
          ctx.fillStyle = '#654321'
          ctx.fillRect(px, py, tile, tile)
          
          // Efecto de madera
          ctx.strokeStyle = '#8b5a2b'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(px, py + tile/3)
          ctx.lineTo(px + tile, py + tile/3)
          ctx.moveTo(px, py + 2*tile/3)
          ctx.lineTo(px + tile, py + 2*tile/3)
          ctx.stroke()
          
        } else if (v === 6) { // GRANERO PLANTADORES
          drawBarn(ctx, px, py, tile, '#e74c3c')
          
        } else if (v === 7) { // GRANERO COSECHADORES
          drawBarn(ctx, px, py, tile, '#27ae60')
          
        } else if (v === 8) { // GRANERO IRRIGADORES
          drawBarn(ctx, px, py, tile, '#3498db')
          
        } else if (v === 4) { // ALMACÉN
          drawBarn(ctx, px, py, tile, '#f39c12')
          
        } else if (v === 5) { // AGUA
          ctx.fillStyle = '#3498db'
          ctx.fillRect(px, py, tile, tile)
        }
      }
    }

    // Grid sutil
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)'
    ctx.lineWidth = 0.5
    for (let x = 0; x <= w; x++) {
      ctx.beginPath()
      ctx.moveTo(x * tile, 0)
      ctx.lineTo(x * tile, h * tile)
      ctx.stroke()
    }
    for (let y = 0; y <= h; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * tile)
      ctx.lineTo(w * tile, y * tile)
      ctx.stroke()
    }

    // === AGENTES ===
    const agents = (gridData.agents || []).map((ag, idx) => ({
      id: ag.id ?? idx,
      pos: Array.isArray(ag.pos) ? ag.pos : [ag.pos?.[0] || 0, ag.pos?.[1] || 0],
      role: ag.role || 'general',
      capacity_pct: ag.capacity_pct || 100,
      fuel_pct: ag.fuel_pct || 100,
      is_returning: ag.is_returning || false,
      is_fuel_low: ag.is_fuel_low || false,
      is_fuel_critical: ag.is_fuel_critical || false
    }))

    agents.forEach((ag) => {
      const colors = {
        'planter': '#e74c3c',
        'harvester': '#27ae60',
        'irrigator': '#3498db'
      }
      const color = colors[ag.role] || '#95a5a6'
      const [ax, ay] = ag.pos

      // Sombra del agente
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'
      ctx.shadowBlur = 4
      ctx.shadowOffsetX = 1
      ctx.shadowOffsetY = 1

      // Círculo del agente
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(ax * tile + tile/2, ay * tile + tile/2, tile * 0.45, 0, Math.PI * 2)
      ctx.fill()

      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0

      // Borde
      ctx.strokeStyle = ag.is_fuel_critical ? '#ff0000' : '#ffffff'
      ctx.lineWidth = ag.is_fuel_critical ? 2.5 : 1.5
      ctx.stroke()

      // Ícono
      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${tile * 0.5}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      const icons = {
        'planter': ag.is_returning ? '↩' : '🌱',
        'harvester': ag.is_returning ? '↩' : '🌾',
        'irrigator': ag.is_returning ? '↩' : '💧'
      }
      
      ctx.fillText(
        icons[ag.role] || '🤖',
        ax * tile + tile/2,
        ay * tile + tile/2
      )

      // Barra de combustible (si showFuel está activo)
      if (showFuel) {
        const barW = tile * 0.8
        const barH = 3
        const barX = ax * tile + tile/2 - barW/2
        const barY = ay * tile - 4

        // Fondo de la barra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        ctx.fillRect(barX, barY, barW, barH)

        // Barra de combustible con color según nivel
        let fuelColor = '#22c55e'
        if (ag.fuel_pct <= 30) fuelColor = '#f59e0b'
        if (ag.fuel_pct <= 10) fuelColor = '#ef4444'

        ctx.fillStyle = fuelColor
        ctx.fillRect(barX, barY, barW * (ag.fuel_pct / 100), barH)
      }
    })

    // === UI PANEL ===
    if (showUI) {
      drawInfoPanel(ctx, w, h, tile, agents, gridData)
    }

    // === LABELS DE PARCELAS ===
    drawParcelLabels(ctx, w, h, tile)

    // Funciones auxiliares
    function drawBarn(ctx, x, y, size, color) {
      // Base del granero
      ctx.fillStyle = '#8b5a3c'
      ctx.fillRect(x, y + size * 0.3, size, size * 0.7)
      
      // Techo
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(x, y + size * 0.3)
      ctx.lineTo(x + size/2, y)
      ctx.lineTo(x + size, y + size * 0.3)
      ctx.closePath()
      ctx.fill()

      // Puerta
      ctx.fillStyle = '#654321'
      ctx.fillRect(x + size * 0.35, y + size * 0.55, size * 0.3, size * 0.4)
    }

    function drawParcelLabels(ctx, w, h, tile) {
      // Parcela 1 (Izquierda)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.font = 'bold 16px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
      ctx.shadowBlur = 3
      ctx.fillText('P1', 18 * tile, 20 * tile)
      
      // Parcela 2 (Derecha)
      ctx.fillText('P2', 42 * tile, 20 * tile)
      
      ctx.shadowBlur = 0
    }

    function drawInfoPanel(ctx, w, h, tile, agents, data) {
      const panelW = 220
      const panelH = 180
      const panelX = w * tile - panelW - 12
      const panelY = 12

      // Panel de fondo
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'
      ctx.beginPath()
      ctx.roundRect(panelX, panelY, panelW, panelH, 12)
      ctx.fill()

      // Borde
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 2
      ctx.stroke()

      // Título
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 16px Arial'
      ctx.textAlign = 'left'
      ctx.fillText('🌾 Estado del Sistema', panelX + 12, panelY + 24)

      const meta = data.meta || {}
      const metrics = data.meta?.metrics || {}
      
      // Fase actual
      const phaseIcons = {
        'planting': '🌱 Plantando',
        'irrigating': '💧 Irrigando',
        'harvesting': '🌾 Cosechando',
        'complete': '✅ Completado'
      }
      
      ctx.font = 'bold 14px Arial'
      ctx.fillStyle = '#22c55e'
      ctx.fillText(phaseIcons[metrics.cycle_phase] || 'Iniciando...', panelX + 12, panelY + 50)
      
      // Barra de progreso de fase
      if (metrics.phase_progress !== undefined) {
        const barW = panelW - 24
        const barH = 8
        const barX = panelX + 12
        const barY = panelY + 60
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
        ctx.fillRect(barX, barY, barW, barH)
        
        ctx.fillStyle = '#3b82f6'
        ctx.fillRect(barX, barY, barW * (metrics.phase_progress / 100), barH)
        
        ctx.fillStyle = '#ffffff'
        ctx.font = '10px monospace'
        ctx.textAlign = 'right'
        ctx.fillText(`${metrics.phase_progress?.toFixed(0) || 0}%`, barX + barW, barY + 7)
      }

      // Información
      ctx.font = '13px monospace'
      ctx.fillStyle = '#cbd5e1'
      ctx.textAlign = 'left'
      
      ctx.fillText(`Plantado: ${meta.planted_total || 0}`, panelX + 12, panelY + 85)
      ctx.fillText(`Irrigado: ${meta.irrigated_total || 0}`, panelX + 12, panelY + 105)
      ctx.fillText(`Cosechado: ${meta.harvested_total || 0}`, panelX + 12, panelY + 125)
      ctx.fillText(`Paso: ${meta.step || 0}`, panelX + 12, panelY + 145)

      // Indicador de eficiencia de combustible
      const avgFuelEff = meta.avg_fuel_efficiency || 0
      ctx.fillText(`⛽ Eficiencia: ${avgFuelEff}%`, panelX + 12, panelY + 165)
    }

  }, [gridData, showUI, showFuel])

  const styles = {
    container: {
      position: 'relative',
      display: 'inline-block',
      background: 'linear-gradient(135deg, #2c5f2d 0%, #1a3a1b 100%)',
      padding: '24px',
      borderRadius: '20px',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.6)',
      border: '4px solid #3d5a1e'
    },
    canvas: {
      display: 'block',
      borderRadius: '12px',
      border: '3px solid #5a7c30',
      boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.4)',
      background: '#5a6e4a'
    },
    controls: {
      position: 'absolute',
      top: '34px',
      left: '34px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    },
    button: {
      padding: '10px 18px',
      background: 'rgba(15, 23, 42, 0.95)',
      border: '2px solid #3b82f6',
      borderRadius: '10px',
      color: '#ffffff',
      fontWeight: '600',
      fontSize: '13px',
      cursor: 'pointer',
      transition: 'all 0.3s',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4)',
      minWidth: '110px'
    },
    legend: {
      position: 'absolute',
      bottom: '34px',
      left: '34px',
      background: 'rgba(15, 23, 42, 0.95)',
      padding: '16px',
      borderRadius: '12px',
      border: '2px solid #3b82f6',
      backdropFilter: 'blur(10px)',
      color: '#ffffff',
      fontSize: '12px',
      maxWidth: '200px'
    },
    legendTitle: {
      fontWeight: 'bold',
      marginBottom: '12px',
      fontSize: '14px',
      color: '#3b82f6'
    },
    legendItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '6px'
    },
    legendIcon: {
      width: '20px',
      height: '20px',
      borderRadius: '4px',
      border: '1px solid rgba(255, 255, 255, 0.3)'
    }
  }

  return (
    <div style={styles.container}>
      <canvas ref={canvasRef} style={styles.canvas} />
      
      <div style={styles.controls}>
        <button
          onClick={() => setIsPaused(!isPaused)}
          style={styles.button}
          onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.target.style.transform = 'scale(1)'}
        >
          {isPaused ? '▶️ Play' : '⏸️ Pause'}
        </button>
        
        <button
          onClick={() => setShowUI(!showUI)}
          style={styles.button}
          onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.target.style.transform = 'scale(1)'}
        >
          {showUI ? '👁️ Ocultar' : '👁️ Mostrar'}
        </button>

        <button
          onClick={() => setShowFuel(!showFuel)}
          style={styles.button}
          onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.target.style.transform = 'scale(1)'}
        >
          {showFuel ? '⛽ Fuel ON' : '⛽ Fuel OFF'}
        </button>
      </div>

      {/* Leyenda */}
      <div style={styles.legend}>
        <div style={styles.legendTitle}>📋 Leyenda</div>
        <div style={styles.legendItem}>
          <div style={{...styles.legendIcon, background: '#8bc34a'}}></div>
          <span>Cultivo</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{...styles.legendIcon, background: '#654321'}}></div>
          <span>Borde Parcela</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{...styles.legendIcon, background: '#e74c3c'}}></div>
          <span>Plantador</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{...styles.legendIcon, background: '#27ae60'}}></div>
          <span>Cosechador</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{...styles.legendIcon, background: '#3498db'}}></div>
          <span>Irrigador</span>
        </div>
      </div>
    </div>
  )
}