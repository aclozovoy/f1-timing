import React, { useState, useEffect, useRef } from 'react';
import RaceSelector from './components/RaceSelector';
import TrackMap from './components/TrackMap';
import CircularTrackMap from './components/CircularTrackMap';
import PlaybackControls from './components/PlaybackControls';
import RaceInfo from './components/RaceInfo';
import TrackStatus from './components/TrackStatus';
import LapTimeScatterplot from './components/LapTimeScatterplot';
import { getRaces, getRaceData, getTrackCoordinates } from './services/api';

function App() {
  const [races, setRaces] = useState([]);
  const [selectedRace, setSelectedRace] = useState(null);
  const [raceData, setRaceData] = useState(null);
  const [trackData, setTrackData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const animationFrameRef = useRef(null);
  const lastUpdateTimeRef = useRef(null);

  // Load available races on mount
  useEffect(() => {
    const loadRaces = async () => {
      try {
        setLoading(true);
        const racesData = await getRaces();
        setRaces(racesData);
      } catch (err) {
        setError(`Failed to load races: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    loadRaces();
  }, []);

  // Load race data when race is selected
  useEffect(() => {
    if (!selectedRace) {
      setRaceData(null);
      setTrackData(null);
      return;
    }

    const loadRaceData = async () => {
      try {
        setLoading(true);
        setError(null);
        setIsPlaying(false);
        setCurrentTimeIndex(0);

        const [raceDataResult, trackDataResult] = await Promise.all([
          getRaceData(selectedRace.year, selectedRace.gp, 'R'),
          getTrackCoordinates(selectedRace.year, selectedRace.gp)
        ]);

        setRaceData(raceDataResult);
        setTrackData(trackDataResult);
      } catch (err) {
        const errorMessage = err.response?.data?.error || err.message || 'Network Error';
        setError(`Failed to load race data: ${errorMessage}`);
        setRaceData(null);
        setTrackData(null);
      } finally {
        setLoading(false);
      }
    };

    loadRaceData();
  }, [selectedRace]);

  // Playback animation
  useEffect(() => {
    if (!isPlaying || !raceData || !raceData.telemetry) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const animate = (timestamp) => {
      if (!lastUpdateTimeRef.current) {
        lastUpdateTimeRef.current = timestamp;
      }

      const deltaTime = (timestamp - lastUpdateTimeRef.current) * playbackSpeed;
      lastUpdateTimeRef.current = timestamp;

      // Update time index based on playback speed
      // Each frame represents 1 second of race time (sampling interval)
      setCurrentTimeIndex((prevIndex) => {
        const maxIndex = raceData.telemetry.length - 1;
        const newIndex = prevIndex + (deltaTime / 1000); // 1000ms per index
        
        if (newIndex >= maxIndex) {
          setIsPlaying(false);
          return maxIndex;
        }
        return Math.min(newIndex, maxIndex);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    lastUpdateTimeRef.current = null;

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, raceData]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleFastForward = () => {
    const speeds = [1, 2, 4, 8];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIndex]);
  };

  const handleRewind = () => {
    setCurrentTimeIndex((prev) => Math.max(0, prev - 10)); // Rewind by 10 seconds (10 samples * 1s)
  };

  const handleSeek = (percentage) => {
    if (!raceData || !raceData.telemetry) return;
    const newIndex = Math.floor((percentage / 100) * raceData.telemetry.length);
    setCurrentTimeIndex(newIndex);
    setIsPlaying(false);
  };

  const getCurrentDriverPositions = () => {
    if (!raceData || !raceData.telemetry || currentTimeIndex >= raceData.telemetry.length) {
      return null;
    }
    return raceData.telemetry[Math.floor(currentTimeIndex)]?.drivers || null;
  };

  const getTop3DriverIds = () => {
    const positions = getCurrentDriverPositions();
    if (!positions) return [];
    
    // Calculate top 3 positions based on lap number first, then distance within lap
    const sortedDrivers = Object.entries(positions)
      .filter(([_, pos]) => {
        return (pos.lap !== null && pos.lap !== undefined) || 
               (pos.distance !== null && pos.distance !== undefined);
      })
      .sort(([_, posA], [__, posB]) => {
        const lapA = posA.lap || 0;
        const lapB = posB.lap || 0;
        const distA = posA.distance || 0;
        const distB = posB.distance || 0;
        
        // First sort by lap number (higher lap = ahead)
        if (lapA !== lapB) {
          return lapB - lapA;
        }
        
        // If on same lap, sort by distance (higher distance = ahead)
        return distB - distA;
      })
      .slice(0, 3)
      .map(([driverId]) => driverId);
    
    return sortedDrivers;
  };


  const getCurrentTime = () => {
    if (!raceData || !raceData.telemetry || currentTimeIndex >= raceData.telemetry.length) {
      return null;
    }
    return raceData.telemetry[Math.floor(currentTimeIndex)]?.time || null;
  };

  const getTotalTime = () => {
    if (!raceData || !raceData.telemetry || raceData.telemetry.length === 0) {
      return null;
    }
    // Use total_duration if available, otherwise use last telemetry time
    return raceData.total_duration || raceData.telemetry[raceData.telemetry.length - 1]?.time || null;
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>F1 Race Replay</h1>
      </header>

      <main className="app-main">
        <div className="race-selector-container">
          <RaceSelector
            races={races}
            selectedRace={selectedRace}
            onRaceChange={setSelectedRace}
            loading={loading}
          />
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {loading && (
          <div className="loading-message">
            Loading race data...
          </div>
        )}

        {raceData && trackData && (
          <TrackStatus
            raceData={raceData}
            currentTime={getCurrentTime()}
          />
        )}

        {raceData && trackData && (
          <>
            <div className="race-content-container">
              <div className="track-maps-container">
                <TrackMap
                  trackData={trackData}
                  driverPositions={getCurrentDriverPositions()}
                  drivers={raceData.drivers}
                  top3DriverIds={getTop3DriverIds()}
                />
                <CircularTrackMap
                  driverPositions={getCurrentDriverPositions()}
                  drivers={raceData.drivers}
                  raceData={raceData}
                  top3DriverIds={getTop3DriverIds()}
                  currentTimeIndex={currentTimeIndex}
                />
              </div>

              <RaceInfo
                raceData={raceData}
                currentTimeIndex={currentTimeIndex}
              />

              <LapTimeScatterplot
                raceData={raceData}
                currentTimeIndex={currentTimeIndex}
              />
            </div>

            <PlaybackControls
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              currentTime={getCurrentTime()}
              totalTime={getTotalTime()}
              currentIndex={currentTimeIndex}
              totalLength={raceData.telemetry ? raceData.telemetry.length : 0}
              onPlayPause={handlePlayPause}
              onFastForward={handleFastForward}
              onRewind={handleRewind}
              onSeek={handleSeek}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default App;

