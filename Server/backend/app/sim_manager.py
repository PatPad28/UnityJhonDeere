# backend/app/sim_manager.py
import threading
import time
import os
import pickle
import json
from collections import defaultdict
import numpy as np

from .config import (
    GRID_W, GRID_H, N_AGENTS, 
    DEFAULT_ALPHA, DEFAULT_GAMMA, DEFAULT_EPS, 
    EPS_DECAY, EPS_MIN, 
    QTABLE_PATH, STATS_PATH,
    AGENT_START_POSITIONS, ROLE_BARNS, AGENT_ROLES,
    PLANTER_CAPACITY, HARVESTER_CAPACITY, IRRIGATOR_CAPACITY,
    PLANTER_FUEL, HARVESTER_FUEL, IRRIGATOR_FUEL,
    FUEL_RECHARGE_RATE, PARCELS,
    SAVE_FREQUENCY
)
from .env import MultiFieldEnv
from .agents import FarmAgent

class SimManager:
    def __init__(self):
        self.env = MultiFieldEnv(
            w=GRID_W, 
            h=GRID_H, 
            n_agents=N_AGENTS,
            parcels=PARCELS
        )
        
        # Crear agentes con graneros correctos Y combustible
        self.agents = []
        capacities = {
            'planter': PLANTER_CAPACITY,
            'harvester': HARVESTER_CAPACITY,
            'irrigator': IRRIGATOR_CAPACITY
        }
        
        fuels = {
            'planter': PLANTER_FUEL,
            'harvester': HARVESTER_FUEL,
            'irrigator': IRRIGATOR_FUEL
        }
        
        for i in range(N_AGENTS):
            role = AGENT_ROLES[i]
            start_pos = AGENT_START_POSITIONS[i]
            barn_pos = ROLE_BARNS[role]
            capacity = capacities[role]
            fuel = fuels[role]
            
            agent = FarmAgent(
                aid=i,
                start_pos=start_pos,
                role=role,
                barn_pos=barn_pos,
                alpha=DEFAULT_ALPHA,
                gamma=DEFAULT_GAMMA,
                eps=DEFAULT_EPS,
                capacity=capacity,
                fuel=fuel
            )
            self.agents.append(agent)
        
        print(f"✓ Inicializados {len(self.agents)} agentes con sistema de combustible:")
        for a in self.agents:
            print(f"  - A{a.id} ({a.role}): Granero={a.barn_pos}, Cap={a.max_capacity}, Fuel={a.max_fuel}")
        
        self.running = False
        self.train_thread = None
        self.train_stats = {
            'episodes': [],
            'best_reward': float('-inf'),
            'best_episode': 0,
            'fuel_efficiency': [],
            'time_savings': []
        }
        self.lock = threading.Lock()
        
        self.params = {
            'alpha': DEFAULT_ALPHA,
            'gamma': DEFAULT_GAMMA,
            'eps': DEFAULT_EPS,
            'eps_decay': EPS_DECAY,
            'eps_min': EPS_MIN
        }
        
        self.running_trained = False
        self.trained_thread = None
        self.QTABLE_PATH = QTABLE_PATH

    def get_state(self):
        with self.lock:
            grid = self.env.grid.copy()
            
            agent_states = []
            for a in self.agents:
                agent_states.append({
                    'id': int(a.id),
                    'pos': list(a.pos),
                    'role': str(a.role),
                    'harvested': int(a.harvested),
                    'planted': int(a.planted),
                    'irrigated': int(a.irrigated),
                    'capacity_pct': int(a.get_capacity_percentage()),
                    'fuel_pct': int(a.get_fuel_percentage()),
                    'fuel': float(a.current_fuel),
                    'is_returning': bool(a.is_returning_to_barn),
                    'is_fuel_low': bool(a.is_fuel_low()),
                    'is_fuel_critical': bool(a.is_fuel_critical()),
                    'epsilon': float(round(a.eps, 4)),
                    'states_learned': int(len(a.Q)),
                    'fuel_efficiency': float(round(a.calculate_efficiency_score(), 1))
                })
            
            metrics = self.env.get_metrics()
            
            # Calcular estadísticas agregadas de combustible
            total_fuel_consumed = float(sum(a.fuel_consumed for a in self.agents))
            avg_fuel_efficiency = float(np.mean([a.calculate_efficiency_score() for a in self.agents]))
            
            meta = {
                'step': int(self.env.step_count),
                'harvested_total': int(self.env.harvested_total),
                'planted_total': int(self.env.planted_total),
                'irrigated_total': int(self.env.irrigated_total),
                'is_training': bool(self.running),
                'is_running_trained': bool(self.running_trained),
                'total_agents': int(len(self.agents)),
                'objectives': {
                    'planted': f"{self.env.planted_total}/{self.env.target_planted}",
                    'irrigated': f"{self.env.irrigated_total}/{self.env.target_irrigated}",
                    'harvested': f"{self.env.harvested_total}/{self.env.target_harvested}"
                },
                'task_complete': bool(self.env.is_task_complete()),
                'total_fuel_consumed': float(total_fuel_consumed),
                'avg_fuel_efficiency': float(round(avg_fuel_efficiency, 1)),
                'parcels': int(len(self.env.parcels)),
                'metrics': metrics  # Ya está convertido en get_metrics()
            }
        
        return {
            'grid': grid.tolist(),
            'agents': agent_states,
            'blackboard': {},  # Simplificado para evitar problemas de serialización
            'meta': meta
        }

    def train_background(self, episodes=50, steps_per_episode=2000):
        self.running = True
        print("\n" + "="*70)
        print(f"ENTRENAMIENTO: {episodes} episodios")
        print(f"Sistema de combustible: ACTIVO")
        print(f"Parcelas: {len(self.env.parcels)}")
        print(f"Modo: CICLO COMPLETO SECUENCIAL")
        print(f"  1. PLANTAR → 2. IRRIGAR → 3. COSECHAR")
        print(f"Límite de pasos: {steps_per_episode} (o hasta completar ciclo)")
        print("="*70)
        
        for ep in range(episodes):
            if not self.running:
                break
            
            obs = self.env.reset()
            
            for i, agent in enumerate(self.agents):
                if i < len(self.env.agents_init):
                    agent.pos = self.env.agents_init[i]
                agent.harvested = 0
                agent.planted = 0
                agent.irrigated = 0
                agent.current_capacity = agent.max_capacity
                agent.current_fuel = agent.max_fuel
                agent.is_returning_to_barn = False
                agent.set_eps(self.params['eps'])
            
            episode_reward = 0.0
            episode_fuel_consumed = 0
            prev_phase = self.env.cycle_phase
            
            for step in range(steps_per_episode):
                if not self.running:
                    break
                
                # Detectar cambio de fase
                current_phase = self.env.cycle_phase
                if current_phase != prev_phase:
                    print(f"  → Fase cambiada: {prev_phase} → {current_phase}")
                    prev_phase = current_phase
                
                obs_list = self.env._get_obs()
                
                while len(obs_list) < len(self.agents):
                    obs_list.append(obs_list[-1] if obs_list else {
                        'pos': (1, 1),
                        'goal': self.env.manager_pos,
                        'nearby': set(),
                        'blackboard': self.env.blackboard
                    })

                proposals = self.env.step(self.agents)
                
                counts = {}
                for p in proposals:
                    counts[p] = counts.get(p, 0) + 1
                
                finals = []
                for i, p in enumerate(proposals):
                    finals.append(self.agents[i].pos if counts[p] > 1 else p)
                
                rewards, infos, done = self.env.apply_final_positions_and_harvest(
                    self.agents, finals
                )
                
                episode_reward += sum(rewards)
                episode_fuel_consumed += sum(a.fuel_consumed for a in self.agents)
                
                obs2_list = self.env._get_obs()
                while len(obs2_list) < len(self.agents):
                    obs2_list.append(obs2_list[-1])
                
                for i, agent in enumerate(self.agents):
                    state = agent.obs_to_state(obs_list[i])
                    next_state = agent.obs_to_state(obs2_list[i])
                    
                    action_map_inv = {(0,0): 0, (1,0): 1, (-1,0): 2, (0,1): 3, (0,-1): 4}
                    actual_move = (finals[i][0] - self.agents[i].pos[0], 
                                 finals[i][1] - self.agents[i].pos[1])
                    action_taken = action_map_inv.get(actual_move, 0)
                    
                    agent.update_q(state, action_taken, rewards[i], next_state, done)
                
                for agent in self.agents:
                    agent.decay_epsilon(self.params['eps_decay'])
                
                if done:
                    break
            
            avg_epsilon = np.mean([a.eps for a in self.agents])
            total_states = sum(len(a.Q) for a in self.agents)
            avg_fuel_efficiency = np.mean([a.calculate_efficiency_score() for a in self.agents])
            
            baseline_steps = 1000  # Tiempo sin optimización
            time_saved_pct = ((baseline_steps - (step + 1)) / baseline_steps) * 100
            
            episode_data = {
                'episode': ep + 1,
                'reward': round(episode_reward, 2),
                'harvested': self.env.harvested_total,
                'planted': self.env.planted_total,
                'irrigated': self.env.irrigated_total,
                'task_complete': self.env.is_task_complete(),
                'steps': step + 1,
                'avg_epsilon': round(avg_epsilon, 4),
                'total_states_learned': total_states,
                'fuel_consumed': round(episode_fuel_consumed, 2),
                'avg_fuel_efficiency': round(avg_fuel_efficiency, 1),
                'time_saved_pct': round(time_saved_pct, 1)
            }
            
            self.train_stats['episodes'].append(episode_data)
            
            if episode_reward > self.train_stats['best_reward']:
                self.train_stats['best_reward'] = episode_reward
                self.train_stats['best_episode'] = ep + 1
            
            if (ep + 1) % 5 == 0:
                task_status = "✓" if self.env.is_task_complete() else "✗"
                phase_icon = {
                    'planting': '🌱',
                    'irrigating': '💧',
                    'harvesting': '🌾',
                    'complete': '✅'
                }.get(self.env.cycle_phase, '❓')
                
                print(f"Ep {ep+1:3d} | R: {episode_reward:7.1f} | "
                      f"{phase_icon} {self.env.cycle_phase:11s} | "
                      f"P:{self.env.planted_total:3d} I:{self.env.irrigated_total:3d} H:{self.env.harvested_total:3d} | "
                      f"Steps:{step+1:4d} | Fuel:{avg_fuel_efficiency:.1f}% | "
                      f"{task_status}")
            
            if (ep + 1) % SAVE_FREQUENCY == 0:
                self.save_qs()
                self.save_stats()
        
        self.running = False
        self.save_qs()
        self.save_stats()
        
        print("\n" + "="*70)
        print("ENTRENAMIENTO COMPLETADO")
        print(f"  Mejor reward: {self.train_stats['best_reward']:.1f}")
        print(f"  Eficiencia promedio: {avg_fuel_efficiency:.1f}%")
        print("="*70 + "\n")

    def start_training(self, episodes=50, steps_per_episode=1000):
        if self.running:
            return False
        self.train_thread = threading.Thread(
            target=self.train_background,
            args=(episodes, steps_per_episode),
            daemon=True
        )
        self.train_thread.start()
        return True

    def stop_training(self):
        self.running = False
        if self.train_thread:
            self.train_thread.join(timeout=2)
        self.save_qs()
        self.save_stats()
        return True

    def save_qs(self, path=None):
        if path is None:
            path = QTABLE_PATH
        data = []
        for agent in self.agents:
            agent_q = {}
            for state, values in agent.Q.items():
                agent_q[str(state)] = values.tolist()
            data.append({
                'id': agent.id,
                'role': agent.role,
                'Q': agent_q,
                'stats': agent.get_stats()
            })
        with open(path, 'wb') as f:
            pickle.dump(data, f)
        print(f"Q-tables guardadas: {path}")

    def load_qs(self, path=None):
        if path is None:
            path = QTABLE_PATH
        if not os.path.exists(path):
            return False
        try:
            with open(path, 'rb') as f:
                data = pickle.load(f)
            for i, agent in enumerate(self.agents):
                if i < len(data):
                    agent_data = data[i]
                    new_q = defaultdict(lambda: np.zeros(5))
                    q_dict = agent_data.get('Q', agent_data)
                    for state_str, values in q_dict.items():
                        try:
                            state = eval(state_str)
                        except:
                            state = state_str
                        new_q[state] = np.array(values)
                    agent.Q = new_q
            print(f"✓ Q-tables cargadas")
            return True
        except Exception as e:
            print(f"✗ Error: {e}")
            return False

    def save_stats(self):
        try:
            stats_to_save = {
                'episodes': [
                    {
                        'episode': int(ep.get('episode', 0)),
                        'reward': float(ep.get('reward', 0)),
                        'harvested': int(ep.get('harvested', 0)),
                        'planted': int(ep.get('planted', 0)),
                        'irrigated': int(ep.get('irrigated', 0)),
                        'task_complete': bool(ep.get('task_complete', False)),
                        'steps': int(ep.get('steps', 0)),
                        'avg_epsilon': float(ep.get('avg_epsilon', 0)),
                        'total_states_learned': int(ep.get('total_states_learned', 0)),
                        'fuel_consumed': float(ep.get('fuel_consumed', 0)),
                        'avg_fuel_efficiency': float(ep.get('avg_fuel_efficiency', 0)),
                        'time_saved_pct': float(ep.get('time_saved_pct', 0))
                    }
                    for ep in self.train_stats.get('episodes', [])
                ],
                'best_reward': float(self.train_stats.get('best_reward', 0)),
                'best_episode': int(self.train_stats.get('best_episode', 0))
            }
            
            with open(STATS_PATH, 'w') as f:
                json.dump(stats_to_save, f, indent=2)
        except Exception as e:
            print(f"Error guardando stats: {e}")

    def best_action(self, agent, obs):
        state = agent.obs_to_state(obs)
        if state not in agent.Q:
            return np.random.randint(0, 5)
        return int(np.argmax(agent.Q[state]))

    def run_trained_loop(self, sleep=0.12):
        with self.lock:
            self.env.reset()
            for i, agent in enumerate(self.agents):
                if i < len(self.env.agents_init):
                    agent.pos = self.env.agents_init[i]
                agent.current_capacity = agent.max_capacity
                agent.current_fuel = agent.max_fuel
                agent.is_returning_to_barn = False
        
        self.running_trained = True
        while self.running_trained:
            with self.lock:
                obs_list = self.env._get_obs()
                actions = {}
                for i, agent in enumerate(self.agents):
                    action_idx = self.best_action(agent, obs_list[i])
                    actions[i] = {0: (0,0), 1: (1,0), 2: (-1,0), 3: (0,1), 4: (0,-1)}[action_idx]
                proposals = self.env.step(self.agents, actions_by_q=actions)
                counts = {}
                for p in proposals:
                    counts[p] = counts.get(p, 0) + 1
                finals = [self.agents[i].pos if counts[p] > 1 else p for i, p in enumerate(proposals)]
                self.env.apply_final_positions_and_harvest(self.agents, finals)
            time.sleep(sleep)
        return True

    def start_run_trained(self):
        if self.running_trained:
            return False
        self.trained_thread = threading.Thread(target=self.run_trained_loop, daemon=True)
        self.trained_thread.start()
        return True

    def stop_run_trained(self):
        self.running_trained = False
        if self.trained_thread:
            self.trained_thread.join(timeout=1)
        return True