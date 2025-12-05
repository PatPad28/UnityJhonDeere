from pydantic import BaseModel
from typing import Optional, List, Tuple

class TrainRequest(BaseModel):
    episodes: int = 20
    steps_per_episode: int = 400
    alpha: float = 0.3
    gamma: float = 0.9
    eps: float = 0.25

class ParamsUpdate(BaseModel):
    alpha: Optional[float]
    gamma: Optional[float]
    eps: Optional[float]
    eps_decay: Optional[float]
    
class ControlReply(BaseModel):
    status: str
    detail: Optional[str] = None

class SimulationRequest(BaseModel):
    steps: int
    width: int
    height: int
    n_agents: int

class SimulationResult(BaseModel):
    frames: List[dict]
