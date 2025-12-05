import random
import numpy as np
from heapq import heappush, heappop

EMPTY = 0
OBST = 1
CROP = 2
PATH = 3
MANAGER = 4
WATER = 5
PLANTER_BARN = 6
HARVESTER_BARN = 7
IRRIGATOR_BARN = 8
PARCEL_BORDER = 11

def heuristic(a, b):
    """Distancia Manhattan"""
    return abs(a[0] - b[0]) + abs(a[1] - b[1])

def astar(start, goal, obstacles_set, w, h):
    if start == goal:
        return [start]
    
    openq = []
    heappush(openq, (heuristic(start, goal), 0, start, None))
    came = {}
    gscore = {start: 0}
    closed = set()
    
    while openq:
        f, g, current, parent = heappop(openq)
        
        if current in closed:
            continue
        
        came[current] = parent
        
        if current == goal:
            path = []
            node = current
            while node:
                path.append(node)
                node = came[node]
            path.reverse()
            return path
        
        closed.add(current)
        x, y = current
        
        for dx, dy in [(0,1), (0,-1), (1,0), (-1,0)]:
            nx, ny = x + dx, y + dy
            
            if not (0 <= nx < w and 0 <= ny < h):
                continue
            
            if (nx, ny) in obstacles_set:
                continue
            
            ng = g + 1
            
            if ng < gscore.get((nx, ny), 1e9):
                gscore[(nx, ny)] = ng
                heappush(openq, (ng + heuristic((nx, ny), goal), ng, (nx, ny), current))
    
    return None

