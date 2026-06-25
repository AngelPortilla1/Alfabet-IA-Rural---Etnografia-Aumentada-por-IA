from __future__ import annotations

import pytest
from alfabetia_rural.domain.enums import Channel, ConsentScope, ReviewStatus, ApprovalStatus
from alfabetia_rural.domain.models import (
    ConsentState,
    EventEnvelope,
    NormalizedSegment,
    ReviewItem,
    MentalModel,
    LiteracyRoute,
)


def _setup_participant_data(store, pid, sid):
    # 1. Guardar evento crudo
    event = EventEnvelope(
        sid=sid,
        pid=pid,
        channel=Channel.text,
        content=f"Relato original del participante {pid}",
        consent=ConsentState(),
    )
    store.save_event(event)

    # 2. Guardar segmento normalizado
    segment = NormalizedSegment(
        sid=sid,
        pid=pid,
        channel=Channel.text,
        normalized_text=f"Relato normalizado del participante {pid}",
        confidence=0.9,
        provenance="AING",
        source_event_id=event.event_id,
    )
    store.save_normalized_segment(segment)

    # 3. Guardar review
    review = ReviewItem(
        pid=pid,
        stage="AING",
        reason="revisión manual de transcripción",
        payload={"pid": pid, "msg": "test review"},
    )
    store.save_review(review)

    # 4. Guardar modelo mental
    model = MentalModel(
        pid=pid,
        nodes=[],
        edges=[],
        values={"interes": 0.8},
        literacy={"C1": 0.5},
        preferences={},
        confidence=0.8,
        revision=1,
    )
    store.save_mental_model(model)

    # 5. Guardar ruta curricular
    route = LiteracyRoute(
        pid=pid,
        explanation=f"Explicación de ruta para {pid}",
    )
    store.save_route(route)


def test_audit_revoke_raw_capture(store):
    pid = "p_raw"
    sid = "sid_raw"
    _setup_participant_data(store, pid, sid)

    # Verificar que los datos iniciales existan
    assert len(store.list_events()) == 1
    with store._conn() as conn:
        assert conn.execute("SELECT COUNT(*) FROM normalized_segments WHERE pid=?", (pid,)).fetchone()[0] == 1
        # La tabla reviews no tiene pid indexado como columna primaria directa, se busca en data
        review_rows = conn.execute("SELECT COUNT(*) FROM reviews").fetchone()[0]
        assert review_rows == 1

    # Revocar raw_capture
    store.revoke_pid(pid, scope=ConsentScope.raw_capture, reason="Revocación de captura cruda")

    # Aseverar los elementos eliminados/ocultados
    # 1. Eventos deben estar tombstoned (no aparecer en list_events normal)
    assert len(store.list_events()) == 0
    assert len(store.list_events(include_tombstoned=True)) == 1

    # 2. Segmento normalizado debe ser eliminado físicamente
    with store._conn() as conn:
        assert conn.execute("SELECT COUNT(*) FROM normalized_segments WHERE pid=?", (pid,)).fetchone()[0] == 0

    # 3. Review asociado al pid debe ser eliminado físicamente
    with store._conn() as conn:
        assert conn.execute("SELECT COUNT(*) FROM reviews").fetchone()[0] == 0

    # 4. Otros datos (modelo mental y ruta curricular) deben permanecer intactos
    assert store.load_mental_model(pid) is not None
    assert store.latest_route(pid) is not None

    # 5. Se debe haber guardado el registro de revocación
    consents = store.list_participant_consents()
    pid_consent = next((c for c in consents if c["pid"] == pid), None)
    assert pid_consent is not None
    assert pid_consent["consent"]["raw_capture"] is False
    assert pid_consent["consent"]["semantic_processing"] is True  # Sigue activo


def test_audit_revoke_semantic_processing(store):
    pid = "p_sem"
    sid = "sid_sem"
    _setup_participant_data(store, pid, sid)

    # Revocar semantic_processing
    store.revoke_pid(pid, scope=ConsentScope.semantic_processing, reason="Revocación procesamiento semántico")

    # Aseverar que no se borran datos físicos en la BD directamente por este scope solo
    assert len(store.list_events()) == 1
    assert store.load_mental_model(pid) is not None
    assert store.latest_route(pid) is not None

    # Verificar que el estado de consentimiento en la base de datos se actualizó correctamente
    consents = store.list_participant_consents()
    pid_consent = next((c for c in consents if c["pid"] == pid), None)
    assert pid_consent is not None
    assert pid_consent["consent"]["semantic_processing"] is False
    assert pid_consent["consent"]["raw_capture"] is True


