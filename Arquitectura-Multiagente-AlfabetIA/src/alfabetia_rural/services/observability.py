from __future__ import annotations

import time
from datetime import datetime
from typing import Dict, List, Optional

from alfabetia_rural.domain.observability import AgentState, AgentStatus, SystemObservability
from alfabetia_rural.storage.sqlite_store import SQLiteStore


class ObservabilityService:
    def __init__(self, store: Optional[SQLiteStore] = None):
        self.store = store
        self._start_time = time.time()
        self._agent_registry: Dict[str, AgentStatus] = {}
        self._total_events = 0
        self._last_event_at: Optional[datetime] = None
        
        # Initialize default agents
        self._init_agents()

    def _init_agents(self):
        agent_definitions = [
            ("AGOV", "Agente de Gobernanza"),
            ("AING", "Agente de Ingestión"),
            ("AETHNO", "Agente Etnográfico"),
            ("ACODE", "Agente de Codificación"),
            ("AMIND", "Agente de Modelos Mentales"),
            ("AFAIR", "Agente de Equidad"),
            ("APLAN", "Agente de Planeación"),
            ("AEXPL", "Agente de Explicación"),
            ("ASUP", "Agente Supervisor"),
            ("ASYNC", "Agente de Sincronización"),
        ]
        for aid, name in agent_definitions:
            self._agent_registry[aid] = AgentStatus(id=aid, name=name)

    def report_start(self, agent_id: str, task: str):
        if agent_id in self._agent_registry:
            status = self._agent_registry[agent_id]
            status.status = AgentState.WORKING
            status.task = task
            status.last_seen = datetime.now()
        
        if agent_id == "AGOV": # Start of pipeline
            self._total_events += 1
            self._last_event_at = datetime.now()

    def report_end(self, agent_id: str, state: AgentState = AgentState.IDLE, task: Optional[str] = None):
        if agent_id in self._agent_registry:
            status = self._agent_registry[agent_id]
            status.status = state
            status.task = task
            status.last_seen = datetime.now()

    def report_error(self, agent_id: str, error_msg: str):
        if agent_id in self._agent_registry:
            status = self._agent_registry[agent_id]
            status.status = AgentState.ERROR
            status.task = f"Error: {error_msg}"
            status.last_seen = datetime.now()

    def get_system_status(self) -> SystemObservability:
        # Here we could also check if an agent hasn't been seen in a long time to mark as OFFLINE
        # But in a synchronous system, they are mostly IDLE.
        
        return SystemObservability(
            agents=list(self._agent_registry.values()),
            uptime_seconds=time.time() - self._start_time,
            total_events_processed=self._total_events,
            last_event_at=self._last_event_at
        )
