from pydantic import BaseModel, Field

class ValidationRequest(BaseModel):
    status: str = Field(..., pattern="^(validado|rejeitado)$")
    reason: str | None = Field(None, min_length=5, max_length=500)