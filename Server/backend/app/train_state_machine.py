import threading
import time
import os
import pickle
from collections import defaultdict
import numpy as np

from .config import (
    GRID_W, GRID_H, N_AGENTS, DEFAULT_ALPHA, DEFAULT_GAMMA, 
    DEFAULT_EPS, EPS_DECAY, QTABLE_PATH, AGENT_ROLES, AGENT_START_POSITIONS,
    ROLE_BARNS
)
from .env import MultiFieldEnv
from .agents import FarmAgent

class PhaseState:
    PLANTING = 'planting'
    GROWTH = 'growth'
    HARVESTING = 'harvesting'
    CYCLE_COMPLETE = 'cycle_complete'

class StateMachineTrainer:
    def __init__(self, width=GRID_W, height=GRID_H, n_agents=N_AGENTS):
        self.env = MultiFieldEnv(w=width, h=height, n_agents=n_agents)
        self.agents = []
        # Crear agentes con roles específicos
        for i in range(self.env.n_agents):
            role = AGENT_ROLES[i] if i < len(AGENT_ROLES) else 'harvester'
            barn_pos = ROLE_BARNS.get(role, (0, 0))
            
            a = FarmAgent(
                i, 
                AGENT_START_POSITIONS[i] if i < len(AGENT_START_POSITIONS) else self.env.agents_init[i],
                role=role,
                barn_pos=barn_pos,
                alpha=DEFAULT_ALPHA, 
                gamma=DEFAULT_GAMMA, 
                eps=DEFAULT_EPS
            )
            self.agents.append(a)
        self.running = False
        self.train_thread = None
        self.lock = threading.Lock()
        
        self.params = {
            'alpha': DEFAULT_ALPHA,
            'gamma': DEFAULT_GAMMA,
            'eps': DEFAULT_EPS,
            'eps_decay': EPS_DECAY
        }
        
        self.train_stats = {
            'episodes': [],
            'current_phase': PhaseState.PLANTING,
            'current_episode': 0,
            'total_episodes': 0
        }
        
        self.phase_thresholds = {
            PhaseState.PLANTING: 0.65,    
            PhaseState.GROWTH: 50, 
            PhaseState.HARVESTING: 0.80
        }
        
    def _should_transition_phase(self, phase):
        if phase == PhaseState.PLANTING:
            total_buildable = len(self.env.buildable_cells)
            planted = sum(1 for (x, y) in self.env.buildable_cells 
                         if self.env.grid[y, x] == 2)  # CROP = 2
            ratio = planted / max(1, total_buildable)
            return ratio >= self.phase_thresholds[PhaseState.PLANTING]
        
        elif phase == PhaseState.GROWTH:
            crops = np.sum(self.env.grid == 2)  # CROP
            if crops == 0:
                return False
            mature = np.sum((self.env.grid == 2) & 
                          (self.env.crop_age >= self.env.MATURITY_STEPS))
            return mature > 0
        
        elif phase == PhaseState.HARVESTING:
            remaining = np.sum(self.env.grid == 2)
            return remaining == 0
        
        return False
    
    def _reset_phase_for_next_cycle(self):
        buildable = self.env.buildable_cells
        for x, y in buildable:
            self.env.grid[y, x] = 0  # EMPTY
            self.env.crop_age[y, x] = 0.0
            self.env.water[y, x] = 0
            self.env.compaction[y, x] = 0
        
        # Resetear agentes a posiciones iniciales
        for i, agent in enumerate(self.agents):
            agent.pos = AGENT_START_POSITIONS[i] if i < len(AGENT_START_POSITIONS) else self.env.agents_init[i]
            agent.current_capacity = agent.max_capacity
            agent.is_returning_to_barn = False
            agent.harvested = 0
            agent.planted = 0
            agent.irrigated = 0
            agent.path = []
    
    def train_background(self, episodes=20, steps_per_episode=500):
        self.running = True
        self.train_stats['total_episodes'] = episodes
        for ep in range(episodes):
            if not self.running:
                break
            self.train_stats['current_episode'] = ep + 1
            self.env.reset()
            self._reset_phase_for_next_cycle()
            phase = PhaseState.PLANTING
            phase_step_count = 0
            episode_total_reward = 0.0
            episode_stats = {
                'episode': ep + 1,
                'planted': 0,
                'irrigated': 0,
                'harvested': 0,
                'total_reward': 0.0,
                'phases': {}
            }
            
            for step in range(steps_per_episode):
                if not self.running:
                    break
                
                phase_step_count += 1
                self.env.step_count += 1
                obs_list = self.env._get_obs()
                actions = {}
                states = []
                for i, agent in enumerate(self.agents):
                    obs = obs_list[i]
                    s = agent.obs_to_state(obs)
                    states.append(s)
                    
                    if phase == PhaseState.PLANTING:
                        if agent.role == 'planter':
                            ai = agent.choose_action(s, training=True)
                            actions[i] = {0: (0,0), 1: (1,0), 2: (-1,0), 3: (0,1), 4: (0,-1)}[ai]
                        else:
                            actions[i] = (0, 0)
                    
                    elif phase == PhaseState.GROWTH:
                        if agent.role == 'irrigator':
                            ai = agent.choose_action(s, training=True)
                            actions[i] = {0: (0,0), 1: (1,0), 2: (-1,0), 3: (0,1), 4: (0,-1)}[ai]
                        elif agent.role == 'planter':
                            actions[i] = (0, 0)
                        else:
                            actions[i] = (0, 0)
                    
                    elif phase == PhaseState.HARVESTING:
                        if agent.role == 'harvester':
                            ai = agent.choose_action(s, training=True)
                            actions[i] = {0: (0,0), 1: (1,0), 2: (-1,0), 3: (0,1), 4: (0,-1)}[ai]
                        else:
                            actions[i] = (0, 0)
                    
                    else:
                        actions[i] = (0, 0)
                
                proposals = self.env.step(self.agents, actions_by_q=actions)
                pos_counts = {}
                for p in proposals:
                    pos_counts[p] = pos_counts.get(p, 0) + 1
                
                finals = []
                for i, p in enumerate(proposals):
                    if pos_counts.get(p, 0) > 1:
                        finals.append(self.agents[i].pos)
                    else:
                        finals.append(p)
                
                rewards, infos, done = self.env.apply_final_positions_and_harvest(
                    self.agents, finals
                )
                episode_total_reward += sum(rewards)
                obs2_list = self.env._get_obs()
                for i, agent in enumerate(self.agents):
                    s2 = agent.obs_to_state(obs2_list[i])
                    idx_map = {(0,0): 0, (1,0): 1, (-1,0): 2, (0,1): 3, (0,-1): 4}
                    final_pos = finals[i]
                    movement = (final_pos[0] - agent.pos[0], final_pos[1] - agent.pos[1])
                    ai = idx_map.get(movement, 0)
                    
                    agent.update_q(states[i], ai, rewards[i], s2, done=False)
                
                # Decay epsilon
                for agent in self.agents:
                    agent.decay_epsilon(self.params['eps_decay'])
                
                # Verificar transición de fase
                if self._should_transition_phase(phase):
                    if phase not in episode_stats['phases']:
                        episode_stats['phases'][phase] = {
                            'steps': phase_step_count,
                            'reward': sum([a.get_stats()['barn_visits'] for a in self.agents])
                        }
                    phase_step_count = 0
                    
                    if phase == PhaseState.PLANTING:
                        phase = PhaseState.GROWTH
                    elif phase == PhaseState.GROWTH:
                        phase = PhaseState.HARVESTING
                    elif phase == PhaseState.HARVESTING:
                        phase = PhaseState.CYCLE_COMPLETE
                        break
                
                self.train_stats['current_phase'] = phase
            
            # Recolectar estadísticas del episodio
            episode_stats['total_reward'] = episode_total_reward
            episode_stats['planted'] = sum(a.planted for a in self.agents)
            episode_stats['irrigated'] = sum(a.irrigated for a in self.agents)
            episode_stats['harvested'] = sum(a.harvested for a in self.agents)
            episode_stats['final_phase'] = phase
            
            self.train_stats['episodes'].append(episode_stats)
            
            # Guardar cada N episodios
            if (ep + 1) % 5 == 0:
                self.save_qs()
                print(f"[Ep {ep+1}] Reward: {episode_total_reward:.2f} | "
                      f"Planted: {episode_stats['planted']} | "
                      f"Irrigated: {episode_stats['irrigated']} | "
                      f"Harvested: {episode_stats['harvested']}")
        
        self.running = False
        self.save_qs()
        print("✓ Entrenamiento completado")
    
    def start_training(self, episodes=20, steps_per_episode=500):
        """Inicia el entrenamiento en un thread separado"""
        if self.running:
            print("⚠ Entrenamiento ya en progreso")
            return False
        
        self.train_thread = threading.Thread(
            target=self.train_background,
            args=(episodes, steps_per_episode),
            daemon=True
        )
        self.train_thread.start()
        return True
    
    def stop_training(self):
        """Detiene el entrenamiento"""
        self.running = False
        if self.train_thread:
            self.train_thread.join(timeout=2)
        self.save_qs()
        return True
    
    def save_qs(self, path=QTABLE_PATH):
        """Guarda Q-tables de todos los agentes"""
        data = []
        for agent in self.agents:
            agent_data = {}
            for state_key, q_values in agent.Q.items():
                agent_data[str(state_key)] = q_values.tolist()
            data.append(agent_data)
        
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            pickle.dump(data, f)
        print(f"✓ Q-tables guardadas en {path}")
    
    def load_qs(self, path=QTABLE_PATH):
        """Carga Q-tables guardadas"""
        if not os.path.exists(path):
            print(f"⚠ No se encontró {path}")
            return False
        
        try:
            with open(path, "rb") as f:
                data = pickle.load(f)
            
            for i, agent in enumerate(self.agents):
                if i < len(data):
                    new_q = defaultdict(lambda: np.zeros(5))
                    for state_str, q_vals in data[i].items():
                        try:
                            state_key = eval(state_str)
                        except:
                            state_key = state_str
                        new_q[state_key] = np.array(q_vals)
                    agent.Q = new_q
            
            print(f"✓ Q-tables cargadas desde {path}")
            return True
        except Exception as e:
            print(f"✗ Error al cargar: {e}")
            return False
    
    def get_stats(self):
        """Retorna estadísticas actuales"""
        return {
            'current_episode': self.train_stats['current_episode'],
            'total_episodes': self.train_stats['total_episodes'],
            'current_phase': self.train_stats['current_phase'],
            'running': self.running,
            'episodes': self.train_stats['episodes'][-10:] if self.train_stats['episodes'] else []
        }


# Script de ejecución
if __name__ == '__main__':
    print("=" * 60)
    print("ENTRENADOR CON MÁQUINA DE ESTADOS - CICLO AGRÍCOLA")
    print("=" * 60)
    
    trainer = StateMachineTrainer()
    print("\n🌱 Iniciando entrenamiento...")
    print("Ciclo: SIEMBRA → RIEGO → COSECHA → Repetir\n")
    
    trainer.start_training(episodes=15, steps_per_episode=400)
    
    if trainer.train_thread:
        trainer.train_thread.join()
    
    print("\n" + "=" * 60)
    print("RESUMEN DE ENTRENAMIENTO")
    print("=" * 60)
    
    stats = trainer.get_stats()
    for ep in stats['episodes']:
        print(f"\nEpisodio {ep['episode']}:")
        print(f"  Sembrado: {ep['planted']} | Regado: {ep['irrigated']} | Cosechado: {ep['harvested']}")
        print(f"  Recompensa total: {ep['total_reward']:.2f}")
        print(f"  Fase final: {ep['final_phase']}")