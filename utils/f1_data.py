import fastf1
import pandas as pd
import json
from datetime import timedelta
import os
from .cache import load_from_cache, save_to_cache

# Enable FastF1 cache
CACHE_DIR = os.path.join(os.path.dirname(__file__), '..', 'cache')
fastf1.Cache.enable_cache(CACHE_DIR)

# Known 2025 Grand Prix locations (will be updated as season progresses)
GP_2025 = [
    'Bahrain', 'Saudi Arabia', 'Australia', 'Japan', 'China',
    'Miami', 'Emilia Romagna', 'Monaco', 'Canada', 'Spain',
    'Austria', 'Great Britain', 'Hungary', 'Belgium', 'Netherlands',
    'Italy', 'Azerbaijan', 'Singapore', 'United States', 'Mexico',
    'Brazil', 'Qatar', 'Abu Dhabi'
]

def get_available_races():
    """Get list of available 2025 races - with caching"""
    import json
    from datetime import datetime, timedelta
    
    # Cache file for race list
    cache_path = os.path.join(os.path.dirname(__file__), '..', 'data_cache', 'available_races.json')
    
    # Check if cache exists and is valid (30 days - race list doesn't change often)
    if os.path.exists(cache_path):
        try:
            with open(cache_path, 'r') as f:
                cached = json.load(f)
                cache_time = datetime.fromisoformat(cached.get('cached_at', '2000-01-01'))
                # Use cached data if it's less than 30 days old (or if it exists, use it indefinitely for stability)
                if (datetime.now() - cache_time) < timedelta(days=30):
                    print(f"Loaded race list from cache ({len(cached.get('races', []))} races)")
                    return cached.get('races', [])
                else:
                    # Cache is old but still exists - use it anyway to avoid API calls
                    print(f"Using cached race list (may be outdated, {len(cached.get('races', []))} races)")
                    return cached.get('races', [])
        except Exception as e:
            print(f"Error loading race list cache: {e}")
    
    # If not cached or cache invalid, fetch races
    races = []
    year = 2025
    
    for gp in GP_2025:
        try:
            session = fastf1.get_session(year, gp, 'R')
            session.load()
            if session is not None:
                races.append({
                    'year': year,
                    'gp': gp,
                    'name': f"{gp} Grand Prix",
                    'date': str(session.date) if hasattr(session, 'date') else None
                })
        except Exception:
            # Race not available yet, skip
            continue
    
    # Save to cache
    try:
        os.makedirs(os.path.dirname(cache_path), exist_ok=True)
        with open(cache_path, 'w') as f:
            json.dump({
                'cached_at': datetime.now().isoformat(),
                'races': races
            }, f, indent=2)
        print(f"Saved race list to cache ({len(races)} races)")
    except Exception as e:
        print(f"Error saving race list cache: {e}")
    
    return races

