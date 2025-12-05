import random
import numpy as np
from collections import defaultdict

ACTIONS = [(0,0), (1,0), (-1,0), (0,1), (0,-1)]

def zero_q():
    return np.zeros(len(ACTIONS))

class FarmAgent:
    def __init__(self, aid, start_pos, role='harvester', barn_pos=(0,0),
                 alpha=0.5, gamma=0.95, eps=0.4, capacity=10, fuel=100):
        self.id = aid
        self.pos = tuple(start_pos)
        self.role = role
        self.barn_pos = tuple(barn_pos)
        self.path = []
        
        # Contadores
        self.harvested = 0
        self.planted = 0
        self.irrigated = 0
        self.delivered = 0
        
        # Capacidad
        self.max_capacity = capacity
        self.current_capacity = capacity if role != 'harvester' else 0 # Cosechadores empiezan vacíos
        
        # Estado
        self.is_returning_to_barn = False
        self.recharge_counter = 0
        
        # Combustible
        self.max_fuel = fuel
        self.current_fuel = fuel
        self.fuel_consumed = 0
        self.fuel_efficiency_score = 0
        self.low_fuel_warnings = 0
        self.out_of_fuel_count = 0
        
        # Navegación
        self.current_goal = barn_pos
        self.last_goal_distance = float('inf')
        
        # Q-Learning
        self.Q = defaultdict(zero_q)
        self.alpha = alpha
        self.gamma = gamma
        self.eps = eps
        self.eps_min = 0.01
        
        # Estadísticas
        self.steps_taken = 0
        self.successful_actions = 0
        self.barn_visits = 0
        self.total_distance_traveled = 0
        self.fuel_refills = 0

    def obs_to_state(self, obs):
        pos = obs['pos']
        goal = obs['goal']
        nearby = obs.get('nearby', set())
        
        dx = max(-8, min(8, goal[0] - pos[0]))
        dy = max(-8, min(8, goal[1] - pos[1]))
        occ = 0
        dirs = [(0,1), (0,-1), (-1,0), (1,0)]
        for i, d in enumerate(dirs):
            nb = (pos[0] + d[0], pos[1] + d[1])
            if nb in nearby:
                occ |= (1 << i)
        
        cap_level = int((self.current_capacity / self.max_capacity) * 4)
        cap_level = max(0, min(4, cap_level))
        
        barn_dist = abs(self.barn_pos[0] - pos[0]) + abs(self.barn_pos[1] - pos[1])
        barn_dist_q = min(5, barn_dist // 10)
        
        fuel_level = int((self.current_fuel / self.max_fuel) * 4)
        fuel_level = max(0, min(4, fuel_level))
        
        returning = 1 if self.is_returning_to_barn else 0
        
        return (dx, dy, occ, cap_level, barn_dist_q, fuel_level, returning)
    
    def consume_fuel(self, amount):
        if self.current_fuel > 0:
            self.current_fuel = max(0, self.current_fuel - amount)
            self.fuel_consumed += amount
            return True
        else:
            self.out_of_fuel_count += 1
            return False
    
    def get_fuel_percentage(self):
        return int((self.current_fuel / self.max_fuel) * 100)
    
    def is_fuel_low(self):
        return self.get_fuel_percentage() <= 30
    
    def is_fuel_critical(self):
        return self.get_fuel_percentage() <= 10
    
    def should_return_to_barn(self):
        # 1. Prioridad: Combustible Crítico/Vacío
        if self.current_fuel <= 0: return True
        if self.is_fuel_critical(): return True
        
        # 2. Combustible Bajo: Volver si apenas alcanza para llegar
        dist_to_barn = abs(self.barn_pos[0] - self.pos[0]) + abs(self.barn_pos[1] - self.pos[1])
        if self.current_fuel < dist_to_barn * 1.5: 
            return True

        # 3. Lógica Diferenciada por Rol
        if self.role == 'harvester':
            # COSECHADOR: Vuelve cuando está LLENO
            if self.current_capacity >= self.max_capacity:
                return True
            # O si está casi lleno y muy cerca del granero
            if self.current_capacity >= self.max_capacity * 0.8 and dist_to_barn < 5:
                return True
                
        else:
            # PLANTADOR / IRRIGADOR: Vuelve cuando está VACÍO
            if self.current_capacity <= 0:
                return True
            # O si le queda muy poco y está cerca
            if self.current_capacity < self.max_capacity * 0.2 and dist_to_barn < 5:
                return True
        
        return False
    
    def is_at_barn(self):
        # Radio de 1 celda alrededor del punto del granero
        return (abs(self.pos[0] - self.barn_pos[0]) <= 2 and 
                abs(self.pos[1] - self.barn_pos[1]) <= 2)
    
    def recharge_at_barn(self, fuel_recharge_rate=20):
        if self.is_at_barn():
            self.recharge_counter += 1
            
            # Simular tiempo de operación (1 turno de espera)
            if self.recharge_counter >= 1:
                
                # --- LÓGICA DE CARGA/DESCARGA ---
                if self.role == 'harvester':
                    # Descargar cosecha
                    if self.current_capacity > 0:
                        self.delivered += self.current_capacity
                        self.current_capacity = 0
                else:
                    # Recargar semillas/agua
                    self.current_capacity = self.max_capacity
                
                # --- LÓGICA DE COMBUSTIBLE ---
                if self.current_fuel < self.max_fuel:
                    self.current_fuel = min(self.max_fuel, self.current_fuel + fuel_recharge_rate)
                
                # Si ya estamos listos (Combustible lleno y Carga lista)
                if self.current_fuel >= self.max_fuel:
                    self.is_returning_to_barn = False
                    self.recharge_counter = 0
                    self.barn_visits += 1
                    self.fuel_refills += 1
                    return True
            return True # Seguimos en proceso de recarga
        return False
    
    def use_capacity(self, amount=1):
        # Harvester suma, los demás restan
        if self.role == 'harvester':
            if self.current_capacity < self.max_capacity:
                self.current_capacity += amount
                self.successful_actions += 1
                return True
        else:
            if self.current_capacity >= amount:
                self.current_capacity -= amount
                self.successful_actions += 1
                return True
        return False
    
    def choose_action(self, state, training=True):
        self.steps_taken += 1
        
        # 1. Si hay un plan A* activo, seguirlo
        if hasattr(self, 'path') and self.path:
            next_pos = self.path[0]
            dx = next_pos[0] - self.pos[0]
            dy = next_pos[1] - self.pos[1]
            
            if dx == 1: return 1
            if dx == -1: return 2
            if dy == 1: return 3
            if dy == -1: return 4
            return 0

        # 2. Exploración vs Explotación (Q-Learning)
        if training and random.random() < self.eps:
            return random.randrange(len(ACTIONS))
        
        if state not in self.Q:
            return random.randrange(len(ACTIONS))
            
        return int(np.argmax(self.Q[state]))
    
    def update_q(self, state, action, reward, next_state, done=False):
        if state not in self.Q: self.Q[state] = np.zeros(len(ACTIONS))
        if next_state not in self.Q: self.Q[next_state] = np.zeros(len(ACTIONS))
        
        current_q = self.Q[state][action]
        max_next_q = np.max(self.Q[next_state]) if not done else 0
        target = reward + self.gamma * max_next_q
        
        self.Q[state][action] = current_q + self.alpha * (target - current_q)
    
    def decay_epsilon(self, decay_rate=0.995):
        self.eps = max(self.eps_min, self.eps * decay_rate)
    
    def set_eps(self, eps):
        self.eps = max(self.eps_min, min(1.0, eps))
    
    def get_capacity_percentage(self):
        return int((self.current_capacity / self.max_capacity) * 100)
    
    def calculate_efficiency_score(self):
        if self.fuel_consumed == 0: return 100
        return min(100, (self.successful_actions / self.fuel_consumed) * 100)
    
    def get_stats(self):
        total_actions = self.harvested + self.planted + self.irrigated
        return {
            'id': int(self.id),
            'role': str(self.role),
            'states_learned': int(len(self.Q)),
            'steps_taken': int(self.steps_taken),
            'harvested': int(self.harvested),
            'planted': int(self.planted),
            'irrigated': int(self.irrigated),
            'delivered': int(self.delivered),
            'capacity_pct': int(self.get_capacity_percentage()),
            'fuel_pct': int(self.get_fuel_percentage()),
            'fuel_efficiency': float(self.calculate_efficiency_score()),
            'epsilon': float(self.eps),
            'is_returning': bool(self.is_returning_to_barn),
            'is_fuel_low': bool(self.is_fuel_low()),
            'is_fuel_critical': bool(self.is_fuel_critical())
        }