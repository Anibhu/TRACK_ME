from fastapi import APIRouter, HTTPException, Depends
from models.schemas import LocationCreate, UserPathResponse, APIResponse
from database.database import save_location, get_user_locations
from typing import List, Dict, Any
from supabase_client import supabase
from dependencies import get_current_user

router = APIRouter()

# ===============================
# SAVE LOCATION (SUPABASE)
# ===============================
@router.post("/locations/save", response_model=APIResponse)
async def save_user_location(
    location: LocationCreate):
    try:
        response = supabase.table("locations").insert({
            "user_id": location.user_id,
            "lat": location.latitude,
            "lng": location.longitude,
            "timestamp": location.timestamp
        }).execute()

        return APIResponse(
            status="success",
            message="Location saved successfully",
            data=response.data
        )

    except Exception as e:
        print(f"SAVE ERROR: {e}") # This helps you see the error in Render logs
        raise HTTPException(status_code=500, detail=str(e))


# ===============================
# GET USER PATH (SUPABASE)
# ===============================
@router.get("/locations/path/{user_id}", response_model=List[Dict[str, Any]])
async def get_user_path(user_id: str, limit: int = 1000):
    try:
        response = supabase.table("locations") \
            .select("*") \
            .eq("user_id", user_id) \
            .limit(limit) \
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=404,
                detail=f"No location data found for user: {user_id}"
            )

        return response.data

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving user path: {str(e)}"
        )


# ===============================
# GET RECENT LOCATIONS
# ===============================
@router.get("/locations/{user_id}/recent")
async def get_recent_locations(user_id: str, count: int = 10):
    try:
        response = supabase.table("locations") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("timestamp", desc=True) \
            .limit(count) \
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=404,
                detail=f"No location data found for user: {user_id}"
            )

        return APIResponse(
            status="success",
            message=f"Found {len(response.data)} recent locations",
            data={"locations": response.data}
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving recent locations: {str(e)}"
        )