# F1 Race Replay Application

A web application for replaying past F1 races with interactive track maps showing driver positions in real-time.

## Features

- Replay F1 races from 2025
- Interactive track map with driver positions as colored dots
- Playback controls: Play/Pause, Fast Forward, Rewind
- Timeline scrubber for seeking through the race
- Real-time driver position updates

## Prerequisites

- Docker and Docker Compose (for containerized deployment)
- OR Node.js 20+ and Python 3.11+ (for local development)

## Quick Start with Docker

1. Build and run the application:
```bash
docker-compose up --build
```

2. Open your browser and navigate to:
```
http://localhost:5000
```

## Pre-loading Season Data

To pre-load all 2025 season data into the cache (so it doesn't need to be fetched from the API each time):

```bash
# Activate virtual environment (if using one)
source venv/bin/activate  # On macOS/Linux
# or
venv\Scripts\activate  # On Windows

# Run the preload script
python preload_season_data.py
```

This will:
- Fetch race data for all available 2025 races
- Fetch track coordinates for each race
- Save everything to the `data_cache/` directory
- Future runs of the app will use cached data instead of making API calls

**Note:** This may take a while depending on your internet connection and how many races are available. The script will show progress for each race.

## Local Development

### Backend Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the Flask server:
```bash
python app.py
```

The API will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The React app will be available at `http://localhost:3000` and will proxy API requests to the Flask backend.

## Project Structure

```
f1-timing/
├── app.py                 # Flask API application
├── requirements.txt       # Python dependencies
├── Dockerfile            # Multi-stage Docker build
├── docker-compose.yml    # Docker Compose configuration
├── frontend/             # React application
│   ├── src/
│   │   ├── App.jsx       # Main React component
│   │   ├── components/   # React components
│   │   ├── services/     # API client
│   │   └── styles/       # CSS styles
│   └── package.json      # Node dependencies
└── utils/
    ├── f1_data.py        # FastF1 data fetching
    └── track_maps.py     # Track coordinate extraction
```

## API Endpoints

- `GET /api/races` - List available 2025 races
- `GET /api/race/<year>/<gp>/<session>` - Get race telemetry data
- `GET /api/track/<year>/<gp>` - Get track coordinates

## Data Source

This application uses [FastF1](https://github.com/theOehrly/Fast-F1) to fetch F1 timing and telemetry data. The data is cached locally to improve performance.

## Future Enhancements

- Safety car simulation
- Additional years beyond 2025
- Lap-by-lap navigation
- Driver information tooltips
- Speed visualization

## License

MIT

