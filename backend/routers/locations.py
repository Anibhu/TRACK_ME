from fastapi import APIRouter, HTTPException
from models.schemas import LocationCreate, UserPathResponse, APIResponse
from database.database import save_location, get_user_locations
from typing import List, Dict, Any

router = APIRouter()

@router.post("/locations/save", response_model=APIResponse)
async def save_user_location(location: LocationCreate):
    """
    Save a user's location point
    """
    try:
        location_id = save_location(
            user_id=location.user_id,
            latitude=location.latitude,
            longitude=location.longitude,
            timestamp=location.timestamp
        )
        
        return APIResponse(
            status="success",
            message="Location saved successfully",
            data={"location_id": location_id, "user_id": location.user_id}
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error saving location: {str(e)}"
        )

@router.get("/locations/path/{user_id}", response_model=List[Dict[str, Any]])
async def get_user_path(user_id: str, limit: int = 1000):
    """
    Get all location points for a specific user
    Returns array of {lat, lng, timestamp} objects
    """
    try:
        locations = get_user_locations(user_id, limit)
        
        if not locations:
            raise HTTPException(
                status_code=404, 
                detail=f"No location data found for user: {user_id}"
            )
        
        # Convert to the format expected by frontend
        path_data = [
            {
                "lat": loc["lat"],
                "lng": loc["lng"],
                "timestamp": loc["timestamp"]
            }
            for loc in locations
        ]
        
        return path_data
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error retrieving user path: {str(e)}"
        )

@router.get("/locations/{user_id}/recent")
async def get_recent_locations(user_id: str, count: int = 10):
    """
    Get most recent locations for a user
    """
    try:
        locations = get_user_locations(user_id, count)
        
        if not locations:
            raise HTTPException(
                status_code=404, 
                detail=f"No location data found for user: {user_id}"
            )
        
        # Return most recent locations first
        recent_locations = sorted(locations, key=lambda x: x["timestamp"], reverse=True)[:count]
        
        return APIResponse(
            status="success",
            message=f"Found {len(recent_locations)} recent locations",
            data={"locations": recent_locations}
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error retrieving recent locations: {str(e)}"
        )