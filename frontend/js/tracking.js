
// ===============================
// BACKEND CONFIG
// ===============================
const BACKEND_URL = 'https://track-me-backend-rzto.onrender.com/api/v1';

let trackingInterval = null;
let currentUser = localStorage.getItem("user_id") || 'guest';
let isTracking = false;
let wasOutside = false;
let isEmergencyActive = false;


// ===============================
// COLLEGE CONFIG TYPE
// ===============================
function getCollegeConfig() {
    const college = localStorage.getItem("college");

    const CONFIG = {
        JGEC: { type: "polygon" },
        CGEC: { type: "circle" }
    };

    return CONFIG[college];
}


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
// SEND LOCATION
// ===============================
async function sendLocationToServer(latitude, longitude) {
    const sessionData = JSON.parse(localStorage.getItem("supabase_session"));
    const token = sessionData?.access_token;
    const savedUserId = localStorage.getItem("user_id");

    if (!savedUserId) return;

    try {
        await fetch(`${BACKEND_URL}/locations/save`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                user_id: savedUserId,
                latitude,
                longitude,
                timestamp: Math.floor(Date.now())
            })
        });
    } catch (error) {
        console.error("Network error:", error);
    }
}


// ===============================
// GEOFENCE CHECK (FINAL)
// ===============================
function checkGeofence(lat, lng) {

    if (!window.trackingMap || !window.trackingMap.geofence) return;

    const config = getCollegeConfig();
    if (!config) return;

    let isInside = false;

    // 🔴 POLYGON (JGEC)
    if (config.type === "polygon") {
        const geofenceLatLng = window.trackingMap.geofence.getLatLngs()[0];
        const geofenceLngLat = geofenceLatLng.map(p => [p.lng, p.lat]);
        geofenceLngLat.push(geofenceLngLat[0]);

        const point = turf.point([lng, lat]);
        const polygon = turf.polygon([geofenceLngLat]);

        isInside = turf.booleanPointInPolygon(point, polygon);
    }

    // 🔵 CIRCLE (CGEC)
    else if (config.type === "circle") {
        const center = window.trackingMap.geofence.getLatLng();
        const radius = window.trackingMap.geofence.getRadius();

        const distance = window.trackingMap.map.distance(
            [lat, lng],
            [center.lat, center.lng]
        );

        isInside = distance <= radius;
    }

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

    isTracking = true;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;

    navigator.geolocation.getCurrentPosition(
        async (position) => {

            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            updateCurrentLocation(lat, lng);
            checkGeofence(lat, lng);

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
function triggerEmergency() {

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

