from typing import Optional
from pydantic import BaseModel

# Generic Response Schema
class GenericResponse(BaseModel):
    success: bool = True
    data: Optional[dict] = None
    error: Optional[str] = None
