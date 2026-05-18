# tests/test_utils.py
"""
Utilitários para testes - NÃO USAR EM PRODUÇÃO.

Estas funções usam hashing simples para evitar incompatibilidades
entre passlib/bcrypt em ambientes de teste.
"""
import hashlib

def get_test_password_hash(password: str) -> str:
    """
    Hash simplificado para testes usando SHA256.
    
    ⚠️  NÃO USAR EM PRODUÇÃO - apenas para testes unitários.
    Em produção, usar src/api/security/auth.py:get_password_hash
    """
    # Prefixo para identificar hashes de teste
    return f"test_sha256_{hashlib.sha256(password.encode('utf-8')).hexdigest()}"

def verify_test_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verificação simplificada para testes.
    """
    return get_test_password_hash(plain_password) == hashed_password
