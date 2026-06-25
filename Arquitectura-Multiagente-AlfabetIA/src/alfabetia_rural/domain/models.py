from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from alfabetia_rural.domain.enums import (
    ApprovalStatus,
    Channel,
    ConsentScope,
    EvidenceKind,
    GateDecision,
    MemoryLayer,
    ReviewRole,
    ReviewStatus,
    RouteType,
    SyncStatus,
)
from alfabetia_rural.utils.hashing import canonical_hash, short_hash


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


class StrictBaseModel(BaseModel):
    model_config = ConfigDict(use_enum_values=False, extra="forbid", validate_assignment=False)


class ConsentState(StrictBaseModel):
    """Consentimiento granular, revocable y portable entre capas de memoria."""

    primary_use: bool = True
    allow_raw_capture: bool = True
    allow_semantic_processing: bool = True
    allow_graph_derivative: bool = True
    allow_curriculum_derivatives: bool = True
    secondary_use: bool = False
    allow_export: bool = False
    revoked: bool = False
    revocation_reason: str | None = None
    retention_days: int | None = 365
    valid_until: datetime | None = None
    policy_version: str = "Pi0-2026-04"
    participant_ack: bool = True
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("retention_days")
    @classmethod
    def retention_must_be_positive(cls, value: int | None) -> int | None:
        if value is not None and value < 0:
            raise ValueError("retention_days must be non-negative")
        return value

    def allows(self, scope: ConsentScope) -> bool:
        if self.revoked:
            return False
        if self.valid_until is not None and self.valid_until < utcnow():
            return False
        mapping = {
            ConsentScope.raw_capture: self.primary_use and self.allow_raw_capture,
            ConsentScope.semantic_processing: self.primary_use and self.allow_semantic_processing,
            ConsentScope.graph_derivative: self.primary_use and self.allow_graph_derivative,
            ConsentScope.curriculum_derivative: self.primary_use and self.allow_curriculum_derivatives,
            ConsentScope.secondary_use: self.secondary_use,
            ConsentScope.export: self.allow_export,
        }
        return bool(mapping[scope])


class EventEnvelope(StrictBaseModel):
    """Sobre tipado et = <sid,pid,ch,xt,ct,rho,u,v,ts> más hashes."""

    event_id: str = Field(default_factory=lambda: str(uuid4()))
    event_type: str = "narrative.v1"
    sid: str
    pid: str
    channel: Channel
    content: str
    consent: ConsentState
    provenance: str = "direct"
    uncertainty: float = 0.0
    uncertainty_sources: dict[str, float] = Field(default_factory=dict)
    version: int = 1
    schema_version: str = "event-envelope/2.0"
    ts: datetime = Field(default_factory=utcnow)
    content_hash: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("uncertainty")
    @classmethod
    def valid_uncertainty(cls, value: float) -> float:
        return clamp01(value)

    @model_validator(mode="after")
    def fill_hash(self) -> EventEnvelope:
        if self.content_hash is None:
            self.content_hash = short_hash({"sid": self.sid, "pid": self.pid, "content": self.content})
        return self


class UncertaintyBreakdown(StrictBaseModel):
    transcription: float = 0.0
    normalization: float = 0.0
    coding: float = 0.0
    contradiction: float = 0.0
    evidence_gap: float = 0.0
    sensitivity: float = 0.0

    @model_validator(mode="after")
    def clamp(self) -> UncertaintyBreakdown:
        for name in self.model_fields:
            setattr(self, name, clamp01(getattr(self, name)))
        return self

    def aggregate(self) -> float:
        values = [getattr(self, name) for name in self.model_fields]
        if not values:
            return 0.0
        return round(max(values) * 0.55 + (sum(values) / len(values)) * 0.45, 3)


class NormalizedSegment(StrictBaseModel):
    sid: str
    pid: str
    channel: Channel
    normalized_text: str
    confidence: float
    provenance: str
    source_event_id: str | None = None
    uncertainty_sources: dict[str, float] = Field(default_factory=dict)
    needs_review: bool = False
    language: str = "es"
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("confidence")
    @classmethod
    def valid_confidence(cls, value: float) -> float:
        return clamp01(value)


class ProbeSuggestion(StrictBaseModel):
    question: str
    justification: str
    sensitive: bool = False
    uncertainty: float = 0.0
    evidence_refs: list[str] = Field(default_factory=list)


