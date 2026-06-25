from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Optional

from pydantic import BaseModel, Field


class AgentState(StrEnum):
    IDLE = "idle"
    WORKING = "working"
    WAITING_REVIEW = "waiting_review"
    ERROR = "error"
    OFFLINE = "offline"


class AgentStatus(BaseModel):
    id: str
    name: str
    status: AgentState = AgentState.IDLE
    task: Optional[str] = None
    last_seen: datetime = Field(default_factory=datetime.now)
    version: str = "0.3.0"


class SystemObservability(BaseModel):
    agents: list[AgentStatus]
    uptime_seconds: float
    total_events_processed: int
    last_event_at: Optional[datetime] = None
