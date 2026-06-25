from __future__ import annotations

import json
from datetime import date, datetime
from enum import Enum
from pathlib import Path
from typing import Any


def _default(obj: Any) -> Any:
    if isinstance(obj, datetime | date):
        return obj.isoformat()
    if isinstance(obj, Enum):
        return obj.value
    if isinstance(obj, Path):
        return str(obj)
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


def dumps(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, sort_keys=True, default=_default, separators=(",", ":"))


def pretty_dumps(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True, default=_default)


def loads(raw: str) -> Any:
    return json.loads(raw)
