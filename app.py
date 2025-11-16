from flask import Flask, jsonify, send_from_directory, send_file
from flask_cors import CORS
import os
from utils.f1_data import get_available_races, get_race_data
from utils.track_maps import get_track_coordinates

# Get absolute path to static folder
# Try multiple approaches to find the correct path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_FOLDER = os.path.join(BASE_DIR, 'frontend', 'dist')

# If the calculated path doesn't exist, try alternatives
if not os.path.exists(STATIC_FOLDER):
    # Try Docker container path
    docker_path = '/app/frontend/dist'
    if os.path.exists(docker_path):
        STATIC_FOLDER = docker_path
    else:
        # Try current working directory
        cwd_path = os.path.join(os.getcwd(), 'frontend', 'dist')
        if os.path.exists(cwd_path):
            STATIC_FOLDER = cwd_path

app = Flask(__name__, static_folder=STATIC_FOLDER, static_url_path='')
CORS(app)  # Enable CORS for React dev server

# API Routes
@app.route('/api/races')
def api_races():
    """List available 2025 races"""
    try:
        races = get_available_races()
        return jsonify(races)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/race/<int:year>/<gp>/<session>')
def api_race(year, gp, session):
    """Get race telemetry data"""
    try:
        data = get_race_data(year, gp, session)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/track/<int:year>/<gp>')
def api_track(year, gp):
    """Get track coordinates from FastF1"""
    try:
        coordinates = get_track_coordinates(year, gp)
        return jsonify(coordinates)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Serve React app static files
@app.route('/assets/<path:filename>')
def serve_assets(filename):
    """Serve static assets from the dist folder"""
    assets_dir = os.path.join(STATIC_FOLDER, 'assets')
    return send_from_directory(assets_dir, filename)

# Serve React app in production - catch all other routes
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    """Serve React app - all non-API routes go to index.html for client-side routing"""
    # Don't serve API routes
    if path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404
    
    # Use the STATIC_FOLDER that was set at module load time
    # Try multiple paths to be safe
    possible_paths = [
        STATIC_FOLDER,
        '/app/frontend/dist',
        os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'dist'),
        os.path.join(os.getcwd(), 'frontend', 'dist')
    ]
    
    index_path = None
    for static_dir in possible_paths:
        test_path = os.path.join(static_dir, 'index.html')
        if os.path.exists(test_path):
            index_path = test_path
            break
    
    if index_path and os.path.exists(index_path):
        return send_file(index_path)
    else:
        return jsonify({'error': f'Frontend not found. Tried: {possible_paths}'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)

