from fastapi import APIRouter, HTTPException, Depends
from models.schemas import APIResponse, UserStats
from database.database import get_all_users, get_user_stats
from typing import List
import supabase_client
from supabase_client import supabase
from dependencies import get_current_user

router = APIRouter()

@router.get("/users/", response_model=List[str])
async def get_all_tracked_users():
    try:
        # Fetch unique user IDs from the Supabase 'locations' table
        response = supabase.table("locations").select("user_id").execute()
        
        if not response.data:
            return []

        # Get unique list of user IDs
        user_ids = list(set([row['user_id'] for row in response.data]))
        return user_ids
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.get("/users/me/stats", response_model=UserStats)
async def get_my_statistics(current_user: str = Depends(get_current_user)):
    try:
        stats = get_user_stats(current_user)
        
        if not stats:
            raise HTTPException(
                status_code=404, 
                detail="No statistics found for this user"
            )
        
        return UserStats(**stats)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error retrieving user statistics: {str(e)}"
        )

@router.get("/users/me/exists")
async def check_user_exists(current_user: str = Depends(get_current_user)):
    try:
        users = get_all_users()
        exists = current_user in users
        
        return APIResponse(
            status="success",
            message=f"User {'exists' if exists else 'does not exist'}",
            data={"exists": exists}
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error checking user existence: {str(e)}"
        )