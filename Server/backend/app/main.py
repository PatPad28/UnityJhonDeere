# backend/app/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .sim_manager import SimManager
import asyncio
import numpy as np

def convert_numpy_types(obj):
    if isinstance(obj, np.integer): return int(obj)
    elif isinstance(obj, np.floating): return float(obj)
    elif isinstance(obj, np.ndarray): return obj.tolist()
    elif isinstance(obj, dict): return {k: convert_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, list): return [convert_numpy_types(i) for i in obj]
    return obj

app = FastAPI(title="Farm Multi-Agent API", version="3.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)

sim = SimManager()

# Cargar Q-tables al inicio
if sim.load_qs():
    print("✅ Q-Tables cargadas correctamente.")
else:
    print("⚠️ No se encontraron Q-Tables guardadas. Iniciando desde cero.")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("🔌 Unity Conectado")

    try:
        # Inicializar ambiente si no hay agentes
        if not sim.agents:
            sim.env.reset()
            print("🌱 Ambiente inicializado")

        step_count = 0
        episode_step = 0
        max_steps_per_episode = 500  # Reiniciar cada 500 pasos

        while True:
            try:
                with sim.lock:
                    # 1. Obtener observaciones
                    obs_list = sim.env._get_obs()
                    actions = {}

                    # 2. Cada agente elige acción usando Q-table
                    for i, agent in enumerate(sim.agents):
                        state = agent.obs_to_state(obs_list[i])
                        action_idx = agent.choose_action(state, training=False)
                        
                        # Mapear acción a movimiento
                        move_map = {0: (0,0), 1: (1,0), 2: (-1,0), 3: (0,1), 4: (0,-1)}
                        actions[i] = move_map.get(action_idx, (0,0))

                    # 3. Proponer movimientos
                    proposals = sim.env.step(sim.agents, actions_by_q=actions)
                    
                    # 4. Resolver colisiones
                    counts = {}
                    for p in proposals: 
                        counts[p] = counts.get(p, 0) + 1
                    
                    finals = []
                    for i, p in enumerate(proposals):
                        if counts[p] > 1: 
                            finals.append(sim.agents[i].pos)  # No mover si colisiona
                        else: 
                            finals.append(p)
                    
                    # 5. Aplicar movimientos finales y cosechar
                    sim.env.apply_final_positions_and_harvest(sim.agents, finals)
                    
                    # 6. CRUCIAL: Actualizar ciclo de vida de cultivos
                    sim.env.update_crops()
                    
                    # 7. Verificar y reabastecer combustible
                    for agent in sim.agents:
                        if agent.is_fuel_low() and agent.pos == (0, 0):
                            agent.refuel()
                    
                    # 8. Reiniciar episodio si se completó
                    episode_step += 1
                    if episode_step >= max_steps_per_episode:
                        print(f"🔄 Episodio completado ({max_steps_per_episode} pasos), reiniciando...")
                        sim.env.reset()
                        episode_step = 0

            except Exception as e_inner:
                print(f"❌ Error en frame {step_count}: {e_inner}")
                import traceback
                traceback.print_exc()
                
            # 9. Obtener estado actualizado
            raw_state = sim.get_state()
            clean_state = convert_numpy_types(raw_state)

            # 10. Log periódico
            step_count += 1
            if step_count % 50 == 0:
                print(f"📊 Frame {step_count} | Episodio paso {episode_step}")
                print(f"   Cultivos: {sum(1 for r in sim.env.grid for c in r if c == 2)}")
                print(f"   Fuel promedio: {sum(a.current_fuel for a in sim.agents)/len(sim.agents):.1f}")
            
            # 11. Enviar a Unity
            await websocket.send_json(clean_state)
            
            # 12. Control de velocidad
            await asyncio.sleep(0.1)  # 10 FPS

    except WebSocketDisconnect:
        print("❌ Unity se desconectó")
    except Exception as e:
        print(f"⚠️ Error crítico: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    import uvicorn
    print("\n" + "="*70)
    print("🚜 Farm Multi-Agent WebSocket Server")
    print("="*70)
    print("🌐 WebSocket: ws://localhost:8000/ws")
    print("📚 Docs: http://localhost:8000/docs")
    print("="*70 + "\n")
    uvicorn.run(app, host='0.0.0.0', port=8000)