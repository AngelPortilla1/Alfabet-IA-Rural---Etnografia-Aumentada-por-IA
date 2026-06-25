from __future__ import annotations

from alfabetia_rural.agents.base import AgentContext
from alfabetia_rural.domain.enums import MemoryLayer, ReviewRole
from alfabetia_rural.domain.models import AuditRecord, ReviewItem


class SupervisorAgent:
    def __init__(self, context: AgentContext):
        self.context = context

    def open_review(self, item: ReviewItem) -> ReviewItem:
        self.context.store.save_review(item)
        self.context.store.append_audit(
            AuditRecord(
                agent="ASUP",
                pid=item.pid,
                action="open_review",
                memory_layer=MemoryLayer.audit,
                payload=item.model_dump(mode="json"),
            )
        )
        return item

    def open_curricular_review(self, pid: str, reason: str, payload: dict, role: ReviewRole = ReviewRole.curriculum_team) -> ReviewItem:
        return self.open_review(ReviewItem(pid=pid, stage="M_CURR", reason=reason, payload=payload, required_role=role))
