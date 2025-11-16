#!/usr/bin/env python3
"""
Pre-load 2025 Monaco Grand Prix data into cache
This script fetches race data and track coordinates for Monaco
and saves them to the cache directory.
"""

import sys
import os

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils.f1_data import get_race_data
from utils.track_maps import get_track_coordinates

def preload_monaco():
    """Pre-load Monaco Grand Prix data into cache"""
    print("=" * 60)
    print("Pre-loading 2025 Monaco Grand Prix Data")
    print("=" * 60)
    print()
    
    year = 2025
    gp = 'Monaco'
    
    print(f"Processing: {gp} Grand Prix {year}")
    print()
    
    try:
        # Load race data (this will cache it automatically)
        print("Loading race data...")
        race_data = get_race_data(year, gp, 'R')
        print(f"✓ Race data loaded ({len(race_data.get('telemetry', []))} telemetry entries)")
        print(f"  Start time: {race_data.get('start_time', 'N/A')}")
        print(f"  End time: {race_data.get('end_time', 'N/A')}")
        print(f"  Total duration: {race_data.get('total_duration', 'N/A')}")
        print(f"  Track length: {race_data.get('track_length', 'N/A')} meters")
        print()
        
        # Load track coordinates (this will cache it automatically)
        print("Loading track coordinates...")
        track_data = get_track_coordinates(year, gp)
        print(f"✓ Track coordinates loaded ({len(track_data.get('path', []))} points)")
        print()
        
        print("=" * 60)
        print("✓ Successfully cached Monaco Grand Prix data")
        print("=" * 60)
        print()
        print("The data is now available in the data_cache/ directory:")
        print(f"  - Race data: data_cache/{year}_{gp}_R.json")
        print(f"  - Track data: data_cache/{year}_{gp}_track.json")
        print()
        print("The application will use this cached data instead of fetching from the API.")
        
    except Exception as e:
        print(f"✗ Failed to load Monaco Grand Prix data: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    try:
        preload_monaco()
    except KeyboardInterrupt:
        print("\n\nPre-loading interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nError during pre-loading: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