def test_audit_revoke_graph_derivative(store):
    pid = "p_graph"
    sid = "sid_graph"
    _setup_participant_data(store, pid, sid)

    # Verificar modelo mental actual activo
    assert store.load_mental_model(pid) is not None

    # Revocar graph_derivative
    store.revoke_pid(pid, scope=ConsentScope.graph_derivative, reason="Revocación modelo mental")

    # Aseverar modelo mental desactivado (current = 0)
    assert store.load_mental_model(pid) is None  # load_mental_model filtra current=1 por defecto

    # Verificar en la tabla que el registro sigue existiendo pero con current = 0
    with store._conn() as conn:
        row = conn.execute("SELECT current FROM mental_models WHERE pid=?", (pid,)).fetchone()
        assert row is not None
        assert row["current"] == 0

    # Los relatos y rutas curriculares deben permanecer intactos
    assert len(store.list_events()) == 1
    assert store.latest_route(pid) is not None

    # Verificar estado de consentimiento
    consents = store.list_participant_consents()
    pid_consent = next((c for c in consents if c["pid"] == pid), None)
    assert pid_consent is not None
    assert pid_consent["consent"]["graph_derivative"] is False


def test_audit_revoke_curriculum_derivative(store):
    pid = "p_curr"
    sid = "sid_curr"
    _setup_participant_data(store, pid, sid)

    # Verificar ruta inicial
    assert store.latest_route(pid) is not None

    # Revocar curriculum_derivative
    store.revoke_pid(pid, scope=ConsentScope.curriculum_derivative, reason="Revocación de ruta curricular")

    # Aseverar ruta curricular eliminada físicamente
    assert store.latest_route(pid) is None
    with store._conn() as conn:
        assert conn.execute("SELECT COUNT(*) FROM routes WHERE pid=?", (pid,)).fetchone()[0] == 0

    # Eventos y modelo mental deben seguir intactos
    assert len(store.list_events()) == 1
    assert store.load_mental_model(pid) is not None

    # Verificar estado de consentimiento
    consents = store.list_participant_consents()
    pid_consent = next((c for c in consents if c["pid"] == pid), None)
    assert pid_consent is not None
    assert pid_consent["consent"]["curriculum_derivative"] is False


def test_audit_revoke_secondary_use_and_export(store):
    pid = "p_sec_exp"
    sid = "sid_sec_exp"
    _setup_participant_data(store, pid, sid)

    # Revocar uso secundario y exportación
    store.revoke_pid(pid, scope=ConsentScope.secondary_use, reason="No uso externo")
    store.revoke_pid(pid, scope=ConsentScope.export, reason="No exportar")

    # Aseverar que todos los datos de base de datos persisten
    assert len(store.list_events()) == 1
    assert store.load_mental_model(pid) is not None
    assert store.latest_route(pid) is not None

    # Verificar que los consentimientos están marcados como falsos en la base de datos
    consents = store.list_participant_consents()
    pid_consent = next((c for c in consents if c["pid"] == pid), None)
    assert pid_consent is not None
    assert pid_consent["consent"]["secondary_use"] is False
    assert pid_consent["consent"]["export"] is False
    assert pid_consent["consent"]["raw_capture"] is True


def test_audit_revoke_all_total(store):
    pid = "p_total"
    sid = "sid_total"
    _setup_participant_data(store, pid, sid)

    # Revocación Total (scope = None)
    store.revoke_pid(pid, scope=None, reason="Revocación total de todos los consentimientos")

    # Aseverar que se aplicaron todas las reglas de borrado
    # 1. Eventos tombstoned
    assert len(store.list_events()) == 0
    assert len(store.list_events(include_tombstoned=True)) == 1

    # 2. Segmentos normalizados eliminados
    with store._conn() as conn:
        assert conn.execute("SELECT COUNT(*) FROM normalized_segments WHERE pid=?", (pid,)).fetchone()[0] == 0

    # 3. Reviews asociadas eliminadas
    with store._conn() as conn:
        assert conn.execute("SELECT COUNT(*) FROM reviews").fetchone()[0] == 0

    # 4. Modelos mentales desactivados (current = 0)
    assert store.load_mental_model(pid) is None
    with store._conn() as conn:
        assert conn.execute("SELECT current FROM mental_models WHERE pid=?", (pid,)).fetchone()["current"] == 0

    # 5. Rutas curriculares eliminadas
    assert store.latest_route(pid) is None
    with store._conn() as conn:
        assert conn.execute("SELECT COUNT(*) FROM routes WHERE pid=?", (pid,)).fetchone()[0] == 0

    # 6. Todos los scopes deben salir como falsos en el estado de consentimiento
    consents = store.list_participant_consents()
    pid_consent = next((c for c in consents if c["pid"] == pid), None)
    assert pid_consent is not None
    for scope in ConsentScope:
        assert pid_consent["consent"][scope.value] is False
    assert pid_consent["full_revoke_at"] is not None
