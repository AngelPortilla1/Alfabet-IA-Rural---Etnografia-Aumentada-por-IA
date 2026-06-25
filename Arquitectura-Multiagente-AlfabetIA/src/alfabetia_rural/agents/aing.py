from __future__ import annotations

import re
import unicodedata

from alfabetia_rural.agents.base import AgentContext
from alfabetia_rural.domain.enums import Channel, MemoryLayer
from alfabetia_rural.domain.models import AuditRecord, EventEnvelope, NormalizedSegment


class IngestionAgent:
    def __init__(self, context: AgentContext):
        self.context = context

    def normalize(self, event: EventEnvelope) -> NormalizedSegment:
        raw = event.content.strip()
        normalized = unicodedata.normalize("NFKC", raw)
        normalized = re.sub(r"\s+", " ", normalized).strip().lower()
        token_count = len(normalized.split())
        base_confidence = 0.92 if token_count >= 8 else 0.52
        if event.channel == Channel.audio:
            base_confidence -= 0.08
        if event.channel == Channel.kiosk and token_count < 6:
            base_confidence -= 0.05
        confidence = max(0.05, min(0.99, base_confidence - event.uncertainty * 0.25))
        threshold = float(self.context.policies.get("review_uncertainty_threshold", 0.55))
        uncertainty_sources = {
            "normalization": round(1.0 - confidence, 3),
            "source_event": round(event.uncertainty, 3),
        }
        segment = NormalizedSegment(
            sid=event.sid,
            pid=event.pid,
            channel=event.channel,
            normalized_text=normalized,
            confidence=round(confidence, 3),
            provenance=event.provenance,
            source_event_id=event.event_id,
            uncertainty_sources=uncertainty_sources,
            needs_review=confidence < threshold,
            metadata={"token_count": token_count, **event.metadata},
        )
        self.context.store.save_event(event)
        self.context.store.save_normalized_segment(segment)
        self.context.store.append_audit(
            AuditRecord(
                agent="AING",
                pid=event.pid,
                sid=event.sid,
                action="normalize",
                memory_layer=MemoryLayer.semantic,
                payload=segment.model_dump(mode="json"),
            )
        )
        return segment
