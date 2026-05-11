// Backend URL
const BACKEND_URL = 'https://track-me-backend-rzto.onrender.com/api/v1';

// ===============================
// EMERGENCY LOCATIONS (MANUAL)
// ===============================
const EMERGENCY_HOSPITALS = [
    { name: "Jalpaiguri District Hospital",           lat: 26.5244, lon: 88.7197, ph: "+917478205691"},
    { name: "North Bengal Medical College",            lat: 26.6873, lon: 88.3945, ph: "9474122840" },
    { name: "Maynaguri Rural Hospital",                lat: 26.5652, lon: 88.8196, ph: "9474122840" },
    { name: "Arogya Nursing Home",                     lat: 26.5258, lon: 88.7229, ph: "9474122840" },
    { name: "Jalpaiguri Superspeciality Hospital",     lat: 26.5167, lon: 88.7075, ph: "3561232002" },
];

const EMERGENCY_POLICE_STATIONS = [
    { name: "Kotwali Police Station",                lat: 26.5246, lon: 88.7266, ph: "9474122840" },
    { name: "Jalpaiguri Cyber Crime Station",        lat: 26.5404, lon: 88.7193, ph: "9474122840" },
    { name: "Maynaguri Police Station",              lat: 26.5625, lon: 88.8210, ph: "9474122840" }
];

let emergencyMarkers = [];
let trackingInterval = null;
let currentUser = localStorage.getItem("user_id") || 'guest';
let isTracking = false;
let wasOutside = false;
let isEmergencyActive = false;

// Last known user position
let lastUserLat = null;
let lastUserLon = null;

// ===============================
// UI HELPERS (Synced with Premium CSS)
// ===============================
function updateUserId() {
    const newUserId = document.getElementById('userId').value.trim();
    if (newUserId) {
        currentUser = newUserId;
        localStorage.setItem("user_id", newUserId);
        updateStatus(`User ID updated: ${currentUser}`);
    } else {
        alert('Please enter a valid User ID');
    }
}

function updateStatus(message) {
    const statusEl = document.getElementById('status');
    statusEl.innerHTML = `<i class="fa fa-circle-notch fa-spin"></i> ${message}`;
    console.log(message);
}

function updateCurrentLocation(lat, lng) {
    document.getElementById('currentLocation').innerHTML =
        `<i class="fa fa-crosshairs"></i> Lat ${lat.toFixed(6)}, Lng ${lng.toFixed(6)}`;
}

// ===============================
// BACKEND SYNC
// ===============================
async function sendLocationToServer(latitude, longitude, isEmergency = false) {
    const sessionData = JSON.parse(localStorage.getItem("supabase_session"));
    const token = sessionData?.access_token;
    const savedUserId = localStorage.getItem("user_id") || currentUser;

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
                timestamp: Math.floor(Date.now()),
                is_emergency: isEmergency
            })
        });
    } catch (error) {
        console.error("Sync Error:", error);
    }
}

// ===============================
// MATH & SEARCH
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
// PREMIUM MAP OVERLAYS
// ===============================
function buildPopupHTML(entry, emoji, nameColor) {
    const distText = entry.distKm < 1
        ? `${(entry.distKm * 1000).toFixed(0)} m away`
        : `${entry.distKm.toFixed(2)} km away`;

    return `
        <div style="font-family:'Raleway',sans-serif; min-width:200px;">
            <div style="font-size:14px; font-weight:700; color:${nameColor}; margin-bottom:5px;">
                ${emoji} ${entry.name}
            </div>
            <div style="font-size:12px; color:#94a3b8; margin-bottom:10px;">
                <i class="fas fa-route"></i> Distance: ${distText}
            </div>
            <a href="tel:${entry.ph}"
               style="display:block; text-align:center; background:${nameColor}; color:#fff; 
                      font-size:12px; font-weight:700; padding:8px; border-radius:6px; 
                      text-decoration:none; text-transform:uppercase;">
                <i class="fas fa-phone-alt"></i> Call Now
            </a>
        </div>
    `;
}

function showEmergencyMarkers() {
    if (!window.trackingMap || !lastUserLat) return;
    clearEmergencyMarkers();

    const targets = [
        { list: EMERGENCY_HOSPITALS, icon: '🏥', color: '#e05252' },
        { list: EMERGENCY_POLICE_STATIONS, icon: '🚓', color: '#4f8ef7' }
    ];

    targets.forEach(t => {
        const nearest = getNearestEntry(lastUserLat, lastUserLon, t.list);
        if (nearest) {
            const icon = L.divIcon({
                html: `<div style="font-size:32px; filter:drop-shadow(0 0 10px ${t.color});">${t.icon}</div>`,
                className: '',
                iconAnchor: [16, 16]
            });
            const marker = L.marker([nearest.lat, nearest.lon], { icon })
                .addTo(window.trackingMap.map)
                .bindPopup(buildPopupHTML(nearest, t.icon, t.color));
            marker.openPopup();
            emergencyMarkers.push(marker);
        }
    });

    const group = L.featureGroup([...emergencyMarkers, ...window.trackingMap.markers]);
    window.trackingMap.map.fitBounds(group.getBounds().pad(0.3));
}

