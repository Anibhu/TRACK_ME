from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import datetime
import uvicorn

app = FastAPI(title="Location Tracker", version="1.0.0")

# ===============================
# CORS Configuration
# ===============================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("CORS middleware configured to allow all origins")

# ===============================
# In-memory database storage
# ===============================
db = {}

# ===============================
# Request Model
# ===============================
class LocationRequest(BaseModel):
    user_id: str
    latitude: float
    longitude: float
    timestamp: Optional[float] = None
    emergency: Optional[bool] = False


# ===============================
# ROOT ENDPOINT
# ===============================
@app.get("/")
async def home():
    return {"message": "Location Tracker API", "status": "Running"}


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "location-tracker"}


# ===============================
# SAVE NORMAL LOCATION
# ===============================
@app.post("/api/v1/locations/save")
async def save_location(request: LocationRequest):
    try:
        user_id = request.user_id

        # Create user if not exists
        if user_id not in db:
            db[user_id] = []
            print(f"New user created: {user_id}")

        # Create location record
        point = {
            "lat": request.latitude,
            "lng": request.longitude,
            "timestamp": request.timestamp or datetime.datetime.now().timestamp() * 1000,
            "emergency": request.emergency
        }

        # Save location
        db[user_id].append(point)

        print(f"Location saved for {user_id}: ({point['lat']}, {point['lng']})")
        print(f"User {user_id} now has {len(db[user_id])} locations")

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
        print(f"Error saving location: {e}")
        return {"status": "error", "message": str(e)}


# ===============================
# EMERGENCY LOCATION
# ===============================
@app.post("/api/v1/emergency")
async def emergency(data: dict):
    try:
        user_id = data.get("user_id")

        if not user_id:
            return {"status": "error", "message": "user_id required"}

        # Create user if not exists
        if user_id not in db:
            db[user_id] = []

        # Emergency record
        record = {
            "lat": data["latitude"],
            "lng": data["longitude"],
            "timestamp": datetime.datetime.now().timestamp() * 1000,
            "emergency": True
        }

        db[user_id].append(record)

        print(f"🚨 Emergency recorded for {user_id}")
        print(f"User {user_id} now has {len(db[user_id])} points")

        return {
            "status": "success",
            "message": "Emergency recorded",
            "data": record
        }

    except Exception as e:
        print(f"Error recording emergency: {e}")
        return {"status": "error", "message": str(e)}


# ===============================
# GET USER PATH
# ===============================
@app.get("/api/v1/locations/path/{user_id}")
async def get_path(user_id: str):
    try:
        if user_id not in db or not db[user_id]:
            print(f"No data found for user: {user_id}")
            return []

        locations = db[user_id]

        print(f"Returning {len(locations)} points for {user_id}")

        return locations

    except Exception as e:
        print(f"Error getting path: {e}")
        return []


# ===============================
# GET ALL USERS
# ===============================
@app.get("/api/v1/users/")
async def get_users():
    users = list(db.keys())
    print(f"Available users: {users}")
    return users


# ===============================
# DEBUG INFO
# ===============================
@app.get("/debug")
async def debug():
    return {
        "total_users": len(db),
        "users": {user: len(locations) for user, locations in db.items()},
        "cors_enabled": True
    }


# ===============================
# TEST ENDPOINT
# ===============================
@app.get("/api/v1/test")
async def test_endpoint():
    return {
        "message": "Backend is working!",
        "timestamp": datetime.datetime.now().isoformat()
    }


# ===============================
# RUN SERVER
# ===============================
if __name__ == "__main__":
    print("Starting Location Tracking Backend...")
    print("URL: http://localhost:8000")
    print("Docs: http://localhost:8000/docs")
    print("Health: http://localhost:8000/health")
    print("Debug: http://localhost:8000/debug")
    print("Test: http://localhost:8000/api/v1/test")

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
