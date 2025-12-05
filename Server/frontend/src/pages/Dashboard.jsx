// Dashboard.jsx (ejemplo)
import React, { useState } from 'react'
import FieldGrid from '../components/FieldGrid'
import ControlPanel from '../components/ControlPanel'
import LearningCurve from '../components/LearningCurve'

export default function Dashboard(){
  const [frames, setFrames] = useState(null)
  return (
    <div style={{display:'flex', height:'100vh'}}>
      <div style={{flex:1}}><FieldGrid simFrames={frames} /></div>
      <div style={{width:400}}>
        <ControlPanel onSimData={(f)=>setFrames(f)} />
        <LearningCurve />
      </div>
    </div>
  )
}
