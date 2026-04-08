# auth.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase_client import supabase


router = APIRouter()

class AuthRequest(BaseModel):
    email: str
    password: str

# ✅ SIGNUP (ADD THIS)
@router.post("/signup")
async def signup(data: AuthRequest):
    try:
        response = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password
        })

        return {
            "status": "success",
            "user": response.user,
            "session": response.session
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
# ✅ LOGIN (ADD THIS)
@router.post("/login")
async def login(data: AuthRequest):   # ✅ KEEP THIS
    try:
        response = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })

        return {
            "status": "success",
            "user": response.user,
            "session": response.session
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))