from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from routers import locations, users
from auth import router as auth_router

app = FastAPI(title="Location Tracker", version="1.0.0")

# ===============================
# INCLUDE ROUTERS (IMPORTANT)
# ===============================
app.include_router(locations.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1/auth")

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
# ROOT ENDPOINT
# ===============================
@app.get("/")
async def home():
    return {"message": "Location Tracker API", "status": "Running"}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "location-tracker"}

# ===============================
# TEST ENDPOINT
# ===============================
@app.get("/api/v1/test")
async def test_endpoint():
    return {
        "message": "Backend is working!",
    }

# ===============================
# RUN SERVER
# ===============================
if __name__ == "__main__":
    print("Starting Location Tracking Backend...")
    print("URL: https://track-me-backend-rzto.onrender.com")
    print("Docs: https://track-me-backend-rzto.onrender.com/docs")

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)