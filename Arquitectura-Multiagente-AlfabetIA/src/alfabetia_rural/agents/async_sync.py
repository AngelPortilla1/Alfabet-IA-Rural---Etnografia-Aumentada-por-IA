from __future__ import annotations

from alfabetia_rural.agents.base import AgentContext
from alfabetia_rural.domain.enums import MemoryLayer
from alfabetia_rural.domain.models import AuditRecord, EventEnvelope, LiteracyRoute, MentalModel


class AsyncSyncAgent:
    def __init__(self, context: AgentContext):
        self.context = context

    def persist_all(self, event: EventEnvelope, model: MentalModel | None = None, route: LiteracyRoute | None = None) -> str:
        self.context.store.save_event(event)
        if model:
            self.context.store.save_mental_model(model)
        if route:
            self.context.store.save_route(route)
            
        route_hash = route.route_hash if route else "none"
        delta = self.context.store.queue_delta(
            object_type="route_bundle",
            object_id=f"{event.sid}:{event.pid}:{route_hash}",
            memory_layer=MemoryLayer.audit,
            data={
                "event": {"sid": event.sid, "event_id": event.event_id, "pid": event.pid, "content_hash": event.content_hash},
                "mental_model": {"pid": model.pid, "revision": model.revision, "revision_hash": model.revision_hash} if model else None,
                "route": {"pid": route.pid, "route_hash": route_hash, "approval_status": route.approval_status.value} if route else None,
            },
        )
        self.context.store.append_audit(
            AuditRecord(
                agent="ASYNC",
                pid=event.pid,
                sid=event.sid,
                action="persist_delta",
                memory_layer=MemoryLayer.audit,
                payload=delta.model_dump(mode="json"),
            )
        )
        return delta.delta_id
