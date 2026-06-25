from alfabetia_rural.agents.aplan import PlanningAgent
from alfabetia_rural.domain.enums import ApprovalStatus, GateDecision
from alfabetia_rural.domain.models import FairnessDecision, MentalModel


def test_planner_builds_governance_route(context):
    agent = PlanningAgent(context)
    model = MentalModel(pid="p1", values={"data_sensitivity": 0.8}, preferences={"prefers_audio": True}, confidence=0.8)
    fairness = FairnessDecision(decision=GateDecision.accept)
    route = agent.propose_route(model, fairness=fairness)
    assert route.steps
    assert any(step.domain == "C2" for step in route.steps)
    assert route.human_review_required is True
    assert route.approval_status == ApprovalStatus.needs_human_review
    assert route.trace[0].need


def test_planner_keeps_trace_need_competence_module(context):
    agent = PlanningAgent(context)
    model = MentalModel(
        pid="p2",
        values={"interest_recommendations": 0.8, "trust_human": 0.7},
        preferences={"prefers_audio": False},
        confidence=0.7,
    )
    route = agent.propose_route(model, fairness=FairnessDecision(decision=GateDecision.accept))
    assert all(item.competence and item.module_id and item.assessment for item in route.trace)
