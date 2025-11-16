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
    """Get processed race telemetry data"""
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
        
        # Get telemetry data for all drivers using a more efficient approach
        telemetry_data = []
        
        # Get all laps and sort by time
        all_laps = session.laps
        if len(all_laps) == 0:
            raise Exception("No lap data available")
        
        # Find race start and end times
        start_time = all_laps['LapStartTime'].min()
        last_lap = all_laps.loc[all_laps['LapStartTime'].idxmax()]
        end_time = last_lap['LapStartTime'] + (last_lap['LapTime'] if pd.notna(last_lap['LapTime']) else timedelta(seconds=120))
        
        # Sample at regular intervals (every 0.5 seconds for better performance)
        current_time = start_time
        interval = timedelta(seconds=0.5)
        max_samples = 10000  # Limit to prevent excessive data
        
        sample_count = 0
        while current_time <= end_time and sample_count < max_samples:
            driver_positions = {}
            
            for driver in drivers:
                try:
                    # Get driver's laps
                    driver_laps = all_laps.pick_driver(driver)
                    
                    # Find the lap that contains this time
                    for _, lap in driver_laps.iterrows():
                        lap_start = lap['LapStartTime']
                        lap_time = lap['LapTime']
                        
                        if pd.isna(lap_time):
                            continue
                            
                        lap_end = lap_start + lap_time
                        
                        if lap_start <= current_time <= lap_end:
                            # Get telemetry for this lap
                            try:
                                tel = lap.get_telemetry()
                                if tel is not None and len(tel) > 0:
                                    # Calculate time offset within the lap
                                    time_offset = current_time - lap_start
                                    
                                    # Find closest time point in telemetry
                                    if 'Time' in tel.columns:
                                        tel_times = pd.to_timedelta(tel['Time'])
                                        closest_idx = (tel_times - time_offset).abs().idxmin()
                                        closest_tel = tel.loc[closest_idx]
                                        
                                        driver_positions[driver] = {
                                            'x': float(closest_tel['X']) if 'X' in closest_tel and pd.notna(closest_tel['X']) else None,
                                            'y': float(closest_tel['Y']) if 'Y' in closest_tel and pd.notna(closest_tel['Y']) else None,
                                            'distance': float(closest_tel['Distance']) if 'Distance' in closest_tel and pd.notna(closest_tel['Distance']) else None,
                                            'speed': float(closest_tel['Speed']) if 'Speed' in closest_tel and pd.notna(closest_tel['Speed']) else None,
                                            'lap': int(lap['LapNumber'])
                                        }
                            except Exception:
                                pass
                            break
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

