from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.services.supabase_client import verify_token
from typing import Dict, Any, Optional

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """
    Dependency to get the current authenticated user from JWT token
    """
    token = credentials.credentials
    result = verify_token(token)
    
    if not result.get("valid"):
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return result.get("user", {})

def get_optional_user(request: Request) -> Optional[Dict[str, Any]]:
    """
    Get user if authenticated, but don't require authentication
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    
    token = auth_header.replace("Bearer ", "")
    result = verify_token(token)
    
    if not result.get("valid"):
        return None
    
    return result.get("user", {})