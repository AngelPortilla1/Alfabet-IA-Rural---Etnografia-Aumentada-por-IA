import pytest
from unittest.mock import MagicMock
from alfabetia_rural.agents.amind import MentalModelAgent

def test_amind_specs_regional():
    # Mock context to satisfy constructor
    context = MagicMock()
    agent = MentalModelAgent(context)
    
    # Verificamos que el agente AMIND reconozca la desconfianza digital
    spec = agent._code_spec("digital_distrust")
    assert spec is not None
    assert spec["requires_human_review"] is True