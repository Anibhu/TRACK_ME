// Backend URL - MAKE SURE THIS IS CORRECT
// const BACKEND_URL = 'http://localhost:8000/api/v1';
const BACKEND_URL = 'https://track-me-backend-rzto.onrender.com/api/v1';

  // ===============================
// BACKEND CONFIG
// ===============================
// const BACKEND_URL = 'http://localhost:8000/api/v1';

let trackingInterval = null;
let currentUser = localStorage.getItem("user_id") || 'guest';
let isTracking = false;
let wasOutside = false;
let isEmergencyActive = false;


// ===============================
// UI HELPERS
// ===============================
function updateUserId() {
    const newUserId = document.getElementById('userId').value.trim();
    if (newUserId) {
        currentUser = newUserId;
        updateStatus(`User ID updated to: ${currentUser}`);
    } else {
        alert('Please enter a valid User ID');
    }
}

function updateStatus(message) {
    document.getElementById('status').textContent = message;
    console.log(message);
}

function updateCurrentLocation(lat, lng) {
    document.getElementById('currentLocation').textContent =
        `Current: Lat ${lat.toFixed(6)}, Lng ${lng.toFixed(6)}`;
}


// ===============================
// SEND LOCATION TO BACKEND
// ===============================
async function sendLocationToServer(latitude, longitude) {
    // ✅ Get the token we saved during login
    const sessionData = JSON.parse(localStorage.getItem("supabase_session"));
    const token = sessionData?.access_token;
    const savedUserId = localStorage.getItem("user_id") || document.getElementById("userId")?.value;
    if (!savedUserId) {
        console.error("No User ID found. Cannot track location.");
        return;
    }
    try {
        const response =await fetch(`https://track-me-backend-rzto.onrender.com/api/v1/locations/save`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // ✅ Send token to backend
            },
            body: JSON.stringify({
                user_id: savedUserId,
                latitude,
                longitude,
                timestamp: Math.floor(Date.now())
            })
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Server rejected data:", errorData);
        }
    } catch (error) {
        console.error("Network error:", error);
    }
}


// ===============================
// GET NEARBY PLACES (FIXED)
// ===============================
async function getNearbyPlaces(lat, lng) {

    const radius = 15000; // Increased radius

    const query = `
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:${radius},${lat},${lng});
      node["amenity"="clinic"](around:${radius},${lat},${lng});
      node["healthcare"="hospital"](around:${radius},${lat},${lng});
      node["healthcare"="clinic"](around:${radius},${lat},${lng});
      node["amenity"="police"](around:${radius},${lat},${lng});

      way["amenity"="hospital"](around:${radius},${lat},${lng});
      way["amenity"="clinic"](around:${radius},${lat},${lng});
      way["healthcare"="hospital"](around:${radius},${lat},${lng});
      way["healthcare"="clinic"](around:${radius},${lat},${lng});
      way["amenity"="police"](around:${radius},${lat},${lng});
    );
    out body;
    >;
    out skel qt;
    `;

    try {
        const res = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: query
        });

        const data = await res.json();

        console.log("Nearby API Response:", data); // DEBUG

        return data.elements || [];

    } catch (err) {
        console.error("Nearby API error:", err);
        return [];
    }
}


// ===============================
// DISTANCE CALCULATION
// ===============================
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dLat/2)**2 +
              Math.cos(lat1*Math.PI/180) *
              Math.cos(lat2*Math.PI/180) *
              Math.sin(dLon/2)**2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


// ===============================
// FIND NEAREST PLACE (FIXED)
// ===============================
function getNearestPlace(userLat, userLng, places, type) {

    let nearest = null;
    let minDist = Infinity;

    places.forEach(p => {

        if (!p.tags) return;

        const lat = p.lat ?? (p.center && p.center.lat);
        const lon = p.lon ?? (p.center && p.center.lon);

        if (!lat || !lon) return;

        const amenity = p.tags.amenity || "";
        const healthcare = p.tags.healthcare || "";

        const isHospital =
            amenity === "hospital" ||
            amenity === "clinic" ||
            healthcare === "hospital" ||
            healthcare === "clinic";

        const isPolice = amenity === "police";

        if (
            (type === "hospital" && isHospital) ||
            (type === "police" && isPolice)
        ) {

            const d = getDistance(userLat, userLng, lat, lon);

            if (d < minDist) {
                minDist = d;
                nearest = {
                    lat,
                    lon,
                    name: p.tags.name || (type === "hospital" ? "Hospital" : "Police Station")
                };
            }
        }
    });

    console.log(`Nearest ${type}:`, nearest); // DEBUG

    return nearest;
}


// ===============================
// GEOFENCE CHECK
// ===============================
function checkGeofence(lat, lng) {

    if (!window.trackingMap || !window.trackingMap.geofence) return;

    const userPoint = turf.point([lng, lat]);
    const polygon = window.trackingMap.geofence.toGeoJSON();
    const isInside = turf.booleanPointInPolygon(userPoint, polygon);

    if (isInside) {
        updateStatus("🟢 Inside Geofence");
        wasOutside = false;
    } else {
        updateStatus("🔴 Outside Geofence");

        if (!wasOutside) {
            alert("🚨 Boundary crossed!");
            wasOutside = true;
        }
    }
}


