#!/usr/bin/env python3
"""
Save the race list to cache so it doesn't need to be loaded each time
"""

import sys
import os

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils.f1_data import get_available_races

def save_race_list():
    """Fetch and save the race list to cache"""
    print("=" * 60)
    print("Saving Race List to Cache")
    print("=" * 60)
    print()
    
    print("Fetching available races...")
    races = get_available_races()
    
    if not races:
        print("No races found. Make sure FastF1 can access the data.")
        return
    
    print(f"✓ Found {len(races)} available races")
    print()
    print("Race list:")
    print("-" * 60)
    for i, race in enumerate(races, 1):
        print(f"{i:2d}. {race.get('name', race.get('gp', 'Unknown'))} ({race.get('date', 'N/A')})")
    
    print()
    print("=" * 60)
    print("✓ Race list has been saved to cache")
    print("=" * 60)
    print()
    print("The race list is now cached in: data_cache/available_races.json")
    print("The app will use this cached list instead of fetching from the API each time.")

if __name__ == '__main__':
    try:
        save_race_list()
    except KeyboardInterrupt:
        print("\n\nOperation interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

