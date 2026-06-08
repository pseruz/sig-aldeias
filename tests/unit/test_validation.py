# tests/unit/test_validation.py
import pytest
from fastapi.testclient import TestClient
from tests.conftest import client, test_user

def test_validate_household_success(client: TestClient, test_user):
    # 1. Login
    login_data = {"username": "test@pc.pt", "password": "password123"}
    login_response = client.post("/auth/login", data=login_data)
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Criar Agregado Pendente
    house_payload = {
        "name": "Família Validação",
        "num_people": 3,
        "num_floors": 1,
        "material": "alvenaria",
        "latitude": 40.0,
        "longitude": -8.0
    }
    create_resp = client.post("/households/", json=house_payload, headers=headers)
    assert create_resp.status_code == 201
    household_id = create_resp.json()["id"]
    
    # 3. Validar
    validation_payload = {"status": "validado", "reason": "Conforme"}
    response = client.post(f"/validation/{household_id}", json=validation_payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["message"] == "Agregado validado com sucesso"