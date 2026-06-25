from alfabetia_rural.domain.models import AuditRecord


def test_audit_hash_chain_is_append_only(store):
    first = store.append_audit(AuditRecord(agent="T", action="one", payload={"a": 1}))
    second = store.append_audit(AuditRecord(agent="T", action="two", payload={"b": 2}))
    assert first.record_hash
    assert second.previous_hash == first.record_hash
    assert second.record_hash != first.record_hash


def test_queue_delta_signs_payload(store):
    delta = store.queue_delta("x", "id1", memory_layer="M_audit", data={"ok": True})  # type: ignore[arg-type]
    assert delta.signature
    assert delta.status.value == "queued"