class EvidenceRef(StrictBaseModel):
    evidence_id: str = Field(default_factory=lambda: str(uuid4()))
    source_event_id: str | None = None
    sid: str | None = None
    pid: str | None = None
    quote: str
    kind: EvidenceKind = EvidenceKind.direct
    consent_scope: ConsentScope = ConsentScope.semantic_processing
    confidence: float = 0.5
    uncertainty: float = 0.5
    hash: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def fill_hash(self) -> EvidenceRef:
        self.confidence = clamp01(self.confidence)
        self.uncertainty = clamp01(self.uncertainty)
        if self.hash is None:
            self.hash = short_hash({"quote": self.quote, "sid": self.sid, "pid": self.pid, "kind": self.kind.value})
        return self


class CodeAssignment(StrictBaseModel):
    code: str
    evidence: list[str] = Field(default_factory=list)
    evidence_refs: list[EvidenceRef] = Field(default_factory=list)
    confidence: float = 0.5
    uncertainty_sources: dict[str, float] = Field(default_factory=dict)
    requires_review: bool = False
    llm_generated: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("confidence")
    @classmethod
    def valid_confidence(cls, value: float) -> float:
        return clamp01(value)


class GraphNode(StrictBaseModel):
    id: str
    label: str
    kind: str = "concept"
    evidence_refs: list[str] = Field(default_factory=list)
    confidence: float = 0.5


class GraphEdge(StrictBaseModel):
    source: str
    target: str
    relation: str
    polarity: int = 1
    weight: float = 0.5
    evidence: list[str] = Field(default_factory=list)
    evidence_refs: list[str] = Field(default_factory=list)
    support_count: int = 1
    inferred: bool = False
    contradiction: bool = False
    uncertainty: float = 0.5

    @field_validator("polarity")
    @classmethod
    def valid_polarity(cls, value: int) -> int:
        if value not in {-1, 0, 1}:
            raise ValueError("polarity must be -1, 0 or 1")
        return value

    @field_validator("weight", "uncertainty")
    @classmethod
    def valid_unit_interval(cls, value: float) -> float:
        return clamp01(value)

    def key(self) -> tuple[str, str, str]:
        return (self.source, self.target, self.relation)


class ContradictionFlag(StrictBaseModel):
    edge_key: str
    reason: str
    prior_polarity: int | None = None
    new_polarity: int | None = None
    severity: float = 0.5
    evidence_refs: list[str] = Field(default_factory=list)


class MentalModel(StrictBaseModel):
    pid: str
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)
    values: dict[str, float] = Field(default_factory=dict)
    literacy: dict[str, float] = Field(default_factory=dict)
    preferences: dict[str, Any] = Field(default_factory=dict)
    evidence_refs: list[EvidenceRef] = Field(default_factory=list)
    uncertainty_sources: dict[str, float] = Field(default_factory=dict)
    contradiction_flags: list[ContradictionFlag] = Field(default_factory=list)
    confidence: float = 0.5
    revision: int = 1
    previous_revision_hash: str | None = None
    revision_hash: str | None = None
    consent_snapshot_hash: str | None = None
    updated_at: datetime = Field(default_factory=utcnow)

    @model_validator(mode="after")
    def normalize(self) -> MentalModel:
        self.confidence = clamp01(self.confidence)
        self.values = {k: clamp01(v) for k, v in self.values.items()}
        self.literacy = {k: clamp01(v) for k, v in self.literacy.items()}
        if self.revision_hash is None:
            body = self.model_dump(mode="json", exclude={"revision_hash", "updated_at"})
            self.revision_hash = canonical_hash(body)
        return self


class RouteStep(StrictBaseModel):
    module_id: str
    title: str
    domain: str
    modality: str
    duration_minutes: int
    need: str
    competence: str
    mediation: str
    activity: str
    assessment: str
    rationale: str
    evidence_refs: list[str] = Field(default_factory=list)
    requires_curricular_review: bool = True


class CurriculumTrace(StrictBaseModel):
    need: str
    competence: str
    module_id: str
    mediation: str
    activity: str
    assessment: str
    evidence_kind: EvidenceKind = EvidenceKind.inferred
    evidence_refs: list[str] = Field(default_factory=list)
    epistemic_status: str = "salida pedagógica revisable"


