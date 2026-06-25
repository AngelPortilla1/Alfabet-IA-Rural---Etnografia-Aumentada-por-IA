from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional, TYPE_CHECKING

from alfabetia_rural.storage.sqlite_store import SQLiteStore

if TYPE_CHECKING:
    from alfabetia_rural.services.observability import ObservabilityService


@dataclass(slots=True)
class AgentContext:
    store: SQLiteStore
    codebook: dict[str, Any]
    l0: dict[str, Any]
    policies: dict[str, Any]
    observability: Optional[ObservabilityService] = None
