from __future__ import annotations

from alfabetia_rural.config import DATA_DIR, Settings, get_settings
from alfabetia_rural.llm.factory import build_llm
from alfabetia_rural.services.observability import ObservabilityService
from alfabetia_rural.services.orchestrator import Orchestrator
from alfabetia_rural.storage.crypto import LocalCipher
from alfabetia_rural.storage.sqlite_store import SQLiteStore
from alfabetia_rural.utils.loaders import load_yaml


def build_store(settings: Settings | None = None) -> SQLiteStore:
    settings = settings or get_settings()
    store = SQLiteStore(settings.db_path, cipher=LocalCipher(settings.fernet_key), audit_secret=settings.audit_secret)
    store.init_db()
    return store


def build_orchestrator(
    store: SQLiteStore | None = None, 
    settings: Settings | None = None, 
    *, 
    force_stub_llm: bool | None = None,
    observability: ObservabilityService | None = None
) -> Orchestrator:
    settings = settings or get_settings()
    store = store or build_store(settings)
    obs = observability or ObservabilityService(store)
    codebook = store.get_setting("codebook_seed") or load_yaml(DATA_DIR / "codebook_seed.yaml")
    l0 = store.get_setting("l0_curriculum") or load_yaml(DATA_DIR / "l0_curriculum.yaml")
    policies = store.get_setting("policies_seed") or load_yaml(DATA_DIR / "policies_seed.yaml")
    llm = build_llm(settings, store=store, force_stub=settings.force_stub_llm if force_stub_llm is None else force_stub_llm)
    return Orchestrator(store=store, codebook=codebook, l0=l0, policies=policies, llm=llm, observability=obs)
