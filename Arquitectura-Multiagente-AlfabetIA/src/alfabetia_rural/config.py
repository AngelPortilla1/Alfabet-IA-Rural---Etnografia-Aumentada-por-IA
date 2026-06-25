from __future__ import annotations

import os
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

PACKAGE_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = PACKAGE_ROOT.parent.parent
DATA_DIR = PROJECT_ROOT / "data"
DEFAULT_DB_PATH = PROJECT_ROOT / "runtime" / "alfabetia_rural.db"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="alfabetia_", env_file=str(PROJECT_ROOT / ".env"), extra="ignore")

    db_path: Path = Field(default_factory=lambda: Path(os.getenv("alfabetia_DB_PATH", str(DEFAULT_DB_PATH))))
    llm_provider: str = Field(default_factory=lambda: os.getenv("alfabetia_LLM_PROVIDER", "ollama"))
    ollama_model: str = Field(default_factory=lambda: os.getenv("alfabetia_OLLAMA_MODEL", "qwen2.5-Coder"))
    ollama_base_url: str = Field(default_factory=lambda: os.getenv("alfabetia_OLLAMA_BASE_URL", "http://localhost:11434"))
    ollama_timeout_s: float = Field(default_factory=lambda: float(os.getenv("alfabetia_OLLAMA_TIMEOUT_S", "120")))
    
    openai_api_key: str | None = Field(default_factory=lambda: os.getenv("alfabetia_OPENAI_API_KEY"))
    openai_base_url: str = Field(default_factory=lambda: os.getenv("alfabetia_OPENAI_BASE_URL", "https://api.openai.com/v1"))
    openai_model: str = Field(default_factory=lambda: os.getenv("alfabetia_OPENAI_MODEL", "gpt-4o-mini"))
    
    fernet_key: str | None = Field(default_factory=lambda: os.getenv("alfabetia_FERNET_KEY"))
    audit_secret: str | None = Field(default_factory=lambda: os.getenv("alfabetia_AUDIT_SECRET"))
    force_stub_llm: bool = Field(default_factory=lambda: os.getenv("alfabetia_FORCE_STUB_LLM", "0") == "1")

    review_uncertainty_threshold: float = 0.55
    code_review_confidence_threshold: float = 0.50
    fairness_channel_min_fraction: float = 0.10
    route_score_review_threshold: float = 0.45


def get_settings() -> Settings:
    return Settings()
