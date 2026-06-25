from __future__ import annotations

from statistics import mean

from alfabetia_rural.domain.models import MentalModel, Segment
from alfabetia_rural.utils.graphs import hybrid_distance


def group_models(models: list[MentalModel], threshold: float = 0.30) -> list[Segment]:
    if not models:
        return []
    clusters: list[list[MentalModel]] = []
    for model in sorted(models, key=lambda m: m.pid):
        best_idx: int | None = None
        best_distance = float("inf")
        for idx, cluster in enumerate(clusters):
            d = mean(hybrid_distance(model, other) for other in cluster)
            if d < best_distance:
                best_distance = d
                best_idx = idx
        if best_idx is not None and best_distance <= threshold:
            clusters[best_idx].append(model)
        else:
            clusters.append([model])
    return [
        Segment(
            segment_id=f"SEG-{idx:02d}",
            label=label_cluster(cluster),
            member_ids=[m.pid for m in cluster],
            summary=summarize_cluster(cluster),
            centroid_pid=choose_centroid(cluster),
            stability_score=cluster_stability(cluster),
            coverage=coverage(cluster),
            metadata={"distance_threshold": threshold, "method": "greedy_hybrid_surrogate"},
        )
        for idx, cluster in enumerate(clusters, start=1)
    ]


def choose_centroid(cluster: list[MentalModel]) -> str | None:
    if not cluster:
        return None
    scores = []
    for a in cluster:
        total = sum(hybrid_distance(a, b) for b in cluster if b.pid != a.pid)
        scores.append((total, a.pid))
    return sorted(scores, key=lambda item: (item[0], item[1]))[0][1]


def cluster_stability(cluster: list[MentalModel]) -> float:
    if len(cluster) <= 1:
        return 1.0
    distances = [hybrid_distance(a, b) for idx, a in enumerate(cluster) for b in cluster[idx + 1 :]]
    return round(max(0.0, 1.0 - mean(distances)), 3)


def coverage(cluster: list[MentalModel]) -> dict[str, float]:
    n = len(cluster) or 1
    return {
        "n": float(len(cluster)),
        "prefers_audio_fraction": round(sum(1 for m in cluster if m.preferences.get("prefers_audio")) / n, 3),
        "mean_confidence": round(mean(m.confidence for m in cluster), 3),
    }


def label_cluster(cluster: list[MentalModel]) -> str:
    avg_data = mean(item.values.get("data_sensitivity", 0.0) for item in cluster)
    avg_recom = mean(item.values.get("interest_recommendations", 0.0) for item in cluster)
    avg_human = mean(item.values.get("trust_human", 0.0) for item in cluster)
    avg_fair = mean(item.values.get("fairness_concern", 0.0) for item in cluster)
    if avg_data >= 0.40 and avg_recom < 0.30:
        return "guardianías de datos"
    if avg_recom >= 0.30 and avg_human >= 0.20:
        return "pragmáticos críticos"
    if avg_fair >= 0.25:
        return "vigilantes de equidad"
    return "adoptantes graduales"


def summarize_cluster(cluster: list[MentalModel]) -> str:
    members = ", ".join(item.pid for item in cluster)
    avg_audio = mean(1.0 if item.preferences.get("prefers_audio") else 0.0 for item in cluster)
    avg_data = mean(item.values.get("data_sensitivity", 0.0) for item in cluster)
    avg_recom = mean(item.values.get("interest_recommendations", 0.0) for item in cluster)
    return (
        f"Miembros: {members}. Audio={avg_audio:.2f}; sensibilidad de datos={avg_data:.2f}; "
        f"interés en recomendaciones={avg_recom:.2f}. Segmento hipotético, revisable y no identitario."
    )
