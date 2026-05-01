// ===============================
// JGEC GEOFENCE COORDINATES
// ===============================
const geofenceCoordsJGEC = [
    [26.545263, 88.704591],  // North-West corner
    [26.544896, 88.701020],
    [26.546974, 88.699489],
    [26.547673, 88.697415],  // North-East
    [26.550592, 88.695449],
    [26.550562, 88.69886],   // East
    [26.549952, 88.701505],
    [26.548713, 88.703079],
    [26.547254, 88.704008],  // South-East
];

// ===============================
// CGEC GEOFENCE COORDINATES
// (Cooch Behar Government Engineering College)
// ===============================
const geofenceCoordsCGEC = [
    [26.3452, 89.4412],  // North-West
    [26.3448, 89.4378],
    [26.3428, 89.4375],  // South-West
    [26.3422, 89.4398],
    [26.3425, 89.4418],  // South-East
    [26.3438, 89.4430],
    [26.3452, 89.4425],  // North-East
];

// Active geofence (default: JGEC)
let activeGeofenceCoords = geofenceCoordsJGEC;

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
        this.geofence = null;

        // Add default geofence automatically when map loads
        this.addGeofence(activeGeofenceCoords);
    }

    // ===============================
    // ADD GEOFENCE (internal helper)
    // ===============================
    addGeofence(coords) {
        // Remove existing geofence if present
        if (this.geofence) {
            this.map.removeLayer(this.geofence);
            this.geofence = null;
        }

        this.geofence = L.polygon(coords, {
            color: 'red',
            fillColor: '#ff0000',
            fillOpacity: 0.3,
            weight: 2
        }).addTo(this.map);

        this.map.fitBounds(this.geofence.getBounds());
    }

    // ===============================
    // SET GEOFENCE BY COLLEGE
    // ===============================
    setGeofence(college) {
        if (college === 'CGEC') {
            activeGeofenceCoords = geofenceCoordsCGEC;
            this.addGeofence(geofenceCoordsCGEC);
        } else {
            // Default: JGEC
            activeGeofenceCoords = geofenceCoordsJGEC;
            this.addGeofence(geofenceCoordsJGEC);
        }
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
