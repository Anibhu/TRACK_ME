from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class LocationBase(BaseModel):
    latitude: float
    longitude: float
    user_id:Optional[str] = None

class LocationCreate(LocationBase):
    timestamp: Optional[float] = None

class LocationResponse(LocationBase):
    id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True

class UserPathResponse(BaseModel):
    user_id: str
    locations: List[LocationResponse]
    total_points: int
    first_point: Optional[LocationResponse] = None
    last_point: Optional[LocationResponse] = None

class UserStats(BaseModel):
    user_id: str
    total_locations: int
    first_tracked: Optional[datetime] = None
    last_tracked: Optional[datetime] = None
    estimated_total_distance: float  # in kilometers

class APIResponse(BaseModel):
    status: str
    message: str
    data: Optional[dict] = None