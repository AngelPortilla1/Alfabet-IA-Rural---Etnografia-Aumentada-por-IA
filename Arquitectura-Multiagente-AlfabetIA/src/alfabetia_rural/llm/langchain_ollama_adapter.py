from __future__ import annotations

import json
from typing import Any


class LangChainOllamaClient:
    """Adaptador opcional. El núcleo no depende de LangChain.

    Se carga perezosamente para que el sistema siga instalable sin los extras.
    """

    provider_name = "langchain-ollama"

    def __init__(self, model: str = "qwen3:8b", base_url: str = "http://localhost:11434"):
        try:
            from langchain_ollama import ChatOllama
        except Exception as exc:  # pragma: no cover
            raise RuntimeError("Instale el extra: pip install -e '.[ollama]'") from exc
        self.chat = ChatOllama(model=model, base_url=base_url, temperature=0.1, format="json")

    def complete_json(self, task: str, payload: dict[str, Any]) -> dict[str, Any]:
        message = (
            "Responde únicamente JSON válido. No trates inferencias como evidencia primaria. "
            f"Tarea={task}. Payload={json.dumps(payload, ensure_ascii=False)}"
        )
        response = self.chat.invoke(message)
        content = getattr(response, "content", "{}")
        if isinstance(content, list):
            content = "".join(str(part) for part in content)
        try:
            parsed = json.loads(str(content))
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