// ===============================
// START TRACKING
// ===============================
function startTracking() {

    if (!navigator.geolocation) {
        alert("Geolocation not supported");
        return;
    }

    updateStatus("Starting tracking...");

    isTracking = true;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;

    navigator.geolocation.getCurrentPosition(
        async (position) => {

            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            updateCurrentLocation(lat, lng);
            function checkGeofence(lat, lng) {
              if (typeof turf === "undefined") {
                  console.error("Turf not loaded");
                  return;
              }
          
              if (!window.trackingMap) return;
          
              // Convert Leaflet coords → Turf format
              const geofenceLatLng = window.trackingMap.geofence.getLatLngs()[0];
          
              const geofenceLngLat = geofenceLatLng.map(p => [p.lng, p.lat]);
          
              // Close polygon (VERY IMPORTANT)
              geofenceLngLat.push(geofenceLngLat[0]);
          
              const point = turf.point([lng, lat]);
              const polygon = turf.polygon([geofenceLngLat]);
          
              const isInside = turf.booleanPointInPolygon(point, polygon);
          
              if (isInside) {
                  updateStatus("Inside Geofence");
                  wasOutside = false;
              } else {
                  updateStatus("Outside Geofence");
          
                  if (!wasOutside) {
                      alert("Boundary crossed!");
                      wasOutside = true;
                  }
              }
          }

            await sendLocationToServer(lat, lng);

            if (window.trackingMap) {
                window.trackingMap.setView(lat, lng, 16);
                window.trackingMap.clearMarkers();
                window.trackingMap.addMarker(lat, lng, "📍 You are here");
            }

            startContinuousTracking();
        },
        handleGeolocationError,
        { enableHighAccuracy: true }
    );
}


// ===============================
// CONTINUOUS TRACKING
// ===============================
function startContinuousTracking() {

    if (trackingInterval) clearInterval(trackingInterval);

    trackingInterval = setInterval(() => {

        navigator.geolocation.getCurrentPosition(
            async (position) => {

                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                updateCurrentLocation(lat, lng);
                checkGeofence(lat, lng);
                await sendLocationToServer(lat, lng);

                if (window.trackingMap) {
                    window.trackingMap.clearMarkers();
                    window.trackingMap.addMarker(lat, lng, "📍 You are here");
                    window.trackingMap.setView(lat, lng, 16);
                }

                // 🚨 EMERGENCY MODE
                if (isEmergencyActive) {

                    updateStatus("🚨 Emergency Mode: Searching help...");

                    const places = await getNearbyPlaces(lat, lng);

                    const hospital = getNearestPlace(lat, lng, places, "hospital");
                    const police = getNearestPlace(lat, lng, places, "police");

                    if (!hospital && !police) {
                        updateStatus("❌ No hospital or police found nearby!");
                        return;
                    }

                    if (hospital) {
                        window.trackingMap.addMarker(
                            hospital.lat,
                            hospital.lon,
                            `🏥 ${hospital.name}`
                        );
                    }

                    if (police) {
                        window.trackingMap.addMarker(
                            police.lat,
                            police.lon,
                            `🚓 ${police.name}`
                        );
                    }
                }

            },
            (error) => console.error(error),
            { enableHighAccuracy: true }
        );

    }, 5000);

    updateStatus("Tracking every 5 seconds...");
}


// ===============================
// STOP TRACKING
// ===============================
function stopTracking() {

    isTracking = false;
    isEmergencyActive = false;

    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('stopEmergencyBtn').disabled = true;

    if (trackingInterval) clearInterval(trackingInterval);

    updateStatus("Tracking stopped");
}


// ===============================
// 🚨 EMERGENCY
// ===============================
async function triggerEmergency() {

    navigator.geolocation.getCurrentPosition(async (position) => {

        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        await sendLocationToServer(lat, lng);

        alert("🚨 Emergency activated!");
        updateStatus("🚨 Emergency mode ON");

        isEmergencyActive = true;
        document.getElementById('stopEmergencyBtn').disabled = false;

    });
}


// ===============================
// ⛔ STOP EMERGENCY
// ===============================
function stopEmergency() {

    if (!isEmergencyActive) {
        alert("No active emergency!");
        return;
    }

    isEmergencyActive = false;

    updateStatus("🟢 Emergency stopped.");
    alert("Emergency mode deactivated!");

    document.getElementById('stopEmergencyBtn').disabled = true;
}


// ===============================
// GEO ERROR
// ===============================
function handleGeolocationError(error) {
    console.error(error);
    alert("Location error");
}


// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("userId").value = currentUser;
    document.getElementById("stopEmergencyBtn").disabled = true;
    updateStatus("Ready to track location");
});
