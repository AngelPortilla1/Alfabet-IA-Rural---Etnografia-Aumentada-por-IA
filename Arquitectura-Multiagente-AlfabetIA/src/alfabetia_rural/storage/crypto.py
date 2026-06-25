from __future__ import annotations

from dataclasses import dataclass

try:
    from cryptography.fernet import Fernet, InvalidToken
except Exception:  # pragma: no cover - permite instalar sin crypto durante desarrollo mínimo
    Fernet = None  # type: ignore[assignment]
    InvalidToken = Exception  # type: ignore[assignment]


@dataclass(frozen=True)
class LocalCipher:
    """Cifrado local simétrico opcional.

    En producción debe inyectarse alfabetia_FERNET_KEY. Si no hay llave, el modo
    explícito es plaintext para desarrollo local y pruebas; el estado queda visible
    en la auditoría y no debe usarse para datos reales.
    """

    key: str | None = None

    @staticmethod
    def generate_key() -> str:
        if Fernet is None:
            raise RuntimeError("cryptography no está disponible")
        return Fernet.generate_key().decode("utf-8")

    @property
    def enabled(self) -> bool:
        return bool(self.key and Fernet is not None)

    def encrypt(self, value: str) -> str:
        if not self.enabled:
            return value
        return Fernet(self.key.encode("utf-8")).encrypt(value.encode("utf-8")).decode("utf-8")

    def decrypt(self, value: str) -> str:
        if not self.enabled:
            return value
        try:
            return Fernet(self.key.encode("utf-8")).decrypt(value.encode("utf-8")).decode("utf-8")
        except InvalidToken as exc:
            raise ValueError("No se pudo descifrar el registro local") from exc
