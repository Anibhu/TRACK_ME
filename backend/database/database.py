import sqlite3
import json
import os
from datetime import datetime
from typing import List, Dict, Any

# Database configuration
DATABASE_URL = "locations.db"

def get_db_connection():
    """Get SQLite database connection"""
    conn = sqlite3.connect(DATABASE_URL)
    conn.row_factory = sqlite3.Row  # This enables column access by name
    return conn

async def init_db():
    """Initialize database with required tables"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create locations table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (user_id)
        )
    ''')
    
    # Create index for faster queries
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_user_id ON locations (user_id)
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_timestamp ON locations (timestamp)
    ''')
    
    conn.commit()
    conn.close()
    
    print("Database initialized successfully")

def save_location(user_id: str, latitude: float, longitude: float, timestamp: float = None):
    """Save a location point to database"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Ensure user exists
    cursor.execute('INSERT OR IGNORE INTO users (user_id) VALUES (?)', (user_id,))
    
    # Save location
    if timestamp:
        # Convert timestamp to datetime string
        dt = datetime.fromtimestamp(timestamp / 1000)  # Assuming milliseconds
        cursor.execute('''
            INSERT INTO locations (user_id, latitude, longitude, timestamp)
            VALUES (?, ?, ?, ?)
        ''', (user_id, latitude, longitude, dt))
    else:
        cursor.execute('''
            INSERT INTO locations (user_id, latitude, longitude)
            VALUES (?, ?, ?)
        ''', (user_id, latitude, longitude))
    
    conn.commit()
    location_id = cursor.lastrowid
    conn.close()
    
    return location_id

def get_user_locations(user_id: str, limit: int = 1000) -> List[Dict[str, Any]]:
    """Get all locations for a specific user"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, user_id, latitude, longitude, 
               strftime('%s', timestamp) as timestamp
        FROM locations 
        WHERE user_id = ? 
        ORDER BY timestamp ASC
        LIMIT ?
    ''', (user_id, limit))
    
    locations = []
    for row in cursor.fetchall():
        locations.append({
            "id": row["id"],
            "user_id": row["user_id"],
            "lat": row["latitude"],
            "lng": row["longitude"],
            "timestamp": float(row["timestamp"]) * 1000  # Convert to milliseconds
        })
    
    conn.close()
    return locations

def get_all_users() -> List[str]:
    """Get list of all users who have location data"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT DISTINCT user_id FROM users ORDER BY user_id')
    users = [row["user_id"] for row in cursor.fetchall()]
    
    conn.close()
    return users

def get_user_stats(user_id: str) -> Dict[str, Any]:
    """Get statistics for a specific user"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get basic stats
    cursor.execute('''
        SELECT 
            COUNT(*) as total_locations,
            MIN(timestamp) as first_tracked,
            MAX(timestamp) as last_tracked
        FROM locations 
        WHERE user_id = ?
    ''', (user_id,))
    
    stats_row = cursor.fetchone()
    
    if not stats_row or stats_row["total_locations"] == 0:
        return None
    
    # Get all locations for distance calculation
    locations = get_user_locations(user_id)
    
    # Calculate total distance
    total_distance = calculate_total_distance(locations)
    
    stats = {
        "user_id": user_id,
        "total_locations": stats_row["total_locations"],
        "first_tracked": stats_row["first_tracked"],
        "last_tracked": stats_row["last_tracked"],
        "estimated_total_distance": total_distance
    }
    
    conn.close()
    return stats

def calculate_total_distance(locations: List[Dict]) -> float:
    """Calculate total distance traveled in kilometers"""
    if len(locations) < 2:
        return 0.0
    
    total_distance = 0.0
    
    for i in range(1, len(locations)):
        prev = locations[i-1]
        curr = locations[i]
        
        distance = haversine_distance(
            prev["lat"], prev["lng"],
            curr["lat"], curr["lng"]
        )
        total_distance += distance
    
    return total_distance

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two points on Earth"""
    from math import radians, sin, cos, sqrt, atan2
    
    R = 6371  # Earth radius in kilometers
    
    lat1_rad = radians(lat1)
    lon1_rad = radians(lon1)
    lat2_rad = radians(lat2)
    lon2_rad = radians(lon2)
    
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = sin(dlat/2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c