class LiteracyRoute(StrictBaseModel):
    pid: str
    segment_id: str | None = None
    route_type: RouteType = RouteType.adapted
    needs: list[str] = Field(default_factory=list)
    competencies: list[str] = Field(default_factory=list)
    steps: list[RouteStep] = Field(default_factory=list)
    score: float = 0.0
    objective_terms: dict[str, float] = Field(default_factory=dict)
    risks: list[str] = Field(default_factory=list)
    constraints: dict[str, Any] = Field(default_factory=dict)
    trace: list[CurriculumTrace] = Field(default_factory=list)
    human_review_required: bool = False
    m_curr_update_required: bool = True
    approval_status: ApprovalStatus = ApprovalStatus.needs_human_review
    explanation: str = ""
    explanation_source: str = "heuristic"  # "llm" | "heuristic" | "llm_error"
    version: int = 1
    route_hash: str | None = None
    updated_at: datetime = Field(default_factory=utcnow)

    @model_validator(mode="after")
    def fill_route_hash(self) -> LiteracyRoute:
        self.score = clamp01(self.score)
        if self.m_curr_update_required:
            self.human_review_required = True
            if self.approval_status == ApprovalStatus.draft:
                self.approval_status = ApprovalStatus.needs_human_review
        if self.route_hash is None:
            self.route_hash = canonical_hash(self.model_dump(mode="json", exclude={"route_hash", "updated_at"}))
        return self


class Segment(StrictBaseModel):
    segment_id: str
    label: str
    member_ids: list[str]
    summary: str
    centroid_pid: str | None = None
    stability_score: float = 0.0
    coverage: dict[str, float] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ReviewItem(StrictBaseModel):
    review_id: str = Field(default_factory=lambda: str(uuid4()))
    pid: str
    stage: str
    reason: str
    payload: dict[str, Any] = Field(default_factory=dict)
    required_role: ReviewRole = ReviewRole.facilitator
    status: ReviewStatus = ReviewStatus.pending
    created_at: datetime = Field(default_factory=utcnow)
    resolved_at: datetime | None = None
    resolved_by: str | None = None
    resolution_note: str | None = None


class FairnessDecision(StrictBaseModel):
    decision: GateDecision
    reasons: list[str] = Field(default_factory=list)
    coverage: dict[str, float] = Field(default_factory=dict)
    risk_score: float = 0.0
    uncertainty_score: float = 0.0
    recommended_action: str | None = None


class AgentDecision(StrictBaseModel):
    decision: GateDecision
    reasons: list[str] = Field(default_factory=list)
    allowed_scopes: list[ConsentScope] = Field(default_factory=list)
    restricted_scopes: list[ConsentScope] = Field(default_factory=list)


class AuditRecord(StrictBaseModel):
    timestamp: datetime = Field(default_factory=utcnow)
    agent: str
    pid: str | None = None
    sid: str | None = None
    action: str
    memory_layer: MemoryLayer | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    payload_hash: str | None = None
    previous_hash: str | None = None
    record_hash: str | None = None
    signature: str | None = None

    @model_validator(mode="after")
    def fill_hash(self) -> AuditRecord:
        if self.payload_hash is None:
            self.payload_hash = canonical_hash(self.payload)
        return self


class OfflineDelta(StrictBaseModel):
    delta_id: str
    object_type: str
    object_id: str
    memory_layer: MemoryLayer
    data: dict[str, Any]
    data_hash: str
    signature: str | None = None
    status: SyncStatus = SyncStatus.queued
    created_at: datetime = Field(default_factory=utcnow)
    conflict_with: str | None = None


class RevocationRecord(StrictBaseModel):
    pid: str
    scope: ConsentScope | None = None
    reason: str | None = None
    created_at: datetime = Field(default_factory=utcnow)
    tombstone_hash: str | None = None

    @model_validator(mode="after")
    def fill_hash(self) -> RevocationRecord:
        if self.tombstone_hash is None:
            self.tombstone_hash = canonical_hash({"pid": self.pid, "scope": self.scope.value if self.scope else None, "created_at": self.created_at.isoformat()})
        return self


class CurricularBrief(StrictBaseModel):
    brief_id: str = Field(default_factory=lambda: str(uuid4()))
    title: str
    segment_ids: list[str] = Field(default_factory=list)
    needs: list[str] = Field(default_factory=list)
    competencies: list[str] = Field(default_factory=list)
    modules: list[RouteStep] = Field(default_factory=list)
    traces: list[CurriculumTrace] = Field(default_factory=list)
    approval_status: ApprovalStatus = ApprovalStatus.needs_human_review
    human_review_required: bool = True
    version: int = 1
    created_at: datetime = Field(default_factory=utcnow)
