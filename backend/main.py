from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import datetime
import uvicorn

app = FastAPI(title="Location Tracker", version="1.0.0")

# CORS - Fix for your issue
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("🔧 CORS middleware configured to allow all origins")

# Database storage
db = {}

class LocationRequest(BaseModel):
    user_id: str
    latitude: float
    longitude: float
    timestamp: Optional[float] = None

@app.get("/")
async def home():
    return {"message": "📍 Location Tracker API", "status": "Running 🚀"}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "location-tracker"}

@app.post("/api/v1/locations/save")
async def save_location(request: LocationRequest):
    try:
        user_id = request.user_id
        
        # Initialize user if not exists
        if user_id not in db:
            db[user_id] = []
            print(f"👤 New user created: {user_id}")
        
        # Create location point
        point = {
            "lat": request.latitude,
            "lng": request.longitude,
            "timestamp": request.timestamp or datetime.datetime.now().timestamp() * 1000
        }
        
        # Save to database
        db[user_id].append(point)
        
        print(f"✅ Location saved for {user_id}: ({point['lat']}, {point['lng']})")
        print(f"📊 User {user_id} now has {len(db[user_id])} locations")
        
        return {
            "status": "success",
            "message": "Location saved",
            "data": {
                "user_id": user_id,
                "points": len(db[user_id]),
                "location": point
            }
        }
        
    except Exception as e:
        print(f"❌ Error saving location: {e}")
        return {"status": "error", "message": str(e)}

# ✅ FIXED ENDPOINT: Make sure this matches what frontend expects
@app.get("/api/v1/locations/path/{user_id}")
async def get_path(user_id: str):
    try:
        if user_id not in db or not db[user_id]:
            print(f"❌ No data found for user: {user_id}")
            return []
        
        locations = db[user_id]
        print(f"📍 Returning {len(locations)} points for {user_id}")
        return locations
        
    except Exception as e:
        print(f"❌ Error getting path: {e}")
        return []

@app.get("/api/v1/users/")
async def get_users():
    users = list(db.keys())
    print(f"📋 Available users: {users}")
    return users

@app.get("/debug")
async def debug():
    return {
        "total_users": len(db),
        "users": {user: len(locations) for user, locations in db.items()},
        "cors_enabled": True
    }

# ✅ ADD THIS: Test endpoint to verify backend is working
@app.get("/api/v1/test")
async def test_endpoint():
    return {"message": "Backend is working!", "timestamp": datetime.datetime.now().isoformat()}

if __name__ == "__main__":
    print("🚀 Starting Location Tracking Backend...")
    print("📍 URL: http://localhost:8000")
    print("📚 Docs: http://localhost:8000/docs")
    print("❤️  Health: http://localhost:8000/health")
    print("🐛 Debug: http://localhost:8000/debug")
    print("🧪 Test: http://localhost:8000/api/v1/test")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)


# ***