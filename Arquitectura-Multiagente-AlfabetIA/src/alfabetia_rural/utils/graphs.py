from __future__ import annotations

import math
from collections.abc import Mapping

from alfabetia_rural.domain.models import GraphEdge, MentalModel


def fisher_rao_distance(p: Mapping[str, float], q: Mapping[str, float]) -> float:
    keys = set(p) | set(q)
    if not keys:
        return 0.0
    sp = sum(max(p.get(k, 0.0), 0.0) for k in keys) or 1.0
    sq = sum(max(q.get(k, 0.0), 0.0) for k in keys) or 1.0
    affinity = sum(math.sqrt(max(p.get(k, 0.0), 0.0) / sp * max(q.get(k, 0.0), 0.0) / sq) for k in keys)
    affinity = max(0.0, min(1.0, affinity))
    return (2.0 * math.acos(affinity)) / math.pi


def euclidean_unit_distance(a: Mapping[str, float], b: Mapping[str, float]) -> float:
    keys = set(a) | set(b)
    if not keys:
        return 0.0
    dist = math.sqrt(sum((float(a.get(k, 0.0)) - float(b.get(k, 0.0))) ** 2 for k in keys))
    return min(1.0, dist / math.sqrt(len(keys)))


def graph_surrogate_distance(a: MentalModel, b: MentalModel) -> float:
    nodes_a = {node.id for node in a.nodes}
    nodes_b = {node.id for node in b.nodes}
    edges_a = {_edge_identity(edge): edge for edge in a.edges}
    edges_b = {_edge_identity(edge): edge for edge in b.edges}
    node_d = _jaccard_distance(nodes_a, nodes_b)
    edge_d = _jaccard_distance(set(edges_a), set(edges_b))
    shared = set(edges_a) & set(edges_b)
    if shared:
        weight_d = sum(abs(edges_a[key].weight - edges_b[key].weight) for key in shared) / len(shared)
        polarity_d = sum(0.0 if edges_a[key].polarity == edges_b[key].polarity else 1.0 for key in shared) / len(shared)
    else:
        weight_d = 0.0
        polarity_d = 0.0
    return min(1.0, 0.25 * node_d + 0.45 * edge_d + 0.20 * weight_d + 0.10 * polarity_d)


def hybrid_distance(a: MentalModel, b: MentalModel, alpha: float = 0.45, beta: float = 0.30, gamma: float = 0.25) -> float:
    total = alpha + beta + gamma
    if total <= 0:
        raise ValueError("alpha + beta + gamma must be positive")
    alpha, beta, gamma = alpha / total, beta / total, gamma / total
    return round(
        alpha * graph_surrogate_distance(a, b)
        + beta * euclidean_unit_distance(a.values, b.values)
        + gamma * fisher_rao_distance(a.literacy, b.literacy),
        6,
    )


def _edge_identity(edge: GraphEdge) -> tuple[str, str, str]:
    return (edge.source, edge.target, edge.relation)


def _jaccard_distance(a: set, b: set) -> float:
    if not a and not b:
        return 0.0
    return 1.0 - len(a & b) / len(a | b)
