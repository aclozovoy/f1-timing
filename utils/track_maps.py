import fastf1
import numpy as np
import os
import json
from datetime import datetime, timedelta

# Enable FastF1 cache
CACHE_DIR = os.path.join(os.path.dirname(__file__), '..', 'cache')
fastf1.Cache.enable_cache(CACHE_DIR)

def get_track_coordinates(year, gp):
    """Extract track coordinates from FastF1 with caching"""
    # Try to load from cache first (using 'track' as session type for cache key)
    cache_key = f"{year}_{gp}_track"
    cache_path = os.path.join(os.path.dirname(__file__), '..', 'data_cache', f"{cache_key}.json")
    
    if os.path.exists(cache_path):
        try:
            # Check if cache is valid (30 days)
            file_time = datetime.fromtimestamp(os.path.getmtime(cache_path))
            if (datetime.now() - file_time) < timedelta(days=30):
                with open(cache_path, 'r') as f:
                    cached = json.load(f)
                    print(f"Loaded track coordinates from cache: {year} {gp}")
                    return cached['data']
        except Exception:
            pass
    
    # If not in cache, fetch and process
    try:
        session = fastf1.get_session(year, gp, 'R')
        session.load()
        
        # Try to get track coordinates directly
        if hasattr(session, 'track_coordinates') and session.track_coordinates is not None:
            coords = session.track_coordinates
            if len(coords) > 0:
                # Convert to list of [x, y] pairs
                track_path = []
                for idx in range(len(coords)):
                    track_path.append({
                        'x': float(coords.iloc[idx]['X']),
                        'y': float(coords.iloc[idx]['Y'])
                    })
                
                # Normalize coordinates
                return normalize_coordinates(track_path)
        
        # Fallback: Extract from telemetry data
        # Get telemetry from first driver's first lap
        drivers = session.drivers
        if len(drivers) == 0:
            raise Exception("No drivers found in session")
        
        driver = drivers[0]
        driver_laps = session.laps.pick_driver(driver)
        
        if len(driver_laps) == 0:
            raise Exception("No laps found for driver")
        
        first_lap = driver_laps.iloc[0]
        telemetry = first_lap.get_telemetry()
        
        if telemetry is None or len(telemetry) == 0:
            raise Exception("No telemetry data available")
        
        # Extract X, Y coordinates
        track_path = []
        for _, row in telemetry.iterrows():
            if 'X' in row and 'Y' in row:
                track_path.append({
                    'x': float(row['X']),
                    'y': float(row['Y'])
                })
        
        if len(track_path) == 0:
            raise Exception("No track coordinates found")
        
        # Normalize coordinates
        result = normalize_coordinates(track_path)
        
        # Save to cache
        try:
            os.makedirs(os.path.dirname(cache_path), exist_ok=True)
            with open(cache_path, 'w') as f:
                json.dump({
                    'cached_at': datetime.now().isoformat(),
                    'year': year,
                    'gp': gp,
                    'data': result
                }, f, indent=2)
            print(f"Saved track coordinates to cache: {year} {gp}")
        except Exception as e:
            print(f"Error saving track cache: {e}")
        
        return result
    
    except Exception as e:
        raise Exception(f"Error fetching track coordinates: {str(e)}")

def normalize_coordinates(track_path):
    """Normalize track coordinates to fit viewport"""
    if len(track_path) == 0:
        return {'path': [], 'bounds': {'minX': 0, 'maxX': 0, 'minY': 0, 'maxY': 0}}
    
    # Extract x and y values
    x_coords = [point['x'] for point in track_path]
    y_coords = [point['y'] for point in track_path]
    
    min_x, max_x = min(x_coords), max(x_coords)
    min_y, max_y = min(y_coords), max(y_coords)
    
    # Calculate center and scale
    center_x = (min_x + max_x) / 2
    center_y = (min_y + max_y) / 2
    scale_x = max_x - min_x
    scale_y = max_y - min_y
    scale = max(scale_x, scale_y)
    
    # Normalize to -1 to 1 range (can be scaled in frontend)
    # Invert x-axis to fix coordinate system orientation
    normalized_path = []
    for point in track_path:
        normalized_path.append({
            'x': -(point['x'] - center_x) / scale if scale > 0 else 0,  # Invert x-axis
            'y': (point['y'] - center_y) / scale if scale > 0 else 0
        })
    
    return {
        'path': normalized_path,
        'bounds': {
            'minX': min_x,
            'maxX': max_x,
            'minY': min_y,
            'maxY': max_y
        },
        'center': {
            'x': center_x,
            'y': center_y
        },
        'scale': scale
    }

