from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any

from alfabetia_rural.domain.enums import ApprovalStatus, ConsentScope, MemoryLayer, ReviewStatus, SyncStatus
from alfabetia_rural.domain.models import (
    AuditRecord,
    EventEnvelope,
    LiteracyRoute,
    MentalModel,
    NormalizedSegment,
    OfflineDelta,
    ReviewItem,
    RevocationRecord,
    Segment,
    utcnow,
)
from alfabetia_rural.storage.crypto import LocalCipher
from alfabetia_rural.utils.hashing import canonical_hash, short_hash, sign_payload
from alfabetia_rural.utils.serializers import dumps, loads


class SQLiteStore:
    """Persistencia local controlada.

    No pretende resolver federación completa. Sí implementa los invariantes mínimos
    para un piloto: colas, versiones, hash chain, tombstones y revisión humana.
    """

    def __init__(self, db_path: Path, cipher: LocalCipher | None = None, audit_secret: str | None = None):
        self.db_path = Path(db_path)
        self.cipher = cipher or LocalCipher()
        self.audit_secret = audit_secret
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self) -> None:
        with self._conn() as conn:
            conn.executescript(
                """
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS events (
                    sid TEXT PRIMARY KEY,
                    event_id TEXT NOT NULL,
                    pid TEXT NOT NULL,
                    data TEXT NOT NULL,
                    data_hash TEXT NOT NULL,
                    tombstoned INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS normalized_segments (
                    sid TEXT PRIMARY KEY,
                    pid TEXT NOT NULL,
                    data TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS mental_models (
                    pid TEXT NOT NULL,
                    revision INTEGER NOT NULL,
                    data TEXT NOT NULL,
                    revision_hash TEXT NOT NULL,
                    current INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL,
                    PRIMARY KEY (pid, revision)
                );
                CREATE TABLE IF NOT EXISTS routes (
                    route_hash TEXT PRIMARY KEY,
                    pid TEXT NOT NULL,
                    segment_id TEXT,
                    version INTEGER NOT NULL,
                    approval_status TEXT NOT NULL,
                    data TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS segments (segment_id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS reviews (review_id TEXT PRIMARY KEY, data TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS audit (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    record_hash TEXT NOT NULL,
                    previous_hash TEXT,
                    data TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS deltas (
                    delta_id TEXT PRIMARY KEY,
                    object_type TEXT NOT NULL,
                    object_id TEXT NOT NULL,
                    memory_layer TEXT NOT NULL,
                    data_hash TEXT NOT NULL,
                    signature TEXT,
                    status TEXT NOT NULL,
                    conflict_with TEXT,
                    data TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS revocations (
                    tombstone_hash TEXT PRIMARY KEY,
                    pid TEXT NOT NULL,
                    scope TEXT,
                    reason TEXT,
                    data TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS dialogue_turns (
                    turn_id TEXT PRIMARY KEY,
                    participant_id TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    text TEXT NOT NULL,
                    channel TEXT NOT NULL,
                    consent_scope TEXT NOT NULL,
                    hash TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS dialogue_summaries (
                    participant_id TEXT PRIMARY KEY,
                    summary TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS open_gaps (
                    participant_id TEXT PRIMARY KEY,
                    gaps TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS risk_flags (
                    participant_id TEXT PRIMARY KEY,
                    flags TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                """
            )
            conn.commit()

    def set_setting(self, key: str, value: Any) -> None:
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (key, dumps(value)),
            )
            conn.commit()

    def get_setting(self, key: str, default: Any = None) -> Any:
        with self._conn() as conn:
            row = conn.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
            return loads(row[0]) if row else default

    def save_event(self, event: EventEnvelope) -> None:
        data = event.model_dump(mode="json")
        encrypted = self.cipher.encrypt(dumps(data))
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO events(sid, event_id, pid, data, data_hash, created_at)
                VALUES(?, ?, ?, ?, ?, ?)
                ON CONFLICT(sid) DO UPDATE SET event_id=excluded.event_id, pid=excluded.pid,
                data=excluded.data, data_hash=excluded.data_hash
                """,
                (event.sid, event.event_id, event.pid, encrypted, canonical_hash(data), utcnow().isoformat()),
            )
            conn.commit()

    def list_events(self, include_tombstoned: bool = False) -> list[dict[str, Any]]:
        query = "SELECT data FROM events"
        if not include_tombstoned:
            query += " WHERE tombstoned=0"
        query += " ORDER BY created_at, sid"
        with self._conn() as conn:
            rows = conn.execute(query).fetchall()
            return [loads(self.cipher.decrypt(row[0])) for row in rows]

    def save_normalized_segment(self, segment: NormalizedSegment) -> None:
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO normalized_segments(sid, pid, data, created_at) VALUES(?, ?, ?, ?) ON CONFLICT(sid) DO UPDATE SET data=excluded.data",
                (segment.sid, segment.pid, dumps(segment.model_dump(mode="json")), utcnow().isoformat()),
            )
            conn.commit()

    def save_mental_model(self, model: MentalModel) -> None:
        data = model.model_dump(mode="json")
        revision_hash = model.revision_hash or canonical_hash(data)
        with self._conn() as conn:
            conn.execute("UPDATE mental_models SET current=0 WHERE pid=?", (model.pid,))
            conn.execute(
                """
                INSERT OR REPLACE INTO mental_models(pid, revision, data, revision_hash, current, created_at)
                VALUES(?, ?, ?, ?, 1, ?)
                """,
                (model.pid, model.revision, dumps(data), revision_hash, utcnow().isoformat()),
            )
            conn.commit()

    def _hydrate_evidence_refs(self, conn: sqlite3.Connection, model: MentalModel) -> MentalModel:
        turns_rows = conn.execute(
            "SELECT turn_id, session_id, participant_id, text, role, created_at FROM dialogue_turns WHERE participant_id=? ORDER BY created_at ASC", (model.pid,)
        ).fetchall()
        
        from alfabetia_rural.domain.models import EvidenceRef, EvidenceKind
        from alfabetia_rural.domain.enums import ConsentScope
        
        dynamic_evidence = []
        for t in turns_rows:
            ref1 = EvidenceRef(
                source_event_id=t["turn_id"],
                sid=t["session_id"],
                pid=t["participant_id"],
                evidence_id=t["turn_id"],
                quote=t["text"],
                kind=EvidenceKind.direct,
                consent_scope=ConsentScope.semantic_processing,
                confidence=0.75,
                uncertainty=0.25
            )
            ref2 = EvidenceRef(
                source_event_id=t["turn_id"],
                sid=t["session_id"],
                pid=t["participant_id"],
                evidence_id=f"turn:{t['turn_id']}",
                quote=t["text"],
                kind=EvidenceKind.direct,
                consent_scope=ConsentScope.semantic_processing,
                confidence=0.75,
                uncertainty=0.25
            )
            dynamic_evidence.extend([ref1, ref2])
            
        model.evidence_refs = list(model.evidence_refs) + dynamic_evidence
        return model

    def load_mental_model(self, pid: str, revision: int | None = None) -> MentalModel | None:
        with self._conn() as conn:
            if revision is None:
                row = conn.execute(
                    "SELECT data FROM mental_models WHERE pid=? AND current=1 ORDER BY revision DESC LIMIT 1", (pid,)
                ).fetchone()
            else:
                row = conn.execute("SELECT data FROM mental_models WHERE pid=? AND revision=?", (pid, revision)).fetchone()
            if not row:
                return None
            model = MentalModel.model_validate(loads(row[0]))
            return self._hydrate_evidence_refs(conn, model)

    def list_mental_models(self, current_only: bool = True) -> list[MentalModel]:
        query = "SELECT data FROM mental_models"
        if current_only:
            query += " WHERE current=1"
        query += " ORDER BY pid, revision"
        with self._conn() as conn:
            rows = conn.execute(query).fetchall()
            models = [MentalModel.model_validate(loads(row[0])) for row in rows]
            return [self._hydrate_evidence_refs(conn, m) for m in models]

    def save_route(self, route: LiteracyRoute) -> None:
        data = route.model_dump(mode="json")
        route_hash = route.route_hash or canonical_hash(data)
        with self._conn() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO routes(route_hash, pid, segment_id, version, approval_status, data, created_at)
                VALUES(?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    route_hash,
                    route.pid,
                    route.segment_id,
                    route.version,
                    route.approval_status.value,
                    dumps(data),
                    route.updated_at.isoformat(),
                ),
            )
            conn.commit()

    def latest_route(self, pid: str) -> LiteracyRoute | None:
        with self._conn() as conn:
            row = conn.execute("SELECT data FROM routes WHERE pid=? ORDER BY created_at DESC LIMIT 1", (pid,)).fetchone()
            return LiteracyRoute.model_validate(loads(row[0])) if row else None

    def list_routes(self) -> list[LiteracyRoute]:
        with self._conn() as conn:
            rows = conn.execute("SELECT data FROM routes ORDER BY created_at, pid").fetchall()
            return [LiteracyRoute.model_validate(loads(row[0])) for row in rows]

    def approve_route(self, route_hash: str, approver: str, note: str | None = None) -> None:
        with self._conn() as conn:
            row = conn.execute("SELECT data FROM routes WHERE route_hash=?", (route_hash,)).fetchone()
            if not row:
                raise KeyError(route_hash)
            route = LiteracyRoute.model_validate(loads(row[0]))
            route.approval_status = ApprovalStatus.approved
            route.human_review_required = False
            route.explanation = f"{route.explanation}\nAprobada por {approver}. {note or ''}".strip()
            data = route.model_dump(mode="json")
            conn.execute(
                "UPDATE routes SET data=?, approval_status=? WHERE route_hash=?",
                (dumps(data), route.approval_status.value, route_hash),
            )
            conn.commit()

    def save_segment(self, segment: Segment) -> None:
        with self._conn() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO segments(segment_id, data, created_at) VALUES(?, ?, ?)",
                (segment.segment_id, dumps(segment.model_dump(mode="json")), utcnow().isoformat()),
            )
            conn.commit()

    def list_segments(self) -> list[Segment]:
        with self._conn() as conn:
            rows = conn.execute("SELECT data FROM segments ORDER BY segment_id").fetchall()
            return [Segment.model_validate(loads(row[0])) for row in rows]

    def clear_segments(self) -> None:
        with self._conn() as conn:
            conn.execute("DELETE FROM segments")
            conn.commit()

    def save_review(self, item: ReviewItem) -> None:
        with self._conn() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO reviews(review_id, data, status, created_at) VALUES(?, ?, ?, ?)",
                (item.review_id, dumps(item.model_dump(mode="json")), item.status.value, item.created_at.isoformat()),
            )
            conn.commit()

    def update_review_status(
        self,
        review_id: str,
        status: str | ReviewStatus,
        resolved_by: str | None = None,
        note: str | None = None,
    ) -> None:
        status_enum = status if isinstance(status, ReviewStatus) else ReviewStatus(status)
        with self._conn() as conn:
            row = conn.execute("SELECT data FROM reviews WHERE review_id=?", (review_id,)).fetchone()
            if not row:
                raise KeyError(review_id)
            item = ReviewItem.model_validate(loads(row[0]))
            item.status = status_enum
            item.resolved_at = utcnow()
            item.resolved_by = resolved_by
            item.resolution_note = note
            conn.execute(
                "UPDATE reviews SET data=?, status=? WHERE review_id=?",
                (dumps(item.model_dump(mode="json")), status_enum.value, review_id),
            )
            
            # Sincronizar el estado de la ruta si la revisión es de la etapa M_CURR (ruta pedagógica)
            if item.stage == "M_CURR":
                route_hash = item.payload.get("route_hash")
                if route_hash:
                    route_row = conn.execute("SELECT data FROM routes WHERE route_hash=?", (route_hash,)).fetchone()
                    if route_row:
                        route = LiteracyRoute.model_validate(loads(route_row[0]))
                        if status_enum == ReviewStatus.approved:
                            route.approval_status = ApprovalStatus.approved
                            route.explanation = f"{route.explanation}\nAprobada por {resolved_by or 'human'}. {note or ''}".strip()
                        elif status_enum == ReviewStatus.rejected:
                            route.approval_status = ApprovalStatus.rejected
                            route.explanation = f"{route.explanation}\nRechazada por {resolved_by or 'human'}. {note or ''}".strip()
                        route.human_review_required = False
                        conn.execute(
                            "UPDATE routes SET data=?, approval_status=? WHERE route_hash=?",
                            (dumps(route.model_dump(mode="json")), route.approval_status.value, route_hash),
                        )
            conn.commit()
            
        action = "approve_review" if status_enum == ReviewStatus.approved else "reject_review"
        self.append_audit(
            AuditRecord(
                agent="HUMAN_OPERATOR",
                pid=item.pid,
                action=action,
                memory_layer=MemoryLayer.policy,
                payload={
                    "review_id": review_id, 
                    "status": status_enum.value, 
                    "resolved_by": resolved_by, 
                    "note": note
                }
            )
        )

    def list_reviews(self, status: ReviewStatus | None = None) -> list[ReviewItem]:
        query = "SELECT data FROM reviews"
        params: tuple[str, ...] = ()
        if status is not None:
            query += " WHERE status=?"
            params = (status.value,)
        query += " ORDER BY created_at, review_id"
        with self._conn() as conn:
            rows = conn.execute(query, params).fetchall()
            return [ReviewItem.model_validate(loads(row[0])) for row in rows]

    def _last_audit_hash(self) -> str | None:
        with self._conn() as conn:
            row = conn.execute("SELECT record_hash FROM audit ORDER BY id DESC LIMIT 1").fetchone()
            return str(row[0]) if row else None

    def append_audit(self, record: AuditRecord) -> AuditRecord:
        previous = self._last_audit_hash()
        record.previous_hash = previous
        body = record.model_dump(mode="json", exclude={"record_hash", "signature"})
        record.record_hash = canonical_hash(body)
        record.signature = sign_payload(body, self.audit_secret)
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO audit(created_at, record_hash, previous_hash, data) VALUES(?, ?, ?, ?)",
                (record.timestamp.isoformat(), record.record_hash, previous, dumps(record.model_dump(mode="json"))),
            )
            conn.commit()
        return record

    def list_audit(self) -> list[dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute("SELECT data FROM audit ORDER BY id").fetchall()
            return [loads(row[0]) for row in rows]

    def queue_delta(self, object_type: str, object_id: str, memory_layer: MemoryLayer, data: dict[str, Any]) -> OfflineDelta:
        data_hash = canonical_hash(data)
        delta_id = short_hash({"object_type": object_type, "object_id": object_id, "data_hash": data_hash})
        signature = sign_payload(data, self.audit_secret)
        with self._conn() as conn:
            existing = conn.execute("SELECT delta_id, data_hash FROM deltas WHERE delta_id=?", (delta_id,)).fetchone()
            status = SyncStatus.queued
            conflict_with = None
            if existing and existing["data_hash"] != data_hash:
                status = SyncStatus.conflict
                conflict_with = existing["delta_id"]
            delta = OfflineDelta(
                delta_id=delta_id,
                object_type=object_type,
                object_id=object_id,
                memory_layer=memory_layer,
                data=data,
                data_hash=data_hash,
                signature=signature,
                status=status,
                conflict_with=conflict_with,
            )
            conn.execute(
                """
                INSERT OR REPLACE INTO deltas(delta_id, object_type, object_id, memory_layer, data_hash, signature, status, conflict_with, data, created_at)
                VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    delta.delta_id,
                    delta.object_type,
                    delta.object_id,
                    delta.memory_layer.value,
                    delta.data_hash,
                    delta.signature,
                    delta.status.value,
                    delta.conflict_with,
                    dumps(delta.data),
                    delta.created_at.isoformat(),
                ),
            )
            conn.commit()
        return delta

    def list_deltas(self, status: SyncStatus | None = None) -> list[OfflineDelta]:
        query = "SELECT * FROM deltas"
        params: tuple[str, ...] = ()
        if status is not None:
            query += " WHERE status=?"
            params = (status.value,)
        query += " ORDER BY created_at"
        with self._conn() as conn:
            rows = conn.execute(query, params).fetchall()
            return [
                OfflineDelta(
                    delta_id=row["delta_id"],
                    object_type=row["object_type"],
                    object_id=row["object_id"],
                    memory_layer=MemoryLayer(row["memory_layer"]),
                    data=loads(row["data"]),
                    data_hash=row["data_hash"],
                    signature=row["signature"],
                    status=SyncStatus(row["status"]),
                    conflict_with=row["conflict_with"],
                    created_at=row["created_at"],
                )
                for row in rows
            ]

    def revoke_pid(self, pid: str, scope: ConsentScope | None = None, reason: str | None = None) -> RevocationRecord:
        record = RevocationRecord(pid=pid, scope=scope, reason=reason)
        with self._conn() as conn:
            # 1. Si es total (None) o de captura cruda (raw_capture)
            if scope in (None, ConsentScope.raw_capture):
                conn.execute("UPDATE events SET tombstoned=1 WHERE pid=?", (pid,))
                conn.execute("DELETE FROM normalized_segments WHERE pid=?", (pid,))
                
                # La tabla reviews no tiene columna pid, el pid está en el JSON serializado de data.
                rows = conn.execute("SELECT review_id, data FROM reviews").fetchall()
                for row in rows:
                    try:
                        item_data = loads(row["data"])
                        if item_data.get("pid") == pid:
                            conn.execute("DELETE FROM reviews WHERE review_id=?", (row["review_id"],))
                    except Exception:
                        pass
            
            # 2. Si es total (None) o de modelo mental (graph_derivative)
            if scope in (None, ConsentScope.graph_derivative):
                conn.execute("UPDATE mental_models SET current=0 WHERE pid=?", (pid,))
            
            # 3. Si es total (None) o de currículo (curriculum_derivative)
            if scope in (None, ConsentScope.curriculum_derivative):
                conn.execute("DELETE FROM routes WHERE pid=?", (pid,))

            conn.execute(
                "INSERT OR REPLACE INTO revocations(tombstone_hash, pid, scope, reason, data, created_at) VALUES(?, ?, ?, ?, ?, ?)",
                (
                    record.tombstone_hash,
                    pid,
                    scope.value if scope else None,
                    reason,
                    dumps(record.model_dump(mode="json")),
                    record.created_at.isoformat(),
                ),
            )
            conn.commit()
        self.append_audit(
            AuditRecord(
                agent="AGOV",
                pid=pid,
                action="revoke_pid",
                memory_layer=MemoryLayer.policy,
                payload=record.model_dump(mode="json"),
            )
        )
        return record

    def list_participant_consents(self) -> list[dict[str, Any]]:
        """Devuelve el estado de consentimiento por scope para cada PID conocido."""
        all_scopes = [s.value for s in ConsentScope]
        with self._conn() as conn:
            # Recopilar todos los PIDs únicos en el sistema
            pids_set: set[str] = set()
            for table in ("events", "mental_models", "revocations"):
                try:
                    rows = conn.execute(f"SELECT DISTINCT pid FROM {table}").fetchall()
                    pids_set.update(row["pid"] for row in rows)
                except Exception:
                    pass

            result = []
            for pid in sorted(pids_set):
                # Buscar todas las revocaciones para este PID
                revocations = conn.execute(
                    "SELECT scope, created_at FROM revocations WHERE pid=? ORDER BY created_at",
                    (pid,),
                ).fetchall()

                # Determinar qué scopes han sido revocados
                revoked_scopes: set[str] = set()
                full_revoke_at: str | None = None
                for rev in revocations:
                    if rev["scope"] is None:
                        # Revocación total: se marcan todos los scopes
                        revoked_scopes.update(all_scopes)
                        full_revoke_at = rev["created_at"]
                    else:
                        revoked_scopes.add(rev["scope"])

                consent_status = {scope: scope not in revoked_scopes for scope in all_scopes}

                result.append({
                    "pid": pid,
                    "consent": consent_status,
                    "full_revoke_at": full_revoke_at,
                    "revocations_count": len(revocations),
                })
            return result

    def get_dashboard_summary(self) -> dict[str, Any]:
        with self._conn() as conn:
            # 1. Participantes activos (PIDs con modelo mental actual)
            row_participants = conn.execute("SELECT COUNT(DISTINCT pid) as count FROM mental_models WHERE current=1").fetchone()
            active_participants = row_participants["count"] if row_participants else 0

            # 2. Revisiones pendientes
            row_reviews = conn.execute("SELECT COUNT(*) as count FROM reviews WHERE status='pending'").fetchone()
            pending_reviews = row_reviews["count"] if row_reviews else 0

            # 3. Estado offline (deltas pendientes)
            row_deltas = conn.execute("SELECT COUNT(*) as count FROM deltas").fetchone()
            pending_deltas = row_deltas["count"] if row_deltas else 0

            # 4. Último segmento
            row_segment = conn.execute("SELECT data FROM segments ORDER BY created_at DESC LIMIT 1").fetchone()
            latest_segment = loads(row_segment["data"]) if row_segment else None

            return {
                "active_participants": active_participants,
                "pending_reviews": pending_reviews,
                "pending_deltas": pending_deltas,
                "latest_segment": latest_segment
            }

    def append_dialogue_turn(self, turn_id: str, participant_id: str, session_id: str, role: str, text: str, channel: str, consent_scope: str, turn_hash: str) -> None:
        with self._conn() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO dialogue_turns(turn_id, participant_id, session_id, role, text, channel, consent_scope, hash, created_at)
                VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (turn_id, participant_id, session_id, role, text, channel, consent_scope, turn_hash, utcnow().isoformat())
            )
            conn.commit()

    def get_dialogue_transcript(self, participant_id: str) -> list[dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT role, text, created_at, turn_id FROM dialogue_turns WHERE participant_id=? ORDER BY created_at, turn_id",
                (participant_id,)
            ).fetchall()
            return [{"role": r["role"], "text": r["text"], "created_at": r["created_at"], "turn_id": r["turn_id"]} for r in rows]

    def get_dialogue_summary(self, participant_id: str) -> str:
        with self._conn() as conn:
            row = conn.execute("SELECT summary FROM dialogue_summaries WHERE participant_id=?", (participant_id,)).fetchone()
            return row["summary"] if row else ""

    def update_dialogue_summary(self, participant_id: str, summary: str) -> None:
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO dialogue_summaries(participant_id, summary, updated_at) VALUES(?, ?, ?) ON CONFLICT(participant_id) DO UPDATE SET summary=excluded.summary, updated_at=excluded.updated_at",
                (participant_id, summary, utcnow().isoformat())
            )
            conn.commit()

    def get_open_gaps(self, participant_id: str) -> list[dict[str, Any]]:
        with self._conn() as conn:
            row = conn.execute("SELECT gaps FROM open_gaps WHERE participant_id=?", (participant_id,)).fetchone()
            return loads(row["gaps"]) if row else []

    def update_open_gaps(self, participant_id: str, gaps: list[dict[str, Any]]) -> None:
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO open_gaps(participant_id, gaps, updated_at) VALUES(?, ?, ?) ON CONFLICT(participant_id) DO UPDATE SET gaps=excluded.gaps, updated_at=excluded.updated_at",
                (participant_id, dumps(gaps), utcnow().isoformat())
            )
            conn.commit()

    def get_risk_flags(self, participant_id: str) -> list[dict[str, Any]]:
        with self._conn() as conn:
            row = conn.execute("SELECT flags FROM risk_flags WHERE participant_id=?", (participant_id,)).fetchone()
            return loads(row["flags"]) if row else []

    def update_risk_flags(self, participant_id: str, flags: list[dict[str, Any]]) -> None:
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO risk_flags(participant_id, flags, updated_at) VALUES(?, ?, ?) ON CONFLICT(participant_id) DO UPDATE SET flags=excluded.flags, updated_at=excluded.updated_at",
                (participant_id, dumps(flags), utcnow().isoformat())
            )
            conn.commit()
