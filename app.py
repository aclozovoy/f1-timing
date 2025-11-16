from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import os
from utils.f1_data import get_available_races, get_race_data
from utils.track_maps import get_track_coordinates

app = Flask(__name__, static_folder='frontend/dist', static_url_path='')
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

# Serve React app in production
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

