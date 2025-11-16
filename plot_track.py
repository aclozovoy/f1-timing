#!/usr/bin/env python3
"""
Plot track coordinates for visualization
"""

import json
import sys
import os

try:
    import matplotlib.pyplot as plt
except ImportError:
    print("matplotlib is not installed. Installing...")
    os.system("pip install matplotlib")
    import matplotlib.pyplot as plt

def plot_track(year=2025, gp='Monaco'):
    """Plot track coordinates from cached data"""
    
    # Load track data
    cache_path = os.path.join('data_cache', f'{year}_{gp}_track.json')
    
    if not os.path.exists(cache_path):
        print(f"Track data not found: {cache_path}")
        print("Please run the preload script first.")
        return
    
    with open(cache_path, 'r') as f:
        data = json.load(f)
    
    track_data = data.get('data', {})
    path = track_data.get('path', [])
    bounds = track_data.get('bounds', {})
    center = track_data.get('center', {})
    scale = track_data.get('scale', 1)
    
    if not path:
        print("No path data found in track file")
        return
    
    # Extract coordinates
    # Note: X is inverted in the normalization, so we need to handle that
    x_coords = [-p['x'] for p in path]  # Invert X back
    y_coords = [p['y'] for p in path]
    
    # Create the plot
    plt.figure(figsize=(12, 10))
    plt.plot(x_coords, y_coords, 'b-', linewidth=2, label='Track Path')
    plt.plot(x_coords[0], y_coords[0], 'go', markersize=10, label='Start/Finish')
    plt.plot(x_coords[-1], y_coords[-1], 'ro', markersize=8, label='End')
    
    # Add title and labels
    plt.title(f'{gp} Grand Prix {year} - Track Layout', fontsize=16, fontweight='bold')
    plt.xlabel('Normalized X Coordinate (inverted)', fontsize=12)
    plt.ylabel('Normalized Y Coordinate', fontsize=12)
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.axis('equal')
    
    # Add info text
    info_text = f'Points: {len(path)}\n'
    info_text += f'Scale: {scale:.1f}m\n'
    info_text += f'Bounds: {bounds.get("minX", 0):.0f} to {bounds.get("maxX", 0):.0f}m (X)\n'
    info_text += f'         {bounds.get("minY", 0):.0f} to {bounds.get("maxY", 0):.0f}m (Y)'
    plt.text(0.02, 0.98, info_text, transform=plt.gca().transAxes,
             fontsize=9, verticalalignment='top',
             bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))
    
    # Save the plot
    output_file = f'track_plot_{year}_{gp.replace(" ", "_")}.png'
    plt.savefig(output_file, dpi=150, bbox_inches='tight')
    print(f"Track plot saved to: {output_file}")
    
    # Show the plot
    plt.show()

if __name__ == '__main__':
    # Default to Monaco, but allow command line arguments
    year = 2025
    gp = 'Monaco'
    
    if len(sys.argv) > 1:
        gp = sys.argv[1]
    if len(sys.argv) > 2:
        year = int(sys.argv[2])
    
    try:
        plot_track(year, gp)
    except Exception as e:
        print(f"Error plotting track: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

