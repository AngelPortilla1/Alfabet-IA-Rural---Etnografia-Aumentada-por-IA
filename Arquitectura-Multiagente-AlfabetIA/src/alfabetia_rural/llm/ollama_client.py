from __future__ import annotations

import json
from typing import Any

import httpx


class OllamaLLMClient:
    """Adaptador local para Ollama.

    No usa nube. Requiere un servidor Ollama local: `ollama serve` y un modelo
    instalado, por ejemplo `ollama pull qwen3:8b`.
    """

    provider_name = "ollama"

    def __init__(self, base_url: str = "http://localhost:11434", model: str = "qwen2.5-Coder", timeout_s: float = 600.0):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout_s = timeout_s

    def complete_json(self, task: str, payload: dict[str, Any]) -> dict[str, Any]:
        prompt = self._build_prompt(task, payload)
        body = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {"temperature": 0.1, "num_ctx": 4096},
        }
        with httpx.Client(timeout=self.timeout_s) as client:
            response = client.post(f"{self.base_url}/api/generate", json=body)
            response.raise_for_status()
        data = response.json()
        raw = data.get("response", "{}")
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            start = raw.find("{")
            end = raw.rfind("}")
            parsed = json.loads(raw[start : end + 1]) if start >= 0 and end > start else {}
        return parsed if isinstance(parsed, dict) else {}

    def _build_prompt(self, task: str, payload: dict[str, Any]) -> str:
        common = (
            "Responde estrictamente en JSON válido. "
            "No inventes evidencia primaria. Marca inferencias como inferidas. "
            "Contexto: AlfabetIA Rural, sistema human-in-the-loop, offline-first.\n"
        )
        if task == "probe":
            return common + (
                "Tarea: proponer una pregunta etnográfica prudente de seguimiento. "
                "Salida: {\"question\": str, \"justification\": str, \"sensitive\": bool, \"uncertainty\": float}.\n"
                f"Segmento: {payload.get('normalized_text','')}"
            )
        if task == "codes":
            return common + (
                "Tarea: sugerir códigos cualitativos desde el codebook permitido. "
                "Salida: {\"codes\": [{\"code\": str, \"confidence\": float, \"evidence_quote\": str, \"requires_review\": bool}]}.\n"
                f"Payload: {json.dumps(payload, ensure_ascii=False)}"
            )
        if task == "explanation":
            return common + (
                "Tarea: redactar explicación breve, trazable y no técnica de una ruta pedagógica candidata. "
                "Salida: {\"explanation\": str}.\n"
                f"Payload: {json.dumps(payload, ensure_ascii=False)}"
            )
        return common + json.dumps(payload, ensure_ascii=False)
