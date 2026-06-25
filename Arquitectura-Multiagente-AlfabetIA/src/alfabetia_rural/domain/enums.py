from __future__ import annotations

from enum import StrEnum


class Channel(StrEnum):
    text = "text"
    audio = "audio"
    kiosk = "kiosk"
    facilitated = "facilitated"
    form = "form"


class GateDecision(StrEnum):
    accept = "accept"
    review = "review"
    block = "block"
    human_approve = "human_approve"


class ReviewStatus(StrEnum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    superseded = "superseded"


class ReviewRole(StrEnum):
    facilitator = "facilitator"
    curriculum_team = "curriculum_team"
    data_auditor = "data_auditor"
    community_delegate = "community_delegate"


class EvidenceKind(StrEnum):
    direct = "direct"
    inferred = "inferred"
    corrected = "corrected"
    aggregate = "aggregate"


class ConsentScope(StrEnum):
    raw_capture = "raw_capture"
    semantic_processing = "semantic_processing"
    graph_derivative = "graph_derivative"
    curriculum_derivative = "curriculum_derivative"
    secondary_use = "secondary_use"
    export = "export"


class RouteType(StrEnum):
    startup = "startup"
    adapted = "adapted"
    segment = "segment"
    curricular_brief = "curricular_brief"


class ApprovalStatus(StrEnum):
    draft = "draft"
    needs_human_review = "needs_human_review"
    approved = "approved"
    rejected = "rejected"


class SyncStatus(StrEnum):
    queued = "queued"
    synced = "synced"
    conflict = "conflict"
    tombstoned = "tombstoned"


class MemoryLayer(StrEnum):
    raw = "M_raw"
    semantic = "M_sem"
    graph = "M_graph"
    policy = "M_policy"
    audit = "M_audit"
    curriculum = "M_curr"
