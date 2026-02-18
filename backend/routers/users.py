from fastapi import APIRouter, HTTPException
from models.schemas import APIResponse, UserStats
from database.database import get_all_users, get_user_stats
from typing import List

router = APIRouter()

@router.get("/users/", response_model=List[str])
async def get_all_tracked_users():
    """
    Get list of all users who have location data
    """
    try:
        users = get_all_users()
        return users
    
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error retrieving users: {str(e)}"
        )

@router.get("/users/{user_id}/stats", response_model=UserStats)
async def get_user_statistics(user_id: str):
    """
    Get statistics for a specific user
    """
    try:
        stats = get_user_stats(user_id)
        
        if not stats:
            raise HTTPException(
                status_code=404, 
                detail=f"No statistics found for user: {user_id}"
            )
        
        return UserStats(**stats)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error retrieving user statistics: {str(e)}"
        )

@router.get("/users/{user_id}/exists")
async def check_user_exists(user_id: str):
    """
    Check if a user exists in the database
    """
    try:
        users = get_all_users()
        exists = user_id in users
        
        return APIResponse(
            status="success",
            message=f"User {user_id} {'exists' if exists else 'does not exist'}",
            data={"exists": exists}
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error checking user existence: {str(e)}"
        )