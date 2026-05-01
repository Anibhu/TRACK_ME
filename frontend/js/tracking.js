
// Backend URL
const BACKEND_URL = 'https://track-me-backend-rzto.onrender.com/api/v1';


// ===============================
// EMERGENCY LOCATIONS (MANUAL)
// ===============================
const EMERGENCY_HOSPITALS = [
    { name: "Jalpaiguri District Hospital",          lat: 26.5244, lon: 88.7197, ph: 9474122840 },
    { name: "North Bengal Medical College and Hospital", lat: 26.6873, lon: 88.3945, ph: 9474122840 },
    { name: "Maynaguri Rural Hospital",              lat: 26.5652, lon: 88.8196, ph: 9474122840 },
    { name: "Arogya Nursing Home (Jalpaiguri)",      lat: 26.5258, lon: 88.7229, ph: 9474122840 }
];

const EMERGENCY_POLICE_STATIONS = [
    { name: "Kotwali Police Station (Jalpaiguri)",   lat: 26.5246, lon: 88.7266, ph: 9474122840 },
    { name: "Maynaguri Police Station",              lat: 26.5625, lon: 88.8210, ph: 9474122840 }
];

// Emergency markers stored separately so clearMarkers() never removes them.
let emergencyMarkers = [];

let trackingInterval = null;
let currentUser = localStorage.getItem("user_id") || 'guest';
let isTracking = false;
let wasOutside = false;
let isEmergencyActive = false;

// Last known user position (set on each GPS tick)
let lastUserLat = null;
let lastUserLon = null;


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
    const sessionData = JSON.parse(localStorage.getItem("supabase_session"));
    const token = sessionData?.access_token;
    const savedUserId = localStorage.getItem("user_id") || document.getElementById("userId")?.value;
    if (!savedUserId) {
        console.error("No User ID found. Cannot track location.");
        return;
    }
    try {
        const response = await fetch(`${BACKEND_URL}/locations/save`, {
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
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Server rejected data:", errorData);
        }
    } catch (error) {
        console.error("Network error:", error);
    }
}


// ===============================
// DISTANCE CALCULATION (Haversine) — returns km
// ===============================
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) *
              Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


// ===============================
// GET NEAREST ENTRY from a list
// Returns the single closest item to (userLat, userLon)
// with an extra `.distKm` field attached.
// ===============================
function getNearestEntry(userLat, userLon, list) {
    let nearest = null;
    let minDist = Infinity;

    list.forEach(entry => {
        const d = getDistance(userLat, userLon, entry.lat, entry.lon);
        if (d < minDist) {
            minDist = d;
            nearest = { ...entry, distKm: d };
        }
    });

    return nearest;
}


// ===============================
// BUILD POPUP HTML
// Shows name, distance, coordinates, and a tap-to-call button.
// ===============================
function buildPopupHTML(entry, emoji, nameColor) {
    const distText = entry.distKm < 1
        ? `${(entry.distKm * 1000).toFixed(0)} m away`
        : `${entry.distKm.toFixed(2)} km away`;

    return `
        <div style="font-family:sans-serif;min-width:180px;max-width:220px;">
            <div style="font-size:15px;font-weight:bold;color:${nameColor};margin-bottom:4px;">
                ${emoji} ${entry.name}
            </div>
            <div style="font-size:11px;color:#555;margin-bottom:2px;">
                📍 ${entry.lat.toFixed(4)}° N, ${entry.lon.toFixed(4)}° E
            </div>
            <div style="font-size:12px;color:#374151;font-weight:600;margin-bottom:8px;">
                🗺️ ${distText}
            </div>
            <a href="tel:${entry.ph}"
               style="
                display:block;
                text-align:center;
                background:#16a34a;
                color:#fff;
                font-size:13px;
                font-weight:bold;
                padding:6px 10px;
                border-radius:8px;
                text-decoration:none;
                letter-spacing:0.02em;
               ">
               📞 Call ${entry.ph}
            </a>
        </div>
    `;
}


