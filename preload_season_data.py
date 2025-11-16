#!/usr/bin/env python3
"""
Pre-load all 2025 F1 season data into cache
This script fetches race data and track coordinates for all available races
and saves them to the cache directory to avoid API calls later.
"""

import sys
import os

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils.f1_data import get_available_races, get_race_data
from utils.track_maps import get_track_coordinates

def preload_season_data():
    """Pre-load all available 2025 race data into cache"""
    print("=" * 60)
    print("Pre-loading 2025 F1 Season Data")
    print("=" * 60)
    print()
    
    # Get list of available races
    print("Fetching list of available races...")
    races = get_available_races()
    
    if not races:
        print("No races found. Make sure FastF1 can access the data.")
        return
    
    print(f"Found {len(races)} available races")
    print()
    
    # Process each race
    successful = 0
    failed = 0
    
    for i, race in enumerate(races, 1):
        year = race['year']
        gp = race['gp']
        name = race.get('name', gp)
        
        print(f"[{i}/{len(races)}] Processing: {name}")
        print(f"  Year: {year}, GP: {gp}")
        
        try:
            # Load race data (this will cache it automatically)
            print(f"  Loading race data...")
            race_data = get_race_data(year, gp, 'R')
            print(f"  ✓ Race data loaded ({len(race_data.get('telemetry', []))} telemetry entries)")
            
            # Load track coordinates (this will cache it automatically)
            print(f"  Loading track coordinates...")
            track_data = get_track_coordinates(year, gp)
            print(f"  ✓ Track coordinates loaded ({len(track_data.get('path', []))} points)")
            
            successful += 1
            print(f"  ✓ Successfully cached {name}")
            
        except Exception as e:
            print(f"  ✗ Failed to load {name}: {str(e)}")
            failed += 1
        
        print()
    
    # Summary
    print("=" * 60)
    print("Pre-loading Complete")
    print("=" * 60)
    print(f"Successful: {successful}")
    print(f"Failed: {failed}")
    print(f"Total: {len(races)}")
    print()
    print("All cached data is now available in the data_cache/ directory")
    print("The application will use this cached data instead of fetching from the API.")

if __name__ == '__main__':
    try:
        preload_season_data()
    except KeyboardInterrupt:
        print("\n\nPre-loading interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nError during pre-loading: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