function clearEmergencyMarkers() {
    if (!window.trackingMap) return;
    emergencyMarkers.forEach(m => window.trackingMap.map.removeLayer(m));
    emergencyMarkers = [];
}

// ===============================
// TRACKING CORE
// ===============================
function startTracking() {
    if (!navigator.geolocation) return alert("Geolocation not supported");

    const selectedCollege = document.getElementById('collegeSelect')?.value || 'JGEC';
    if (window.trackingMap) window.trackingMap.setGeofence(selectedCollege);

    // Update UI State
    isTracking = true;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
    document.querySelectorAll('.college-btn').forEach(btn => btn.style.opacity = '0.5');

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        lastUserLat = lat; lastUserLon = lng;
        
        updateCurrentLocation(lat, lng);
        await sendLocationToServer(lat, lng);

        if (window.trackingMap) {
            window.trackingMap.setView(lat, lng, 16);
            window.trackingMap.clearMarkers();
            window.trackingMap.addMarker(lat, lng, "📍 My Live Position");
        }
        startContinuousTracking();
    }, (err) => console.error(err), { enableHighAccuracy: true });
}

function startContinuousTracking() {
    if (trackingInterval) clearInterval(trackingInterval);
    trackingInterval = setInterval(() => {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            lastUserLat = lat; lastUserLon = lng;

            updateCurrentLocation(lat, lng);
            
            // Check Geofence
            if (window.trackingMap && window.trackingMap.geofence) {
                const point = turf.point([lng, lat]);
                const poly = turf.polygon([window.trackingMap.geofence.getLatLngs()[0].map(p => [p.lng, p.lat]).concat([[window.trackingMap.geofence.getLatLngs()[0][0].lng, window.trackingMap.geofence.getLatLngs()[0][0].lat]])]);
                const isInside = turf.booleanPointInPolygon(point, poly);
                
                if (!isInside && !wasOutside) {
                    alert("🚨 BOUNDARY ALERT: You have left the safe zone!");
                    wasOutside = true;
                } else if (isInside) {
                    wasOutside = false;
                }
            }

            await sendLocationToServer(lat, lng);
            if (window.trackingMap && !isEmergencyActive) {
                window.trackingMap.clearMarkers();
                window.trackingMap.addMarker(lat, lng, "📍 Live Position");
            }
        }, null, { enableHighAccuracy: true });
    }, 5000);
    updateStatus("System Live: Tracking Active");
}

function stopTracking() {
    isTracking = false;
    isEmergencyActive = false;
    clearInterval(trackingInterval);
    clearEmergencyMarkers();
    
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('stopEmergencyBtn').disabled = true;
    document.querySelectorAll('.college-btn').forEach(btn => btn.style.opacity = '1');
    
    updateStatus("System Standby");
}

// ===============================
// EMERGENCY (SOS)
// ===============================
async function triggerEmergency() {
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        lastUserLat = lat; lastUserLon = lng;

        await sendLocationToServer(lat, lng, true);
        isEmergencyActive = true;
        document.getElementById('stopEmergencyBtn').disabled = false;
        document.getElementById('stopEmergencyBtn').style.backgroundColor = "#dc2626";

        showEmergencyMarkers();
        sendSOSSms(lat, lng);
        
        updateStatus("🚨 EMERGENCY MODE ACTIVE");
        alert("🚨 SOS TRIGGERED\nEmergency services and guardians notified.");
    }, null, { enableHighAccuracy: true });
}

function sendSOSSms(lat, lng) {
    const helperPhone = localStorage.getItem("helper_phone");
    if (!helperPhone) return;

    const msg = encodeURIComponent(`🚨 SOS! I need help. My location: https://maps.google.com/?q=${lat},${lng}`);
    window.open(`sms:${helperPhone}?body=${msg}`, '_blank');
}

function stopEmergency() {
    isEmergencyActive = false;
    clearEmergencyMarkers();
    document.getElementById('stopEmergencyBtn').disabled = true;
    document.getElementById('stopEmergencyBtn').style.backgroundColor = "#6b7280";
    updateStatus("System Live: Tracking Active");
}
