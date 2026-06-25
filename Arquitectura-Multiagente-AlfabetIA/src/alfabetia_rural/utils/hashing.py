from __future__ import annotations

import hashlib
import hmac
from typing import Any

from alfabetia_rural.utils.serializers import dumps


def canonical_hash(data: Any) -> str:
    return hashlib.sha256(dumps(data).encode("utf-8")).hexdigest()


def short_hash(data: Any, length: int = 16) -> str:
    return canonical_hash(data)[:length]


def sign_payload(data: Any, secret: str | None) -> str | None:
    if not secret:
        return None
    return hmac.new(secret.encode("utf-8"), dumps(data).encode("utf-8"), hashlib.sha256).hexdigest()


def verify_signature(data: Any, signature: str | None, secret: str | None) -> bool:
    expected = sign_payload(data, secret)
    if expected is None and signature is None:
        return True
    if expected is None or signature is None:
        return False
    return hmac.compare_digest(expected, signature)
