import fastf1
import pandas as pd
import json
from datetime import timedelta
import os

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
    """Get list of available 2025 races"""
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
    
    return races

def get_race_data(year, gp, session_type='R'):
    """Get processed race telemetry data - optimized version"""
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
        max_samples = min(int(max_duration.total_seconds()), 3600)  # Max 1 hour of data
        
        sample_count = 0
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
            
            if driver_positions:
                telemetry_data.append({
                    'time': str(current_time),
                    'drivers': driver_positions
                })
            
            current_time += interval
            sample_count += 1
        
        return {
            'year': year,
            'gp': gp,
            'session': session_type,
            'drivers': driver_info,
            'telemetry': telemetry_data,
            'start_time': str(start_time),
            'end_time': str(end_time)
        }
    
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

