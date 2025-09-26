from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Dict, Any, Optional
from app.services.supabase_client import sign_up, sign_in, sign_out, get_user_profile, update_user_profile
from app.middleware.auth import get_current_user

router = APIRouter()

class UserSignUp(BaseModel):
    email: EmailStr
    password: str
    name: str
    user_type: str  # 'student' or 'parent'
    grade: Optional[str] = None
    school: Optional[str] = None

class UserSignIn(BaseModel):
    email: EmailStr
    password: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    grade: Optional[str] = None
    school: Optional[str] = None
    stream: Optional[str] = None
    interests: Optional[list] = None

@router.post("/signup")
async def register_user(user_data: UserSignUp):
    """Register a new user"""
    try:
        profile_data = {
            "name": user_data.name,
            "user_type": user_data.user_type,
            "grade": user_data.grade,
            "school": user_data.school
        }
        
        result = sign_up(user_data.email, user_data.password, profile_data)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"]["message"])
            
        return {
            "message": "User registered successfully",
            "user": result.get("user", {})
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login")
async def login_user(credentials: UserSignIn):
    """Login existing user"""
    try:
        result = sign_in(credentials.email, credentials.password)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"]["message"])
            
        return {
            "message": "Login successful",
            "session": result.get("session", {}),
            "user": result.get("user", {})
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/logout")
async def logout_user(user: Dict[str, Any] = Depends(get_current_user)):
    """Logout current user"""
    try:
        sign_out(user.get("session", {}).get("access_token", ""))
        return {"message": "Logout successful"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/profile")
async def get_profile(user: Dict[str, Any] = Depends(get_current_user)):
    """Get current user profile"""
    try:
        profile = get_user_profile(user.get("id"))
        return profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/profile")
async def update_profile(
    profile_data: ProfileUpdate,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Update current user profile"""
    try:
        updated_profile = update_user_profile(
            user.get("id"),
            profile_data.dict(exclude_unset=True)
        )
        return updated_profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))