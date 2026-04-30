
// ===============================
// COLLEGE CONFIG
// ===============================
const COLLEGE_CONFIG = {
    JGEC: {
        type: "polygon",
        coords: [
            [26.545263,88.704591],
            [26.544896,88.701020],
            [26.546974,88.699489],
            [26.547673,88.697415],
            [26.550592,88.695449],
            [26.550562,88.69886],
            [26.549952,88.701505],
            [26.548713,88.703079],
            [26.547254,88.704008],
        ],
        color: "red"
    },

    CGEC: {
        type: "circle",
        center: [26.7020, 88.3700], // 🔥 change if needed
        radius: 500, // meters
        color: "blue"
    }
};


// ===============================
// GET ACTIVE COLLEGE CONFIG
// ===============================
function getCollegeConfig() {
    const college = localStorage.getItem("college");

    if (!college || !COLLEGE_CONFIG[college]) {
        alert("Invalid college. Please login again.");
        location.reload();
        return null;
    }

    return COLLEGE_CONFIG[college];
}


// ===============================
// MAP MANAGER CLASS
// ===============================
class MapManager {
    constructor(containerId, center = [26.5245, 88.7190], zoom = 13) {
        this.map = L.map(containerId).setView(center, zoom);

        this.tileLayer = L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }
        ).addTo(this.map);

        this.markers = [];
        this.polylines = [];

        // 🔥 load correct geofence
        this.addGeofence();
    }

    // ===============================
    // ADD GEOFENCE (DYNAMIC)
    // ===============================
    addGeofence() {
        const config = getCollegeConfig();
        if (!config) return;

        if (config.type === "polygon") {
            // 🔥 JGEC polygon
            this.geofence = L.polygon(config.coords, {
                color: config.color,
                fillColor: config.color,
                fillOpacity: 0.3,
                weight: 2
            }).addTo(this.map);

        } else if (config.type === "circle") {
            // 🔥 CGEC circle
            this.geofence = L.circle(config.center, {
                radius: config.radius,
                color: config.color,
                fillColor: config.color,
                fillOpacity: 0.3,
                weight: 2
            }).addTo(this.map);
        }

        this.map.fitBounds(this.geofence.getBounds());
    }

    // ===============================
    // MARKER FUNCTION
    // ===============================
    addMarker(lat, lng, popupText = '') {
        const marker = L.marker([lat, lng]).addTo(this.map);

        if (popupText) {
            marker.bindPopup(popupText);
        }

        this.markers.push(marker);
        return marker;
    }

    // ===============================
    // POLYLINE FUNCTION
    // ===============================
    addPolyline(latlngs, options = { color: 'blue', weight: 4 }) {
        const polyline = L.polyline(latlngs, options).addTo(this.map);
        this.polylines.push(polyline);
        return polyline;
    }

    // ===============================
    // CLEAR MARKERS
    // ===============================
    clearMarkers() {
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];
    }

    // ===============================
    // CLEAR POLYLINES
    // ===============================
    clearPolylines() {
        this.polylines.forEach(polyline => this.map.removeLayer(polyline));
        this.polylines = [];
    }

    // ===============================
    // FIT BOUNDS
    // ===============================
    fitBounds(latlngs) {
        if (latlngs.length > 0) {
            this.map.fitBounds(latlngs);
        }
    }

    // ===============================
    // SET VIEW
    // ===============================
    setView(lat, lng, zoom = 15) {
        this.map.setView([lat, lng], zoom);
    }
}


// ===============================
// INITIALIZATION FUNCTIONS
// ===============================
function initTrackingMap() {
    if (document.getElementById('map')) {
        window.trackingMap = new MapManager('map');
    }
}

function initPathViewMap() {
    if (document.getElementById('map')) {
        window.pathViewMap = new MapManager('map');
    }
}


// ===============================
// AUTO INIT BASED ON PAGE
// ===============================
document.addEventListener('DOMContentLoaded', function () {
    if (window.location.pathname.includes('view_path.html')) {
        initPathViewMap();
    } else {
        initTrackingMap();
    }
});


