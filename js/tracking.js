// Backend URL - MAKE SURE THIS IS CORRECT
const BACKEND_URL = 'http://localhost:8000/api/v1';

let trackingInterval;
let currentUser = 'user101';
let isTracking = false;

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

async function sendLocationToServer(latitude, longitude) {
    try {
        console.log('📡 Sending location to backend...');
        
        const response = await fetch(`${BACKEND_URL}/locations/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: currentUser,
                latitude: latitude,
                longitude: longitude,
                timestamp: Date.now()
            })
        });

        console.log('📊 Response status:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Location saved successfully:', result);
            updateStatus(`Location saved! Points: ${result.data?.points || 'N/A'}`);
            return true;
        } else {
            const errorText = await response.text();
            console.error('❌ Server error:', response.status, errorText);
            updateStatus(`Server error: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.error('❌ Network error:', error);
        updateStatus('Network error - check console');
        return false;
    }
}

function startTracking() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by this browser.');
        return;
    }

    // Reset any previous errors
    updateStatus('Starting tracking...');
    
    isTracking = true;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;

    // Get initial position
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            updateCurrentLocation(lat, lng);
            
            // Try to send location but don't stop tracking if it fails
            const success = await sendLocationToServer(lat, lng);
            
            if (!success) {
                updateStatus('Tracking active (saving failed) - check console');
            }
            
            // Center map on current location
            if (window.trackingMap) {
                window.trackingMap.setView(lat, lng, 16);
                window.trackingMap.addMarker(lat, lng, 'Current Location');
            }

            // Start continuous tracking regardless of save success
            startContinuousTracking();
        },
        (error) => {
            handleGeolocationError(error);
            // Re-enable start button if geolocation fails
            document.getElementById('startBtn').disabled = false;
            document.getElementById('stopBtn').disabled = true;
        }
    );
}
async function clearUserData(userId) {
    try {
        // You would need to implement a backend endpoint to clear data
        // For now, we'll just log it
        console.log(`🔄 Clearing previous data for user: ${userId}`);
        updateStatus('Starting fresh tracking session...');
    } catch (error) {
        console.error('Error clearing user data:', error);
    }
}

function startContinuousTracking() {
    // Clear any existing interval
    if (trackingInterval) {
        clearInterval(trackingInterval);
    }

    // Set up continuous tracking
    trackingInterval = setInterval(async () => {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                updateCurrentLocation(lat, lng);
                
                // Try to send location (continue even if it fails)
                await sendLocationToServer(lat, lng);
                
                // Update map marker
                if (window.trackingMap) {
                    window.trackingMap.clearMarkers();
                    window.trackingMap.addMarker(lat, lng, 'Current Location');
                    window.trackingMap.setView(lat, lng, 16);
                }
            },
            (error) => {
                console.error('Geolocation error in interval:', error);
                // Don't stop tracking for geolocation errors
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }, 5000); // Update every 5 seconds

    updateStatus('Continuous tracking active - sending location every 5 seconds');
}

function stopTracking() {
    isTracking = false;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    
    if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
    }
    
    updateStatus('Tracking stopped');
}

function handleGeolocationError(error) {
    let errorMessage = 'Unknown error occurred';
    
    switch(error.code) {
        case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user.';
            break;
        case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
        case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
    }
    
    updateStatus(`Error: ${errorMessage}`);
    alert(`Location Error: ${errorMessage}`);
}

// Initialize tracking page
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('userId')) {
        document.getElementById('userId').value = currentUser;
        updateStatus('Ready to track location. Click "Start Tracking" to begin.');
    }
});