// ===============================
// SHOW EMERGENCY MARKERS
// Only the NEAREST hospital and NEAREST police station are shown.
// ===============================
function showEmergencyMarkers() {
    if (!window.trackingMap) return;

    clearEmergencyMarkers();

    // Need user position to rank distances
    const userLat = lastUserLat;
    const userLon = lastUserLon;

    if (userLat === null || userLon === null) {
        console.warn("User position not yet known — cannot rank emergency locations.");
        return;
    }

    // --- Nearest hospital only ---
    const nearestHospital = getNearestEntry(userLat, userLon, EMERGENCY_HOSPITALS);
    if (nearestHospital) {
        const icon = L.divIcon({
            html: `<div style="font-size:32px;line-height:1;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.6));">🏥</div>`,
            className: '',
            iconAnchor: [16, 16]
        });

        const marker = L.marker([nearestHospital.lat, nearestHospital.lon], { icon })
            .addTo(window.trackingMap.map)
            .bindPopup(
                buildPopupHTML(nearestHospital, '🏥', '#dc2626'),
                { autoClose: false, closeOnClick: false }
            );

        marker.openPopup();
        emergencyMarkers.push(marker);
    }

    // --- Nearest police station only ---
    const nearestPolice = getNearestEntry(userLat, userLon, EMERGENCY_POLICE_STATIONS);
    if (nearestPolice) {
        const icon = L.divIcon({
            html: `<div style="font-size:32px;line-height:1;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.6));">🚓</div>`,
            className: '',
            iconAnchor: [16, 16]
        });

        const marker = L.marker([nearestPolice.lat, nearestPolice.lon], { icon })
            .addTo(window.trackingMap.map)
            .bindPopup(
                buildPopupHTML(nearestPolice, '🚓', '#1d4ed8'),
                { autoClose: false, closeOnClick: false }
            );

        marker.openPopup();
        emergencyMarkers.push(marker);
    }

    // Fit map to show user + both emergency markers together
    if (emergencyMarkers.length > 0) {
        const allMarkers = [...emergencyMarkers];
        if (window.trackingMap.markers.length > 0) {
            allMarkers.push(...window.trackingMap.markers);
        }
        const group = L.featureGroup(allMarkers);
        window.trackingMap.map.fitBounds(group.getBounds().pad(0.25));
    }

    console.log(`Nearest hospital: ${nearestHospital?.name} (${nearestHospital?.distKm?.toFixed(2)} km)`);
    console.log(`Nearest police:   ${nearestPolice?.name} (${nearestPolice?.distKm?.toFixed(2)} km)`);
}


// ===============================
// CLEAR EMERGENCY MARKERS
// ===============================
function clearEmergencyMarkers() {
    if (!window.trackingMap) return;
    emergencyMarkers.forEach(m => window.trackingMap.map.removeLayer(m));
    emergencyMarkers = [];
}


// ===============================
// GEOFENCE CHECK
// ===============================
function checkGeofence(lat, lng) {
    if (typeof turf === "undefined") {
        console.error("Turf not loaded");
        return;
    }

    if (!window.trackingMap || !window.trackingMap.geofence) return;

    const geofenceLatLng = window.trackingMap.geofence.getLatLngs()[0];
    const geofenceLngLat = geofenceLatLng.map(p => [p.lng, p.lat]);
    geofenceLngLat.push(geofenceLngLat[0]);

    const point = turf.point([lng, lat]);
    const polygon = turf.polygon([geofenceLngLat]);
    const isInside = turf.booleanPointInPolygon(point, polygon);

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

    const selectedCollege = document.getElementById('collegeSelect')?.value || 'JGEC';
    if (window.trackingMap) {
        window.trackingMap.setGeofence(selectedCollege);
    }

    const collegeSelect = document.getElementById('collegeSelect');
    if (collegeSelect) collegeSelect.disabled = true;

    updateStatus("Starting tracking...");
    isTracking = true;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            lastUserLat = lat;
            lastUserLon = lng;

            updateCurrentLocation(lat, lng);
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

                // Always keep last known position up to date
                lastUserLat = lat;
                lastUserLon = lng;

                updateCurrentLocation(lat, lng);
                checkGeofence(lat, lng);
                await sendLocationToServer(lat, lng);

                if (window.trackingMap) {
                    window.trackingMap.clearMarkers();
                    window.trackingMap.addMarker(lat, lng, "📍 You are here");

                    if (isEmergencyActive) {
                        // No auto-zoom — let user see hospital & police markers freely
                        updateStatus("🚨 Emergency Mode Active — Help locations shown on map");
                    } else {
                        window.trackingMap.setView(lat, lng, 16);
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

    const collegeSelect = document.getElementById('collegeSelect');
    if (collegeSelect) collegeSelect.disabled = false;

    if (trackingInterval) clearInterval(trackingInterval);

    clearEmergencyMarkers();
    updateStatus("Tracking stopped");
}


// ===============================
// 🚨 EMERGENCY — trigger
// ===============================
async function triggerEmergency() {
    navigator.geolocation.getCurrentPosition(async (position) => {

        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        lastUserLat = lat;
        lastUserLon = lng;

        await sendLocationToServer(lat, lng);

        isEmergencyActive = true;
        document.getElementById('stopEmergencyBtn').disabled = false;

        // Show only nearest hospital + nearest police station
        showEmergencyMarkers();

        updateStatus("🚨 Emergency Mode Active — Nearest help shown on map");
        alert("🚨 Emergency activated!\nNearest hospital and police station are now marked on the map.");
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
    clearEmergencyMarkers();

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
