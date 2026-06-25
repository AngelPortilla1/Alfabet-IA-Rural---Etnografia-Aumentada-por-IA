from __future__ import annotations

from typing import Any


class StubLLMClient:
    provider_name = "stub"

    def complete_json(self, task: str, payload: dict[str, Any]) -> dict[str, Any]:
        text = str(payload.get("normalized_text") or payload.get("text") or payload.get("recent_user_message") or "").lower()
        if task == "ethnographic_chat":
            if text.strip() in ("no", "no acepto", "no autorizo"):
                return {
                    "assistant_message": "Entiendo. Al no otorgar su consentimiento, no procederemos. Que tenga un buen día.",
                    "conversation_control": {
                        "phase": "consent",
                        "selected_probe_type": "closure_summary",
                        "reason_for_probe": "El participante rechazó el consentimiento.",
                        "coverage_target": [],
                        "fatigue_level_estimate": "low",
                        "should_continue": False,
                        "stop_reason": "consent_refused"
                    },
                    "memory_update": {
                        "append_transcript": {
                            "participant_id": payload.get("participant_id", "p1"),
                            "session_id": payload.get("session_id", "s1"),
                            "turn_id": payload.get("turn_id", "t1"),
                            "user_message_summary": "Rechazo de consentimiento",
                            "assistant_question": "pregunta formulada",
                            "channel": payload.get("channel", "text"),
                            "consent_scope_used": "none"
                        },
                        "episodic_summary_delta": [],
                        "semantic_facts_delta": [],
                        "graph_delta": {},
                        "literacy_profile_delta": {},
                        "values_vector_delta": {},
                        "preferences_delta": {},
                        "open_gaps_update": [],
                        "risk_flags": [],
                        "audit_note": "Consentimiento rechazado."
                    }
                }
            # Generar variabilidad basada en el hash del mensaje para que cada participante obtenga valores distintos
            import hashlib
            msg_hash = int(hashlib.md5(text.encode("utf-8")).hexdigest(), 16)
            # Derivar valores variables en rango [0.55, 0.95]
            base_conf = 0.55 + (msg_hash % 40) / 100.0
            need_c1 = round(0.15 + (msg_hash % 50) / 100.0, 2)
            need_c2 = round(0.20 + ((msg_hash >> 8) % 45) / 100.0, 2)
            edge_weight = round(0.40 + ((msg_hash >> 16) % 40) / 100.0, 2)
            edge_uncertainty = round(0.20 + ((msg_hash >> 24) % 40) / 100.0, 2)
            node_conf = round(base_conf, 2)

            return {
                "assistant_message": f"Entiendo su comentario sobre '{text[:40]}...'. ¿Podría contarme más sobre cómo gestiona esto en su finca?",
                "conversation_control": {
                    "phase": "beliefs",
                    "selected_probe_type": "mini_tour",
                    "reason_for_probe": "Profundizar en creencias y prácticas cotidianas.",
                    "coverage_target": ["C1", "C2"],
                    "fatigue_level_estimate": "low",
                    "should_continue": True,
                    "stop_reason": None
                },
                "memory_update": {
                    "append_transcript": {
                        "participant_id": payload.get("participant_id", "p1"),
                        "session_id": payload.get("session_id", "s1"),
                        "turn_id": payload.get("turn_id", "t1"),
                        "user_message_summary": f"Comentario sobre {text[:40]}",
                        "assistant_question": "pregunta formulada",
                        "channel": payload.get("channel", "text"),
                        "consent_scope_used": "semantic_processing"
                    },
                    "episodic_summary_delta": [
                        "El participante comenta sobre su experiencia y muestra interés."
                    ],
                    "semantic_facts_delta": [
                        {
                            "fact": f"Expresa ideas relativas a {text[:40]}",
                            "source_turn": payload.get("turn_id", "t1"),
                            "evidence_kind": "direct",
                            "confidence": round(base_conf, 2),
                            "uncertainty_reason": "declaración explícita"
                        }
                    ],
                    "graph_delta": {
                        "nodes_add_or_update": [
                            {
                                "node_id": "ia",
                                "label": "IA",
                                "type": "concept",
                                "description": "Inteligencia artificial",
                                "evidence_refs": [f"turn:{payload.get('turn_id', 't1')}"],
                                "confidence": node_conf
                            }
                        ],
                        "edges_add_or_update": [
                            {
                                "source": "comunidad",
                                "target": "ia",
                                "relation": "uses",
                                "polarity": 1,
                                "weight": edge_weight,
                                "evidence": [text[:100]],
                                "evidence_refs": [f"turn:{payload.get('turn_id', 't1')}"],
                                "support_count": 1,
                                "inferred": True,
                                "uncertainty": edge_uncertainty
                            }
                        ]
                    },
                    "literacy_profile_delta": {
                        "C1": {"need_score": need_c1, "confidence": round(base_conf, 2)},
                        "C2": {"need_score": need_c2, "confidence": round(base_conf, 2)}
                    },
                    "values_vector_delta": {},
                    "preferences_delta": {},
                    "open_gaps_update": [],
                    "risk_flags": [],
                    "audit_note": "Turno procesado correctamente por stub."
                }
            }
        if task == "probe":
            sensitive = any(token in text for token in ("deuda", "conflicto", "violencia", "ilegal"))
            return {
                "question": "¿Puede contar un caso concreto donde una recomendación automática le generó confianza o desconfianza?",
                "justification": "Probe prudente para profundizar en confianza, uso situado y límites percibidos.",
                "sensitive": sensitive,
                "uncertainty": 0.25,
            }
        if task == "codes":
            return {"codes": []}
        if task == "explanation":
            return {"explanation": ""}
        return {}
