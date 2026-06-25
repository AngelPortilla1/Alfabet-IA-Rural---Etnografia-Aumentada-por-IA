from __future__ import annotations

from alfabetia_rural.config import Settings
from alfabetia_rural.llm.base import LLMClientProtocol
from alfabetia_rural.llm.ollama_client import OllamaLLMClient
from alfabetia_rural.llm.stub import StubLLMClient


def build_llm(settings: Settings, store=None, *, force_stub: bool = False) -> LLMClientProtocol:
    if force_stub:
        return StubLLMClient()
    provider = settings.llm_provider.lower().strip()
    if provider == "stub":
        return StubLLMClient()
    if provider == "ollama":
        return OllamaLLMClient(
            base_url=settings.ollama_base_url,
            model=settings.ollama_model,
            timeout_s=settings.ollama_timeout_s,
        )
    if provider in {"openai", "cloud"}:
        from alfabetia_rural.llm.cloud_client import CloudLLMClient
        if not settings.openai_api_key:
            raise ValueError("alfabetia_OPENAI_API_KEY no está configurada")
        return CloudLLMClient(
            base_url=settings.openai_base_url,
            api_key=settings.openai_api_key,
            model=settings.openai_model,
            store=store,
        )
    if provider in {"langchain-ollama", "langchain_ollama"}:
        from alfabetia_rural.llm.langchain_ollama_adapter import LangChainOllamaClient

        return LangChainOllamaClient(model=settings.ollama_model, base_url=settings.ollama_base_url)
    raise ValueError(f"Proveedor LLM no permitido: {settings.llm_provider}. Use 'ollama', 'openai', 'langchain-ollama' o 'stub'.")
