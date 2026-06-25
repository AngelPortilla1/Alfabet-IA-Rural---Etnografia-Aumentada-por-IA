from __future__ import annotations

from pathlib import Path

import pytest

from alfabetia_rural.agents.base import AgentContext
from alfabetia_rural.config import DATA_DIR
from alfabetia_rural.storage.sqlite_store import SQLiteStore
from alfabetia_rural.utils.loaders import load_yaml


@pytest.fixture
def store(tmp_path: Path) -> SQLiteStore:
    s = SQLiteStore(tmp_path / "test.db", audit_secret="test-secret")
    s.init_db()
    return s


@pytest.fixture
def context(store: SQLiteStore) -> AgentContext:
    return AgentContext(
        store=store,
        codebook=load_yaml(DATA_DIR / "codebook_seed.yaml"),
        l0=load_yaml(DATA_DIR / "l0_curriculum.yaml"),
        policies=load_yaml(DATA_DIR / "policies_seed.yaml"),
    )
