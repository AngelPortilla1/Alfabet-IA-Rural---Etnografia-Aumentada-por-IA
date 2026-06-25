from __future__ import annotations

from statistics import mean

from alfabetia_rural.agents.base import AgentContext
from alfabetia_rural.domain.enums import MemoryLayer
from alfabetia_rural.domain.models import (
    AuditRecord,
    CodeAssignment,
    ContradictionFlag,
    EvidenceRef,
    GraphEdge,
    GraphNode,
    MentalModel,
    clamp01,
)
from alfabetia_rural.utils.hashing import canonical_hash


class MentalModelAgent:
    def __init__(self, context: AgentContext):
        self.context = context

    def update_model(self, pid: str, codes: list[CodeAssignment]) -> MentalModel:
        prev = self.context.store.load_mental_model(pid)
        nodes = {node.id: node for node in (prev.nodes if prev else self._base_nodes())}
        edges = {edge.key(): edge for edge in (prev.edges if prev else [])}
        values = dict(prev.values) if prev else {}
        literacy = dict(prev.literacy) if prev else self._base_literacy()
        preferences = dict(prev.preferences) if prev else {"prefers_audio": False, "prefers_facilitated": True}
        evidence_refs: list[EvidenceRef] = list(prev.evidence_refs) if prev else []
        contradictions: list[ContradictionFlag] = list(prev.contradiction_flags) if prev else []
        uncertainties: dict[str, float] = dict(prev.uncertainty_sources) if prev else {}
        new_confidences: list[float] = []

        for code in codes:
            evidence_refs.extend(code.evidence_refs)
            new_confidences.append(code.confidence)
            for key, value in code.uncertainty_sources.items():
                uncertainties[key] = max(uncertainties.get(key, 0.0), value)
            spec = self._code_spec(code.code)
            if spec is None:
                uncertainties["evidence_gap"] = max(uncertainties.get("evidence_gap", 0.0), 0.45)
                continue

            for node in spec["nodes"]:
                nodes.setdefault(node.id, node)
            new_edge = GraphEdge(
                source=spec["edge"][0],
                target=spec["edge"][1],
                relation=spec["edge"][2],
                polarity=spec.get("polarity", 1),
                weight=spec.get("weight", 0.5),
                evidence=code.evidence,
                evidence_refs=[ref.evidence_id for ref in code.evidence_refs],
                support_count=1,
                inferred=code.llm_generated,
                uncertainty=round(1.0 - code.confidence, 3),
            )
            self._merge_edge(edges, new_edge, contradictions)

            for key, delta in spec.get("values", {}).items():
                values[key] = clamp01(values.get(key, 0.0) + delta * code.confidence)
            for key, delta in spec.get("literacy", {}).items():
                literacy[key] = clamp01(literacy.get(key, 0.0) + delta * code.confidence)

            text_join = " ".join(code.evidence).lower()
            if any(token in text_join for token in ("voz", "audio", "nota de voz", "oral")):
                preferences["prefers_audio"] = True
            if any(token in text_join for token in ("técnico", "asesor", "facilitador", "alguien de confianza")):
                preferences["prefers_facilitated"] = True

        if contradictions:
            uncertainties["contradiction"] = max(uncertainties.get("contradiction", 0.0), min(1.0, len(contradictions) * 0.15))

        confidence = mean(new_confidences) if new_confidences else (prev.confidence if prev else 0.45)
        confidence = clamp01(confidence - uncertainties.get("contradiction", 0.0) * 0.2 - uncertainties.get("evidence_gap", 0.0) * 0.1)
        model = MentalModel(
            pid=pid,
            nodes=sorted(nodes.values(), key=lambda n: n.id),
            edges=sorted(edges.values(), key=lambda e: (e.source, e.target, e.relation)),
            values=values,
            literacy=self._normalize_composition(literacy),
            preferences=preferences,
            evidence_refs=evidence_refs[-50:],
            uncertainty_sources=uncertainties,
            contradiction_flags=contradictions[-20:],
            confidence=round(confidence, 3),
            revision=(prev.revision + 1) if prev else 1,
            previous_revision_hash=prev.revision_hash if prev else None,
            consent_snapshot_hash=canonical_hash({"pid": pid, "scopes": "event-level"}),
        )
        self.context.store.save_mental_model(model)
        self.context.store.append_audit(
            AuditRecord(
                agent="AMIND",
                pid=pid,
                action="update_mental_model",
                memory_layer=MemoryLayer.graph,
                payload=model.model_dump(mode="json"),
            )
        )
        return model

    def _base_nodes(self) -> list[GraphNode]:
        return [
            GraphNode(id="ia", label="IA", kind="concept"),
            GraphNode(id="datos", label="Datos", kind="concept"),
            GraphNode(id="decision_humana", label="Decisión humana", kind="concept"),
            GraphNode(id="riesgo", label="Riesgo", kind="concept"),
            GraphNode(id="beneficio", label="Beneficio", kind="concept"),
            GraphNode(id="confianza", label="Confianza", kind="value"),
            GraphNode(id="comunidad", label="Comunidad", kind="actor"),
        ]

    def _base_literacy(self) -> dict[str, float]:
        return {"C1": 1 / 7, "C2": 1 / 7, "C3": 1 / 7, "C4": 1 / 7, "C5": 1 / 7, "C6": 1 / 7, "C7": 1 / 7}

    def _code_spec(self, code: str) -> dict | None:
        concept_nodes = {n.id: n for n in self._base_nodes()}
        specs = {
            "data_governance": {
                "nodes": [concept_nodes["datos"], concept_nodes["riesgo"], concept_nodes["comunidad"]],
                "edge": ("datos", "riesgo", "can_raise"),
                "polarity": 1,
                "weight": 0.82,
                "values": {"data_sensitivity": 0.42, "governance_need": 0.30},
                "literacy": {"C2": 0.10},
            },
            "ai_recommendations": {
                "nodes": [concept_nodes["ia"], concept_nodes["beneficio"], concept_nodes["decision_humana"]],
                "edge": ("ia", "beneficio", "can_generate"),
                "polarity": 1,
                "weight": 0.70,
                "values": {"interest_recommendations": 0.40},
                "literacy": {"C3": 0.10},
            },
            "human_review": {
                "nodes": [concept_nodes["ia"], concept_nodes["decision_humana"], concept_nodes["confianza"]],
                "edge": ("ia", "decision_humana", "requires"),
                "polarity": 1,
                "weight": 0.80,
                "values": {"trust_human": 0.36},
                "literacy": {"C4": 0.10},
            },
            "bias_fairness": {
                "nodes": [concept_nodes["ia"], concept_nodes["riesgo"], concept_nodes["comunidad"]],
                "edge": ("ia", "riesgo", "may_exclude"),
                "polarity": 1,
                "weight": 0.78,
                "values": {"fairness_concern": 0.40},
                "literacy": {"C5": 0.10},
            },
            "experimentation": {
                "nodes": [concept_nodes["beneficio"], concept_nodes["decision_humana"]],
                "edge": ("beneficio", "decision_humana", "should_be_tested_before"),
                "polarity": 1,
                "weight": 0.65,
                "values": {"experimentation_readiness": 0.30},
                "literacy": {"C6": 0.10},
            },
            "basic_concepts": {
                "nodes": [concept_nodes["ia"], concept_nodes["datos"]],
                "edge": ("datos", "ia", "feeds"),
                "polarity": 1,
                "weight": 0.55,
                "values": {"conceptual_need": 0.25},
                "literacy": {"C1": 0.10},
            },
            # ── Códigos regionales──────────────────────────
            "digital_distrust": {
                "nodes": [concept_nodes["confianza"], concept_nodes["riesgo"], concept_nodes["comunidad"]],
                "edge": ("confianza", "riesgo", "triggers_by_distrust"),
                "polarity": 1,
                "weight": 0.80,
                "values": {"privacy_concern": 0.42, "governance_need": 0.25},
                "literacy": {"C2": 0.08},
                "requires_human_review": True,
                "mental_model_shift": "increase_privacy_concern",
                "description": "Activa compuerta de gobernanza por desconfianza en sistemas.",
            },
            "empirical_knowledge": {
                "nodes": [concept_nodes["decision_humana"], concept_nodes["beneficio"], concept_nodes["comunidad"]],
                "edge": ("decision_humana", "beneficio", "validates_from_experience"),
                "polarity": 1,
                "weight": 0.60,
                "values": {"local_heuristic_value": 0.35},
                "literacy": {"C3": 0.10},
                "requires_human_review": False,
                "mental_model_shift": "validate_local_heuristics",
                "description": "Afirma el saber empírico. Conecta con el módulo C3.",
            },
            "connectivity_barrier": {
                "nodes": [concept_nodes["riesgo"], concept_nodes["comunidad"]],
                "edge": ("riesgo", "comunidad", "blocks_access"),
                "polarity": -1,
                "weight": 0.90,
                "values": {"offline_urgency": 0.50, "governance_need": 0.20},
                "literacy": {"C1": 0.05},
                "requires_human_review": True,
                "mental_model_shift": "force_offline_modality",
                "description": "Barrera de infraestructura. Alerta al orquestador.",
            },
        }
        return specs.get(code)

    def _merge_edge(
        self,
        edges: dict[tuple[str, str, str], GraphEdge],
        new_edge: GraphEdge,
        contradictions: list[ContradictionFlag],
    ) -> None:
        key = new_edge.key()
        if key not in edges:
            edges[key] = new_edge
            return
        prev = edges[key]
        if prev.polarity != new_edge.polarity:
            prev.contradiction = True
            contradictions.append(
                ContradictionFlag(
                    edge_key="|".join(key),
                    reason="polaridad incompatible para la misma relación causal percibida",
                    prior_polarity=prev.polarity,
                    new_polarity=new_edge.polarity,
                    severity=0.7,
                    evidence_refs=new_edge.evidence_refs,
                )
            )
        n = max(prev.support_count, 1)
        prev.weight = round(clamp01((prev.weight * n + new_edge.weight) / (n + 1)), 3)
        prev.uncertainty = round(clamp01((prev.uncertainty * n + new_edge.uncertainty) / (n + 1)), 3)
        prev.support_count += 1
        prev.evidence = (prev.evidence + new_edge.evidence)[-5:]
        prev.evidence_refs = list(dict.fromkeys(prev.evidence_refs + new_edge.evidence_refs))[-10:]
        prev.inferred = prev.inferred and new_edge.inferred

    def _normalize_composition(self, literacy: dict[str, float]) -> dict[str, float]:
        for domain in ("C1", "C2", "C3", "C4", "C5", "C6", "C7"):
            literacy.setdefault(domain, 0.0)
        total = sum(max(v, 0.0) for v in literacy.values()) or 1.0
        return {k: round(max(v, 0.0) / total, 4) for k, v in sorted(literacy.items())}

    def apply_graph_delta(self, pid: str, graph_delta: dict) -> MentalModel:
        prev = self.context.store.load_mental_model(pid)
        if not prev:
            prev = MentalModel(
                pid=pid,
                nodes=self._base_nodes(),
                edges=[],
                values={},
                literacy=self._base_literacy(),
                confidence=0.45,
                revision=1
            )
        
        nodes = {node.id: node for node in prev.nodes}
        edges = {edge.key(): edge for edge in prev.edges}
        contradictions = list(prev.contradiction_flags)
        
        new_confidences = []
        nodes_add = graph_delta.get("nodes_add_or_update", [])
        for nd in nodes_add:
            node_id = nd.get("node_id") or nd.get("id")
            if not node_id:
                continue
            label = nd.get("label") or node_id
            kind = nd.get("type") or nd.get("kind") or "concept"
            confidence = nd.get("confidence", 0.5)
            new_confidences.append(clamp01(confidence))
            evidence_refs = nd.get("evidence_refs", [])
            
            if node_id in nodes:
                nodes[node_id].label = label
                nodes[node_id].kind = kind
                nodes[node_id].confidence = clamp01(confidence)
                nodes[node_id].evidence_refs = list(dict.fromkeys(nodes[node_id].evidence_refs + evidence_refs))
            else:
                nodes[node_id] = GraphNode(
                    id=node_id,
                    label=label,
                    kind=kind,
                    confidence=clamp01(confidence),
                    evidence_refs=evidence_refs
                )

        edges_add = graph_delta.get("edges_add_or_update", [])
        for ed in edges_add:
            src = ed.get("source")
            tgt = ed.get("target")
            relation = ed.get("relation")
            if not src or not tgt or not relation:
                continue
            polarity = ed.get("polarity", 1)
            weight = ed.get("weight", 0.5)
            evidence = ed.get("evidence", [])
            evidence_refs = ed.get("evidence_refs", [])
            inferred = ed.get("inferred", True)
            uncertainty = ed.get("uncertainty", 0.5)
            new_confidences.append(1.0 - clamp01(uncertainty))
            
            new_edge = GraphEdge(
                source=src,
                target=tgt,
                relation=relation,
                polarity=polarity,
                weight=clamp01(weight),
                evidence=evidence,
                evidence_refs=evidence_refs,
                support_count=1,
                inferred=inferred,
                uncertainty=clamp01(uncertainty)
            )
            self._merge_edge(edges, new_edge, contradictions)

        new_conf = mean(new_confidences) if new_confidences else prev.confidence
        updated_confidence = round(clamp01((prev.confidence + new_conf) / 2), 3)

        # Actualizar uncertainty_sources dinámicamente
        uncertainties = dict(prev.uncertainty_sources)
        if contradictions:
            uncertainties["contradiction"] = max(
                uncertainties.get("contradiction", 0.0),
                min(1.0, len(contradictions) * 0.15)
            )
        high_uncertainty_edges = [e for e in edges.values() if e.uncertainty >= 0.6]
        if high_uncertainty_edges:
            uncertainties["evidence_gap"] = max(
                uncertainties.get("evidence_gap", 0.0),
                round(mean(e.uncertainty for e in high_uncertainty_edges), 3)
            )

        model = MentalModel(
            pid=pid,
            nodes=sorted(nodes.values(), key=lambda n: n.id),
            edges=sorted(edges.values(), key=lambda e: (e.source, e.target, e.relation)),
            values=prev.values,
            literacy=prev.literacy,
            preferences=prev.preferences,
            evidence_refs=prev.evidence_refs,
            uncertainty_sources=uncertainties,
            contradiction_flags=contradictions[-20:],
            confidence=updated_confidence,
            revision=prev.revision + 1,
            previous_revision_hash=prev.revision_hash,
            consent_snapshot_hash=prev.consent_snapshot_hash,
        )
        self.context.store.save_mental_model(model)
        self.context.store.append_audit(
            AuditRecord(
                agent="AMIND",
                pid=pid,
                action="apply_graph_delta",
                memory_layer=MemoryLayer.graph,
                payload=model.model_dump(mode="json"),
            )
        )
        return model

    def update_literacy_profile(self, pid: str, literacy_profile_delta: dict) -> MentalModel:
        prev = self.context.store.load_mental_model(pid)
        if not prev:
            prev = MentalModel(
                pid=pid,
                nodes=self._base_nodes(),
                edges=[],
                values={},
                literacy=self._base_literacy(),
                confidence=0.45,
                revision=1
            )
        
        literacy = dict(prev.literacy)
        new_confidences = []
        for domain, delta_info in literacy_profile_delta.items():
            if not isinstance(delta_info, dict):
                continue
            confidence = delta_info.get("confidence", 0.0)
            need_score = delta_info.get("need_score")
            if need_score is not None and (confidence > 0.0 or "confidence" not in delta_info):
                literacy[domain] = clamp01(float(need_score))
                if "confidence" in delta_info:
                    new_confidences.append(clamp01(confidence))
        
        new_conf = mean(new_confidences) if new_confidences else prev.confidence
        updated_confidence = round(clamp01((prev.confidence + new_conf) / 2), 3)

        # Propagar incertidumbre si hay deltas de baja confianza
        uncertainties = dict(prev.uncertainty_sources)
        low_conf_domains = [c for c in new_confidences if c < 0.5]
        if low_conf_domains:
            uncertainties["evidence_gap"] = max(
                uncertainties.get("evidence_gap", 0.0),
                round(1.0 - mean(low_conf_domains), 3)
            )

        model = MentalModel(
            pid=pid,
            nodes=prev.nodes,
            edges=prev.edges,
            values=prev.values,
            literacy=self._normalize_composition(literacy),
            preferences=prev.preferences,
            evidence_refs=prev.evidence_refs,
            uncertainty_sources=uncertainties,
            contradiction_flags=prev.contradiction_flags,
            confidence=updated_confidence,
            revision=prev.revision + 1,
            previous_revision_hash=prev.revision_hash,
            consent_snapshot_hash=prev.consent_snapshot_hash,
        )
        self.context.store.save_mental_model(model)
        self.context.store.append_audit(
            AuditRecord(
                agent="AMIND",
                pid=pid,
                action="update_literacy_profile",
                memory_layer=MemoryLayer.graph,
                payload=model.model_dump(mode="json"),
            )
        )
        return model

    def update_values_vector(self, pid: str, values_vector_delta: dict) -> MentalModel:
        prev = self.context.store.load_mental_model(pid)
        if not prev:
            prev = MentalModel(
                pid=pid,
                nodes=self._base_nodes(),
                edges=[],
                values={},
                literacy=self._base_literacy(),
                confidence=0.45,
                revision=1
            )
        
        values = dict(prev.values)
        new_confidences = []
        for val_key, val_info in values_vector_delta.items():
            if not isinstance(val_info, dict):
                continue
            confidence = val_info.get("confidence", 0.0)
            value = val_info.get("value")
            if value is not None and (confidence > 0.0 or "confidence" not in val_info):
                values[val_key] = clamp01(float(value))
                if "confidence" in val_info:
                    new_confidences.append(clamp01(confidence))
        
        new_conf = mean(new_confidences) if new_confidences else prev.confidence
        updated_confidence = round(clamp01((prev.confidence + new_conf) / 2), 3)

        # Propagar incertidumbre si hay deltas de baja confianza
        uncertainties = dict(prev.uncertainty_sources)
        low_conf_vals = [c for c in new_confidences if c < 0.5]
        if low_conf_vals:
            uncertainties["evidence_gap"] = max(
                uncertainties.get("evidence_gap", 0.0),
                round(1.0 - mean(low_conf_vals), 3)
            )

        model = MentalModel(
            pid=pid,
            nodes=prev.nodes,
            edges=prev.edges,
            values=values,
            literacy=prev.literacy,
            preferences=prev.preferences,
            evidence_refs=prev.evidence_refs,
            uncertainty_sources=uncertainties,
            contradiction_flags=prev.contradiction_flags,
            confidence=updated_confidence,
            revision=prev.revision + 1,
            previous_revision_hash=prev.revision_hash,
            consent_snapshot_hash=prev.consent_snapshot_hash,
        )
        self.context.store.save_mental_model(model)
        self.context.store.append_audit(
            AuditRecord(
                agent="AMIND",
                pid=pid,
                action="update_values_vector",
                memory_layer=MemoryLayer.graph,
                payload=model.model_dump(mode="json"),
            )
        )
        return model

    def update_preferences(self, pid: str, preferences_delta: dict) -> MentalModel:
        """Actualiza las preferencias de canal/mediación del participante desde el LLM."""
        prev = self.context.store.load_mental_model(pid)
        if not prev:
            prev = MentalModel(
                pid=pid,
                nodes=self._base_nodes(),
                edges=[],
                values={},
                literacy=self._base_literacy(),
                confidence=0.45,
                revision=1
            )

        preferences = dict(prev.preferences)

        channel = preferences_delta.get("preferred_channel")
        if channel and channel != "unknown":
            preferences["prefers_audio"] = channel in ("audio", "mixed")

        mediation = preferences_delta.get("preferred_mediation")
        if mediation and mediation != "unknown":
            preferences["prefers_facilitated"] = mediation in (
                "facilitator", "community_group", "mixed"
            )

        pace = preferences_delta.get("preferred_pace")
        if pace and pace != "unknown":
            preferences["preferred_pace"] = pace

        style = preferences_delta.get("language_style")
        if style and style != "unknown":
            preferences["language_style"] = style

        model = MentalModel(
            pid=pid,
            nodes=prev.nodes,
            edges=prev.edges,
            values=prev.values,
            literacy=prev.literacy,
            preferences=preferences,
            evidence_refs=prev.evidence_refs,
            uncertainty_sources=prev.uncertainty_sources,
            contradiction_flags=prev.contradiction_flags,
            confidence=prev.confidence,
            revision=prev.revision + 1,
            previous_revision_hash=prev.revision_hash,
            consent_snapshot_hash=prev.consent_snapshot_hash,
        )
        self.context.store.save_mental_model(model)
        self.context.store.append_audit(
            AuditRecord(
                agent="AMIND",
                pid=pid,
                action="update_preferences",
                memory_layer=MemoryLayer.graph,
                payload=model.model_dump(mode="json"),
            )
        )
        return model
