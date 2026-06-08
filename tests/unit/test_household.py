# tests/unit/test_household.py
import pytest
from fastapi.testclient import TestClient
from tests.conftest import client, test_user

def test_create_household_success(client: TestClient, test_user):
    # 1. Login com Form Data (data=) e campo username
    login_data = {"username": "test@pc.pt", "password": "password123"}
    login_response = client.post("/auth/login", data=login_data)
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Criar Agregado
    payload = {
        "name": "Família Teste",
        "num_people": 4,
        "num_floors": 2,
        "material": "betão",
        "latitude": 40.2345,
        "longitude": -8.1234
    }
    response = client.post("/households/", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Família Teste"
    assert data["status"] == "pendente"

def test_create_household_invalid_coords(client: TestClient, test_user):
    # 1. Login
    login_data = {"username": "test@pc.pt", "password": "password123"}
    login_response = client.post("/auth/login", data=login_data)
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Coordenadas Inválidas
    payload = {
        "name": "Família Inválida",
        "num_people": 2,
        "num_floors": 1,
        "material": "madeira",
        "latitude": 100,  # Inválido
        "longitude": 200   # Inválido
    }
    response = client.post("/households/", json=payload, headers=headers)
    assert response.status_code == 422  # Erro de Validação