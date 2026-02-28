// Shared map initialization functions
class MapManager {
    constructor(containerId, center = [22.58, 88.44], zoom = 13) {
        this.map = L.map(containerId).setView(center, zoom);
        this.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);
        
        this.markers = [];
        this.polylines = [];
    }

    addMarker(lat, lng, popupText = '') {
        const marker = L.marker([lat, lng]).addTo(this.map);
        if (popupText) {
            marker.bindPopup(popupText);
        }
        this.markers.push(marker);
        return marker;
    }

    addPolyline(latlngs, options = { color: 'blue', weight: 6 }) {
        const polyline = L.polyline(latlngs, options).addTo(this.map);
        this.polylines.push(polyline);
        return polyline;
    }

    clearMarkers() {
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];
    }

    clearPolylines() {
        this.polylines.forEach(polyline => this.map.removeLayer(polyline));
        this.polylines = [];
    }

    fitBounds(latlngs) {
        if (latlngs.length > 0) {
            this.map.fitBounds(latlngs);
        }
    }

    setView(lat, lng, zoom) {
        this.map.setView([lat, lng], zoom);
    }
}

// Initialize map for tracking page
function initTrackingMap() {
    if (document.getElementById('map')) {
        window.trackingMap = new MapManager('map');
    }
}

// Initialize map for path view page
function initPathViewMap() {
    if (document.getElementById('map')) {
        window.pathViewMap = new MapManager('map');
    }
}

// Initialize appropriate map based on current page
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('view_path.html')) {
        initPathViewMap();
    } else {
        initTrackingMap();
    }
});

function toggleFullscreenMap() {
    const mapContainer = document.querySelector('.map-container');

    if (!document.fullscreenElement) {
        mapContainer.requestFullscreen().then(() => {
            setTimeout(() => {
                if (map) map.invalidateSize();
            }, 300);
        });
    } else {
        document.exitFullscreen().then(() => {
            setTimeout(() => {
                if (map) map.invalidateSize();
            }, 300);
        });
    }
}