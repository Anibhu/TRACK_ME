from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from supabase_client import supabase

router = APIRouter()

# =============================
# REQUEST MODEL
# =============================
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    college: str  # required only for signup


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# =============================
# VALIDATION
# =============================
def validate_college(college: str):
    allowed = ["JGEC", "CGEC"]
    if college not in allowed:
        raise HTTPException(
            status_code=400,
            detail="Invalid college. Choose JGEC or CGEC"
        )


# =============================
# SIGNUP
# =============================
@router.post("/signup")
async def signup(data: SignupRequest):
    try:
        validate_college(data.college)

        response = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password,
            "options": {
                "data": {
                    "college": data.college
                }
            }
        })

        if not response.user:
            raise HTTPException(status_code=400, detail="Signup failed")

        return {
            "status": "success",
            "message": "User registered successfully",
            "user": response.user,
            "session": response.session,
            "college": data.college
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================
# LOGIN
# =============================
@router.post("/login")
async def login(data: LoginRequest):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })

        if not response.user:
            raise HTTPException(status_code=400, detail="Login failed")

        # 🔥 SAFE METADATA EXTRACTION
        user_metadata = response.user.user_metadata or {}
        college = user_metadata.get("college")

        if not college:
            raise HTTPException(
                status_code=400,
                detail="College not found. Please signup again."
            )

        return {
            "status": "success",
            "message": "Login successful",
            "user": response.user,
            "session": response.session,
            "college": college
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================
# LOGOUT
# =============================
@router.post("/logout")
async def logout():
    try:
        supabase.auth.sign_out()
        return {
            "status": "success",
            "message": "Logged out successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