def get_race_data(year, gp, session_type='R'):
    """Get processed race telemetry data - optimized version with caching"""
    # Try to load from cache first
    cached_data = load_from_cache(year, gp, session_type)
    if cached_data:
        data = cached_data['data']
        # Check if cached data has old format (absolute times instead of relative)
        # Old format won't have 'total_duration' field, or first time entry will be absolute timestamp
        if 'total_duration' in data and data.get('telemetry') and len(data['telemetry']) > 0:
            # Check if first time entry looks like absolute time (contains date) vs relative (timedelta format)
            first_time = data['telemetry'][0].get('time', '')
            # If it looks like an absolute timestamp (has 'T' or looks like a full datetime), it's old format
            # Absolute timestamps typically have 'T' (ISO format) or are longer than 19 chars (datetime string)
            # Relative times are short like "0:00:00" or "1:01:01"
            is_absolute = 'T' in first_time or (len(first_time) > 19) or (len(first_time) > 10 and first_time.count(':') >= 2 and '-' in first_time)
            if is_absolute:
                print(f"Detected old cache format for {year} {gp} (absolute time: '{first_time}'), regenerating with relative times...")
                # Don't return cached data, regenerate it
            else:
                # New format with relative times, return it
                print(f"Using cached data for {year} {gp} (first time: '{first_time}')")
                return data
        elif 'total_duration' not in data:
            # Old format without total_duration field, regenerate
            print(f"Detected old cache format (no total_duration) for {year} {gp}, regenerating...")
        else:
            # Has total_duration but no telemetry or empty, return it anyway
            return data
    
    # If not in cache, process the data
    try:
        session = fastf1.get_session(year, gp, session_type)
        session.load()
        
        # Get all drivers
        drivers = session.drivers
        driver_info = {}
        
        # Get driver names and team colors
        for driver in drivers:
            try:
                lap = session.laps.pick_driver(driver).iloc[0]
                driver_info[driver] = {
                    'name': lap['Driver'],
                    'team': lap['Team'],
                    'color': get_team_color(lap['Team'])
                }
            except Exception:
                driver_info[driver] = {
                    'name': f'Driver {driver}',
                    'team': 'Unknown',
                    'color': '#808080'
                }
        
        # Pre-load telemetry for all drivers (much more efficient)
        driver_telemetry = {}
        for driver in drivers:
            try:
                # Get all telemetry for this driver
                driver_laps = session.laps.pick_driver(driver)
                all_tel = []
                
                for _, lap in driver_laps.iterrows():
                    try:
                        tel = lap.get_telemetry()
                        if tel is not None and len(tel) > 0:
                            # Add lap start time to telemetry time
                            lap_start = lap['LapStartTime']
                            if 'Time' in tel.columns:
                                tel = tel.copy()
                                tel['SessionTime'] = lap_start + pd.to_timedelta(tel['Time'])
                                tel['LapNumber'] = lap['LapNumber']
                                all_tel.append(tel)
                    except Exception:
                        continue
                
                if all_tel:
                    # Combine all telemetry
                    driver_telemetry[driver] = pd.concat(all_tel, ignore_index=True)
                    # Sort by session time
                    driver_telemetry[driver] = driver_telemetry[driver].sort_values('SessionTime')
            except Exception:
                continue
        
        if not driver_telemetry:
            raise Exception("No telemetry data available for any driver")
        
        # Find common time range
        all_times = []
        for tel in driver_telemetry.values():
            if 'SessionTime' in tel.columns:
                all_times.extend(tel['SessionTime'].tolist())
        
        if not all_times:
            raise Exception("No valid time data found")
        
        start_time = min(all_times)
        end_time = max(all_times)
        
        # Sample at larger intervals (every 1 second) for better performance
        telemetry_data = []
        current_time = start_time
        interval = timedelta(seconds=1.0)  # 1 second intervals
        max_duration = end_time - start_time
        # Remove 1-hour limit - allow full race duration (races can be 1.5-2+ hours)
        max_samples = int(max_duration.total_seconds())
        
        sample_count = 0
        first_entry_added = False
        while current_time <= end_time and sample_count < max_samples:
            driver_positions = {}
            
            for driver, tel in driver_telemetry.items():
                try:
                    # Find closest time point in this driver's telemetry
                    if 'SessionTime' in tel.columns:
                        time_diffs = (tel['SessionTime'] - current_time).abs()
                        closest_idx = time_diffs.idxmin()
                        closest_tel = tel.loc[closest_idx]
                        
                        # Only include if within 2 seconds
                        time_diff = abs((closest_tel['SessionTime'] - current_time).total_seconds())
                        if time_diff <= 2.0:
                            driver_positions[driver] = {
                                'x': float(closest_tel['X']) if 'X' in closest_tel and pd.notna(closest_tel['X']) else None,
                                'y': float(closest_tel['Y']) if 'Y' in closest_tel and pd.notna(closest_tel['Y']) else None,
                                'distance': float(closest_tel['Distance']) if 'Distance' in closest_tel and pd.notna(closest_tel['Distance']) else None,
                                'speed': float(closest_tel['Speed']) if 'Speed' in closest_tel and pd.notna(closest_tel['Speed']) else None,
                                'lap': int(closest_tel['LapNumber']) if 'LapNumber' in closest_tel and pd.notna(closest_tel['LapNumber']) else None
                            }
                except Exception:
                    pass
            
            # Always add first entry at 0:00:00, even if no driver positions (to ensure race starts at 0)
            # For subsequent entries, only add if we have driver positions
            if sample_count == 0 or driver_positions:
                # Calculate relative time from race start (for display as 00:00:00)
                # Always set first entry to exactly timedelta(0) to ensure it starts at 0:00:00
                if sample_count == 0:
                    relative_time = timedelta(0)
                else:
                    relative_time = current_time - start_time
                
                # Format time consistently: convert to total seconds and format as H:MM:SS
                # This ensures all times use the same format (no "days" prefix inconsistency)
                total_seconds = int(relative_time.total_seconds())
                hours = total_seconds // 3600
                minutes = (total_seconds % 3600) // 60
                seconds = total_seconds % 60
                time_str = f"{hours}:{minutes:02d}:{seconds:02d}"
                
                telemetry_data.append({
                    'time': time_str,
                    'drivers': driver_positions if driver_positions else {}
                })
                first_entry_added = True
                
                # Debug: log first few entries
                if sample_count < 3:
                    print(f"  Entry {sample_count}: time='{time_str}', drivers={len(driver_positions)}")
            
            current_time += interval
            sample_count += 1
        
        # Calculate total duration for display
        total_duration = end_time - start_time
        # Format total duration consistently as H:MM:SS
        total_seconds = int(total_duration.total_seconds())
        total_hours = total_seconds // 3600
        total_minutes = (total_seconds % 3600) // 60
        total_secs = total_seconds % 60
        total_duration_str = f"{total_hours}:{total_minutes:02d}:{total_secs:02d}"
        
        # Calculate track length from lap data
        track_length = None
        try:
            # Get track length from the first driver's first lap
            if len(drivers) > 0:
                driver = drivers[0]
                driver_laps = session.laps.pick_driver(driver)
                if len(driver_laps) > 0:
                    first_lap = driver_laps.iloc[0]
                    # Try to get track length from lap distance
                    if 'LapDistance' in first_lap:
                        track_length = float(first_lap['LapDistance'])
                    # Alternative: calculate from telemetry distance range in first lap
                    elif len(driver_telemetry[driver]) > 0:
                        first_lap_tel = driver_telemetry[driver][driver_telemetry[driver]['LapNumber'] == first_lap['LapNumber']]
                        if len(first_lap_tel) > 0 and 'Distance' in first_lap_tel.columns:
                            distances = first_lap_tel['Distance'].dropna()
                            if len(distances) > 0:
                                # Track length is the maximum distance in the first lap
                                track_length = float(distances.max())
        except Exception as e:
            print(f"Could not calculate track length: {e}")
        
        result = {
            'year': year,
            'gp': gp,
            'session': session_type,
            'drivers': driver_info,
            'telemetry': telemetry_data,
            'start_time': str(start_time),
            'end_time': str(end_time),
            'total_duration': total_duration_str,  # For display as total time (H:MM:SS format)
            'track_length': track_length  # Track length in meters
        }
        
        # Save to cache for future use
        save_to_cache(year, gp, session_type, result)
        
        return result
    
    except Exception as e:
        raise Exception(f"Error fetching race data: {str(e)}")

def get_team_color(team_name):
    """Get team color based on team name"""
    team_colors = {
        'Red Bull Racing': '#1E41FF',
        'Ferrari': '#DC143C',
        'Mercedes': '#00D2BE',
        'McLaren': '#FF8700',
        'Aston Martin': '#00665E',
        'Alpine': '#0090FF',
        'Williams': '#005AFF',
        'AlphaTauri': '#2B4562',
        'Alfa Romeo': '#900000',
        'Haas': '#FFFFFF'
    }
    
    for team, color in team_colors.items():
        if team in team_name:
            return color
    
    return '#808080'  # Default gray