class MultiFieldEnv:
    def __init__(self, w=60, h=40, n_agents=6, crop_count=200, obst_count=30, parcels=None):
        self.w = w
        self.h = h
        self.n_agents = n_agents
        self.initial_crop_count = crop_count
        self.crop_count = crop_count
        self.obst_count = obst_count
        
        if parcels is None:
            self.parcels = [
                {
                    'x_start': 8, 'x_end': 28,
                    'y_start': 8, 'y_end': 32,
                    'name': 'Parcela 1'
                },
                {
                    'x_start': 32, 'x_end': 52,
                    'y_start': 8, 'y_end': 32,
                    'name': 'Parcela 2'
                }
            ]
        else:
            self.parcels = parcels
        
        self.planter_barn_pos = (3, 3)
        self.harvester_barn_pos = (w - 5, 3)
        self.irrigator_barn_pos = (3, h - 5)
        self.manager_pos = (w - 5, h - 5)
        self.target_planted = crop_count  
        self.target_irrigated = crop_count * 2  
        self.target_harvested = crop_count
        
        self.REWARD_HARVEST = 40.0
        self.REWARD_PLANT = 35.0
        self.REWARD_IRRIGATE = 30.0
        self.REWARD_CYCLE_COMPLETE = 500.0
        self.REWARD_APPROACH_TARGET = 2.0
        self.REWARD_FUEL_EFFICIENT = 5.0
        self.PENALTY_STEP = -0.05
        self.PENALTY_COLLISION = -2.0
        self.PENALTY_FAIL = -2.0
        self.PENALTY_OUT_OF_FUEL = -10.0
        
        self.FUEL_COST_MOVE = 1
        self.FUEL_COST_PLANT = 2
        self.FUEL_COST_HARVEST = 2
        self.FUEL_COST_IRRIGATE = 1.5
        self.FUEL_RECHARGE_RATE = 20
        
        self.reset()
    
    def reset(self):
        self.grid = np.zeros((self.h, self.w), dtype=int) + EMPTY
        self._create_parcel_borders()
        self._place_barn(self.planter_barn_pos, PLANTER_BARN)
        self._place_barn(self.harvester_barn_pos, HARVESTER_BARN)
        self._place_barn(self.irrigator_barn_pos, IRRIGATOR_BARN)
        self._place_barn(self.manager_pos, MANAGER)
        self._place_crops_in_parcels()
        self._place_obstacles_outside_parcels()
        self.agents_init = [
            (4, 4),                    # Plantador
            (5, 4),                    
            (self.w - 6, 4),           # Cosechador
            (self.w - 7, 4),         
            (4, self.h - 6),           # Irrigador
            (5, self.h - 6)           
        ]
        
        self.compaction = np.zeros((self.h, self.w), dtype=int)
        self.water = np.zeros((self.h, self.w), dtype=int)
        self.blackboard = {
            'agents': {},
            'resources': {},
            'announcements': [],
            'barn_activity': {
                'planter': 0,
                'harvester': 0,
                'irrigator': 0
            }
        }
        
        self.step_count = 0
        self.harvested_total = 0
        self.planted_total = 0
        self.irrigated_total = 0
        
        self.cycle_phase = 'planting'  # planting → irrigating → harvesting → complete
        self.phase_requirements = {
            'planting': self.target_planted,
            'irrigating': self.target_irrigated,
            'harvesting': self.target_harvested
        }
        
        return self._get_obs()
    
    def _create_parcel_borders(self):
        for parcel in self.parcels:
            x_start, x_end = parcel['x_start'], parcel['x_end']
            y_start, y_end = parcel['y_start'], parcel['y_end']
            
            for x in range(x_start, x_end):
                if 0 <= y_start < self.h:
                    self.grid[y_start, x] = PARCEL_BORDER
                if 0 <= y_end - 1 < self.h:
                    self.grid[y_end - 1, x] = PARCEL_BORDER
            
            for y in range(y_start, y_end):
                if 0 <= x_start < self.w:
                    self.grid[y, x_start] = PARCEL_BORDER
                if 0 <= x_end - 1 < self.w:
                    self.grid[y, x_end - 1] = PARCEL_BORDER
    
    def _is_inside_parcel(self, x, y):
        for parcel in self.parcels:
            if (parcel['x_start'] + 1 <= x < parcel['x_end'] - 1 and 
                parcel['y_start'] + 1 <= y < parcel['y_end'] - 1):
                return True
        return False
    
    def _place_crops_in_parcels(self):
        placed = 0
        attempts = 0
        max_attempts = self.initial_crop_count * 20
        
        while placed < self.initial_crop_count and attempts < max_attempts:
            parcel = random.choice(self.parcels)
            x = random.randrange(parcel['x_start'] + 1, parcel['x_end'] - 1)
            y = random.randrange(parcel['y_start'] + 1, parcel['y_end'] - 1)
            
            if self.grid[y, x] == EMPTY:
                self.grid[y, x] = CROP
                placed += 1
            
            attempts += 1
        
        print(f"✓ Cultivos plantados: {placed}/{self.initial_crop_count}")
    
    def _place_obstacles_outside_parcels(self):
        placed = 0
        attempts = 0
        max_attempts = self.obst_count * 10
        
        self.obstacles = set()
        
        while placed < self.obst_count and attempts < max_attempts:
            x = random.randrange(1, self.w - 1)
            y = random.randrange(1, self.h - 1)
            
            if not self._is_inside_parcel(x, y) and self.grid[y, x] == EMPTY:
                self.grid[y, x] = OBST
                self.obstacles.add((x, y))
                placed += 1
            
            attempts += 1
    
    def _place_barn(self, pos, barn_type):
        x, y = pos
        for dx in range(2):
            for dy in range(2):
                if 0 <= x + dx < self.w and 0 <= y + dy < self.h:
                    self.grid[y + dy, x + dx] = barn_type
    
    def _get_obs(self):
        obs = []
        occ = set(self.obstacles)
        
        for i, init_pos in enumerate(self.agents_init):
            # Determinar rol
            if i < 2:
                role = 'planter'
            elif i < 4:
                role = 'harvester'
            else:
                role = 'irrigator'
            
            obs.append({
                'pos': init_pos,
                'goal': self._get_smart_goal(init_pos, role),
                'nearby': occ,
                'blackboard': self.blackboard,
                'agent_id': i,
                'role': role
            })
        
        return obs
    
    def _get_smart_goal(self, pos, role):
        """
        Objetivo MÁS CERCANO según el rol Y LA FASE ACTUAL
        Los agentes SIEMPRE buscan trabajo, solo van al granero si necesitan combustible
        """
        if role == 'planter' and self.cycle_phase == 'planting':
            # Buscar tierra vacía dentro de parcelas
            targets = []
            for parcel in self.parcels:
                for y in range(parcel['y_start'] + 1, parcel['y_end'] - 1):
                    for x in range(parcel['x_start'] + 1, parcel['x_end'] - 1):
                        if self.grid[y, x] == EMPTY:
                            targets.append((x, y))
                            
        elif role == 'irrigator' and self.cycle_phase == 'irrigating':
            # Buscar cultivos con menos agua (priorizar los que necesitan más)
            targets = []
            for y in range(self.h):
                for x in range(self.w):
                    if self.grid[y, x] == CROP:
                        water_level = self.water[y, x]
                        if water_level < 2: 
                            priority = 3 - water_level 
                            for _ in range(priority):
                                targets.append((x, y))
                      
        elif role == 'harvester' and self.cycle_phase == 'harvesting':
            targets = []
            for y in range(self.h):
                for x in range(self.w):
                    if self.grid[y, x] == CROP and self.water[y, x] >= 1:
                        targets.append((x, y))
        else:
            return self._get_barn_for_role(role)
        
        if not targets:
            return self._get_barn_for_role(role)
        
        min_dist = float('inf')
        nearest = targets[0]
        for t in targets:
            dist = heuristic(pos, t)
            if dist < min_dist:
                min_dist = dist
                nearest = t
        
        return nearest
    
    def _get_barn_for_role(self, role):
        if role == 'planter':
            return self.planter_barn_pos
        elif role == 'harvester':
            return self.harvester_barn_pos
        elif role == 'irrigator':
            return self.irrigator_barn_pos
        return self.manager_pos
    
    def _update_cycle_phase(self):
        # FASE 1: PLANTING - Solo plantadores trabajan
        if self.cycle_phase == 'planting':
            if self.planted_total >= self.target_planted:
                self.cycle_phase = 'irrigating'
                print(f"✓ Fase PLANTING completada ({self.planted_total} plantados)")
                print(f"→ Iniciando fase IRRIGATING...")
        
        # FASE 2: IRRIGATING - Solo irrigadores trabajan
        elif self.cycle_phase == 'irrigating':
            if self.irrigated_total >= self.target_irrigated:
                self.cycle_phase = 'harvesting'
                print(f"✓ Fase IRRIGATING completada ({self.irrigated_total} irrigados)")
                print(f"→ Iniciando fase HARVESTING...")
        
        # FASE 3: HARVESTING - Solo cosechadores trabajan
        elif self.cycle_phase == 'harvesting':
            if self.harvested_total >= self.target_harvested:
                self.cycle_phase = 'complete'
                print(f"✓ Fase HARVESTING completada ({self.harvested_total} cosechados)")
                print(f"🎉 ¡CICLO COMPLETO!")
    
    def get_phase_progress(self):
        if self.cycle_phase == 'planting':
            return (self.planted_total / max(1, self.target_planted)) * 100
        elif self.cycle_phase == 'irrigating':
            return (self.irrigated_total / max(1, self.target_irrigated)) * 100
        elif self.cycle_phase == 'harvesting':
            return (self.harvested_total / max(1, self.target_harvested)) * 100
        else:
            return 100
    
    def _update_blackboard_from_agents(self, agents):
        for ag in agents:
            self.blackboard['agents'][f'agent_{ag.id}'] = {
                'pos': tuple(ag.pos),
                'role': getattr(ag, 'role', None),
                'harvested': getattr(ag, 'harvested', 0),
                'planted': getattr(ag, 'planted', 0),
                'irrigated': getattr(ag, 'irrigated', 0),
                'capacity_pct': ag.get_capacity_percentage(),
                'fuel_pct': ag.get_fuel_percentage(),
                'is_returning': ag.is_returning_to_barn,
                'is_fuel_low': ag.is_fuel_low()
            }
    
    def compute_paths(self, agents):
        obstset = set(self.obstacles)
        agent_positions = set(ag.pos for ag in agents)
        
        for i, ag in enumerate(agents):
            start = ag.pos
            
            # 1. Determinar Objetivo
            if ag.should_return_to_barn():
                goal = ag.barn_pos
                ag.is_returning_to_barn = True
            else:
                goal = self._get_smart_goal(start, ag.role)
                ag.is_returning_to_barn = False
            
            # 2. Definir Obstáculos para este agente
            obstacles_for_this_agent = obstset.copy()
            for other_ag in agents:
                if other_ag.id != ag.id:
                    if other_ag.pos == goal:
                        continue
                    obstacles_for_this_agent.add(other_ag.pos)
            
            # --- CORRECCIÓN CRÍTICA AQUÍ ---
            # Si mi meta está ocupada por otro agente (ej. un compañero en el granero),
            # la quitamos de la lista de obstáculos para que A* no falle.
            # Esto permite trazar una ruta HASTA el compañero.
            if goal in obstacles_for_this_agent:
                obstacles_for_this_agent.remove(goal)
            # -------------------------------
            
            # 3. Calcular Ruta
            path = astar(start, goal, obstacles_for_this_agent, self.w, self.h)
            
            if path and len(path) > 1:
                ag.path = path[1:] 
            else:
                ag.path = []
            
            ag.current_goal = goal
    
    def step(self, agents, actions_by_q=None):
        self.step_count += 1
        
        self._update_blackboard_from_agents(agents)
        self._update_cycle_phase()
        self.compute_paths(agents)
        
        proposals = []
        for i, ag in enumerate(agents):
            if ag.path and len(ag.path) > 0:
                next_pos = ag.path[0]
                proposals.append(next_pos)
            else:
                proposals.append(ag.pos)
        
        return proposals
    
    def apply_final_positions_and_harvest(self, agents, final_positions):
        rewards = [0.0] * len(agents)
        infos = [{} for _ in agents]
        
        for i, ag in enumerate(agents):
            newpos = final_positions[i]
            old_pos = ag.pos
            moved = (newpos != old_pos)
            
            # 1. Consumo de combustible por movimiento
            if moved:
                if not ag.consume_fuel(self.FUEL_COST_MOVE):
                    rewards[i] += self.PENALTY_OUT_OF_FUEL
                    infos[i]['out_of_fuel'] = True
                    ag.is_returning_to_barn = True
                    # Si no tiene gasolina, no se mueve (se queda en old_pos)
                    continue 
            
            # 2. Recompensa por acercarse al objetivo (Shaping)
            if hasattr(ag, 'current_goal'):
                old_dist = heuristic(old_pos, ag.current_goal)
                new_dist = heuristic(newpos, ag.current_goal)
                
                if new_dist < old_dist:
                    rewards[i] += self.REWARD_APPROACH_TARGET
            
            # 3. Actualizar posición física
            ag.pos = newpos
            x, y = newpos
            
            # Actualizar path del agente (borrar el paso que ya dio)
            if moved and hasattr(ag, 'path') and len(ag.path) > 0:
                if ag.path[0] == newpos:
                    ag.path.pop(0)
            
            rewards[i] += self.PENALTY_STEP
            
            # --- 🔥 MODIFICACIÓN: ZONA DE PARKING AMPLIADA 🔥 ---
            # Calculamos distancia Manhattan al granero
            dist_to_barn = abs(x - ag.barn_pos[0]) + abs(y - ag.barn_pos[1])
            
            # Condición relajada: Si está en el centro O cerca (<= 2) y quiere volver
            in_parking_zone = ag.is_at_barn() or (dist_to_barn <= 2 and ag.is_returning_to_barn)

            if in_parking_zone:
                # Intentar recargar/descargar
                # Nota: recharge_at_barn devuelve True si terminó o está en proceso
                if ag.recharge_at_barn(self.FUEL_RECHARGE_RATE):
                    rewards[i] += 15.0
                    if ag.calculate_efficiency_score() > 80:
                        rewards[i] += self.REWARD_FUEL_EFFICIENT
                    infos[i]['recharged'] = True
                
                # Si está en zona de parking, no hace nada más (no cosecha ni riega)
                continue
            # -------------------------------------------------------

            # FASE 1: SOLO PLANTADORES
            if self.cycle_phase == 'planting':
                if ag.role == 'planter' and self.grid[y, x] == EMPTY and self._is_inside_parcel(x, y):
                    if ag.use_capacity(1) and ag.consume_fuel(self.FUEL_COST_PLANT):
                        self.grid[y, x] = CROP
                        ag.planted += 1
                        self.planted_total += 1
                        rewards[i] += self.REWARD_PLANT
                        infos[i]['planted'] = True
                        ag.path = [] # Limpiar ruta para buscar nuevo objetivo cercano
                    else:
                        ag.is_returning_to_barn = True
                
                elif ag.role != 'planter':
                    rewards[i] += 0.5 # Pequeña recompensa por existir (evitar suicidio)
            
            # FASE 2: SOLO IRRIGADORES
            elif self.cycle_phase == 'irrigating':
                if ag.role == 'irrigator' and self.grid[y, x] == CROP:
                    if ag.use_capacity(1) and ag.consume_fuel(self.FUEL_COST_IRRIGATE):
                        self.water[y, x] += 1
                        ag.irrigated += 1
                        self.irrigated_total += 1
                        rewards[i] += self.REWARD_IRRIGATE
                        infos[i]['irrigated'] = True
                        ag.path = []
                    else:
                        ag.is_returning_to_barn = True
                
                elif ag.role != 'irrigator':
                    rewards[i] += 0.5
            
            # FASE 3: SOLO COSECHADORES
            elif self.cycle_phase == 'harvesting':
                if ag.role == 'harvester' and self.grid[y, x] == CROP:
                    # Solo cosechar si está regado (opcional, según tu regla)
                    if self.water[y, x] >= 1:
                        if ag.use_capacity(1) and ag.consume_fuel(self.FUEL_COST_HARVEST):
                            self.grid[y, x] = PATH # O EMPTY
                            ag.harvested += 1
                            self.harvested_total += 1
                            rewards[i] += self.REWARD_HARVEST
                            if self.water[y, x] >= 2:
                                rewards[i] += 10.0 # Bonus por cultivo bien regado
                            infos[i]['harvested'] = True
                            ag.path = []
                        else:
                            ag.is_returning_to_barn = True
                    else:
                        rewards[i] += self.PENALTY_FAIL # Penalización por cosechar seco
                elif ag.role != 'harvester':
                    rewards[i] += 0.5
            
            # Chequeo general de retorno (por si se gastó fuel en esta acción)
            if ag.should_return_to_barn() and not in_parking_zone:
                ag.is_returning_to_barn = True
                ag.path = [] 
        
        # CONDICIÓN DE TERMINACIÓN: CICLO COMPLETO
        done = self.is_task_complete()
        
        if done:
            cycle_bonus = self.REWARD_CYCLE_COMPLETE
            # Bonus de eficiencia por tiempo (pasos)
            efficiency_bonus = max(0, 300.0 - (self.step_count / 10))
            total_bonus = cycle_bonus + efficiency_bonus
            
            for i in range(len(rewards)):
                rewards[i] += total_bonus / len(rewards)
        
        return rewards, infos, done
    
    def is_task_complete(self):
        return (
            self.planted_total >= self.target_planted and
            self.irrigated_total >= self.target_irrigated and
            self.harvested_total >= self.target_harvested
        )
    
    def get_metrics(self):
        return {
            'step': int(self.step_count),
            'cycle_phase': str(self.cycle_phase),
            'phase_progress': float(self.get_phase_progress()),
            'planted': int(self.planted_total),
            'irrigated': int(self.irrigated_total),
            'harvested': int(self.harvested_total),
            'remaining_crops': int(np.sum(self.grid == CROP)),
            'progress': {
                'planted': f"{self.planted_total}/{self.target_planted}",
                'irrigated': f"{self.irrigated_total}/{self.target_irrigated}",
                'harvested': f"{self.harvested_total}/{self.target_harvested}",
                'completion': int(self.get_completion_percentage())
            },
            'task_complete': bool(self.is_task_complete()),
            'parcels': int(len(self.parcels)),
            'phase_requirements': {
                'planting': int(self.phase_requirements['planting']),
                'irrigating': int(self.phase_requirements['irrigating']),
                'harvesting': int(self.phase_requirements['harvesting'])
            }
        }
    
    def get_completion_percentage(self):
        planted_pct = min(100, (self.planted_total / max(1, self.target_planted)) * 100)
        irrigated_pct = min(100, (self.irrigated_total / max(1, self.target_irrigated)) * 100)
        harvested_pct = min(100, (self.harvested_total / max(1, self.target_harvested)) * 100)
        
        return int((planted_pct + irrigated_pct + harvested_pct) / 3)
    
    def update_crops(self):
        for y in range(self.h):
            for x in range(self.w):
                if self.grid[y, x] == 2:  # CROP
                # Lógica de crecimiento
                    pass