// ===============================
// JALPAIGURI GEOFENCE COORDINATES
// ===============================
const geofenceCoords = [
    [26.545263,88.704591],  // North-West corner
    [26.544896, 88.701020],
    [26.546974, 88.699489],
    [26.547673, 88.697415],  // North-East
    [26.550592, 88.695449],
    [26.550562, 88.69886],  // East
    [26.549952, 88.701505],
    [26.548713, 88.703079], 
    [26.547254, 88.704008],  // South-East
    
];
const geofenceLngLat = geofenceCoords.map(([lat, lng]) => [lng, lat]);

// close polygon (important)
geofenceLngLat.push(geofenceLngLat[0]);

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

        // Add geofence automatically when map loads
        this.addGeofence();
    }

    // ===============================
    // ADD GEOFENCE
    // ===============================
    addGeofence() {
        this.geofence = L.polygon(geofenceCoords, {
            color: 'red',
            fillColor: '#ff0000',
            fillOpacity: 0.3,
            weight: 2
        }).addTo(this.map);

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
