from __future__ import annotations

from typing import Any, Protocol


class LLMClientProtocol(Protocol):
    provider_name: str

    def complete_json(self, task: str, payload: dict[str, Any]) -> dict[str, Any]: ...
