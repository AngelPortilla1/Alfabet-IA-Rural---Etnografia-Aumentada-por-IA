from __future__ import annotations

from alfabetia_rural.agents.base import AgentContext
from alfabetia_rural.domain.enums import ConsentScope, EvidenceKind, MemoryLayer
from alfabetia_rural.domain.models import AuditRecord, CodeAssignment, EvidenceRef, NormalizedSegment, ProbeSuggestion
from alfabetia_rural.llm.base import LLMClientProtocol


class CodingAgent:
    """Codificación asistida, con heurística auditable y LLM opcional.

    Las salidas de LLM se guardan como sugerencias inferidas, nunca como evidencia primaria.
    """

    def __init__(self, context: AgentContext, llm: LLMClientProtocol):
        self.context = context
        self.llm = llm

    def assign_codes(self, segment: NormalizedSegment, probe: ProbeSuggestion | None = None) -> list[CodeAssignment]:
        text = segment.normalized_text
        assignments: list[CodeAssignment] = []
        seen: set[str] = set()
        threshold = float(self.context.policies.get("code_review_confidence_threshold", 0.50))

        for item in self.context.codebook.get("codes", []):
            code = str(item.get("code"))
            keywords = [str(k).lower() for k in item.get("keywords", [])]
            hits = [kw for kw in keywords if kw in text]
            if not hits:
                continue
            confidence = min(0.97, max(0.55, segment.confidence + 0.03 * len(hits)))
            evidence_ref = EvidenceRef(
                source_event_id=segment.source_event_id,
                sid=segment.sid,
                pid=segment.pid,
                quote=text[:300],
                kind=EvidenceKind.direct,
                consent_scope=ConsentScope.semantic_processing,
                confidence=confidence,
                uncertainty=round(1.0 - confidence, 3),
                metadata={"matched_keywords": hits},
            )
            assignments.append(
                CodeAssignment(
                    code=code,
                    evidence=[text[:300]],
                    evidence_refs=[evidence_ref],
                    confidence=round(confidence, 3),
                    uncertainty_sources={"coding": round(1.0 - confidence, 3)},
                    requires_review=confidence < threshold,
                    llm_generated=False,
                    metadata={"matched_keywords": hits},
                )
            )
            seen.add(code)

        if self.context.policies.get("allow_llm_coding", True) and self.llm.provider_name != "stub":
            assignments.extend(self._llm_suggestions(segment, seen, threshold))

        if not assignments:
            confidence = min(0.50, segment.confidence)
            evidence_ref = EvidenceRef(
                source_event_id=segment.source_event_id,
                sid=segment.sid,
                pid=segment.pid,
                quote=text[:300],
                kind=EvidenceKind.direct,
                confidence=confidence,
                uncertainty=round(1.0 - confidence, 3),
            )
            assignments.append(
                CodeAssignment(
                    code="open_context",
                    evidence=[text[:300]],
                    evidence_refs=[evidence_ref],
                    confidence=confidence,
                    uncertainty_sources={"evidence_gap": 0.55},
                    requires_review=True,
                )
            )

        if probe and probe.sensitive:
            for item in assignments:
                item.requires_review = True
                item.uncertainty_sources["sensitivity"] = max(item.uncertainty_sources.get("sensitivity", 0.0), 0.6)

        self.context.store.append_audit(
            AuditRecord(
                agent="ACODE",
                pid=segment.pid,
                sid=segment.sid,
                action="assign_codes",
                memory_layer=MemoryLayer.semantic,
                payload={"codes": [a.model_dump(mode="json") for a in assignments], "llm_provider": self.llm.provider_name},
            )
        )
        return assignments

    def _llm_suggestions(self, segment: NormalizedSegment, seen: set[str], threshold: float) -> list[CodeAssignment]:
        try:
            data = self.llm.complete_json(
                "codes",
                {
                    "normalized_text": segment.normalized_text,
                    "allowed_codes": [item.get("code") for item in self.context.codebook.get("codes", [])],
                },
            )
        except Exception:
            return []
        out: list[CodeAssignment] = []
        allowed = {str(item.get("code")) for item in self.context.codebook.get("codes", [])}
        
        items = data if isinstance(data, list) else data.get("codes", [])
        
        for raw in items:
            if isinstance(raw, str):
                raw = {"code": raw, "confidence": 0.45, "requires_review": True}
            elif not isinstance(raw, dict):
                continue
                
            code = str(raw.get("code", ""))
            if code not in allowed or code in seen:
                continue
            confidence = max(0.0, min(1.0, float(raw.get("confidence", 0.45))))
            quote = str(raw.get("evidence_quote") or segment.normalized_text[:300])[:300]
            evidence_ref = EvidenceRef(
                source_event_id=segment.source_event_id,
                sid=segment.sid,
                pid=segment.pid,
                quote=quote,
                kind=EvidenceKind.inferred,
                confidence=confidence,
                uncertainty=round(1.0 - confidence, 3),
                metadata={"llm_provider": self.llm.provider_name},
            )
            out.append(
                CodeAssignment(
                    code=code,
                    evidence=[quote],
                    evidence_refs=[evidence_ref],
                    confidence=confidence,
                    uncertainty_sources={"coding": round(1.0 - confidence, 3), "llm_inference": 0.35},
                    requires_review=confidence < threshold or bool(raw.get("requires_review", True)),
                    llm_generated=True,
                )
            )
            seen.add(code)
        return out

    def ingest_candidate_facts(self, pid: str, sid: str, facts_delta: list[dict]) -> None:
        from alfabetia_rural.domain.models import AuditRecord
        from alfabetia_rural.domain.enums import MemoryLayer
        for fact in facts_delta:
            self.context.store.append_audit(
                AuditRecord(
                    agent="ACODE",
                    pid=pid,
                    sid=sid,
                    action="ingest_fact",
                    memory_layer=MemoryLayer.semantic,
                    payload=fact
                )
            )
