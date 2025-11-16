import React from 'react';

function RaceInfo({ raceData, currentTimeIndex }) {
  // Debug logging
  console.log('RaceInfo render:', { 
    hasRaceData: !!raceData, 
    hasTelemetry: !!(raceData?.telemetry),
    telemetryLength: raceData?.telemetry?.length,
    currentTimeIndex,
    totalLaps: raceData?.total_laps,
    hasLapTimes: !!(raceData?.lap_times)
  });

  if (!raceData || !raceData.telemetry || currentTimeIndex === undefined) {
    return (
      <div className="race-info">
        <h2 className="race-info-title">Race Information</h2>
        <div className="race-info-section">
          <div>Loading race data...</div>
        </div>
      </div>
    );
  }

  const currentTelemetry = raceData.telemetry[Math.floor(currentTimeIndex)];
  if (!currentTelemetry || !currentTelemetry.drivers) {
    return (
      <div className="race-info">
        <h2 className="race-info-title">Race Information</h2>
        <div className="race-info-section">
          <div>Waiting for driver data...</div>
        </div>
      </div>
    );
  }

  // Get current lap number (use the leader's lap number - driver with highest distance)
  let currentLap = 0;
  const driverPositions = Object.entries(currentTelemetry.drivers);
  
  // Find the leader (driver with highest distance)
  let leaderLap = 0;
  driverPositions.forEach(([driverId, position]) => {
    if (position.lap && position.lap > leaderLap) {
      leaderLap = position.lap;
    }
  });
  currentLap = leaderLap;

  const totalLaps = raceData.total_laps || 0;

  // Calculate top 3 positions based on lap number first, then distance within lap
  // A driver on a higher lap is always ahead, regardless of distance
  const sortedDrivers = driverPositions
    .filter(([_, pos]) => {
      // Include drivers that have either lap or distance data
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
      
      // If on same lap, sort by distance (higher distance = ahead, closer to finish line)
      return distB - distA;
    })
    .slice(0, 3);

  // Calculate fastest lap so far (up to current lap)
  let fastestLap = null;
  let fastestLapDriver = null;
  
  if (raceData.lap_times && currentLap > 0) {
    Object.entries(raceData.lap_times).forEach(([driverId, lapTimes]) => {
      // Check all laps up to current lap
      for (let lapNum = 1; lapNum <= currentLap; lapNum++) {
        if (lapTimes[lapNum] !== undefined) {
          const lapTime = lapTimes[lapNum];
          if (fastestLap === null || lapTime < fastestLap) {
            fastestLap = lapTime;
            fastestLapDriver = driverId;
          }
        }
      }
    });
  }

  const formatLapTime = (seconds) => {
    if (seconds === null || seconds === undefined) return 'N/A';
    const totalSeconds = seconds % 60;
    const mins = Math.floor(seconds / 60);
    const secs = totalSeconds.toFixed(3);
    // Pad seconds to ensure 2 digits before decimal (e.g., "03.456" or "45.123")
    const paddedSecs = secs.padStart(6, '0');
    return `${mins}:${paddedSecs}`;
  };

  console.log('RaceInfo calculated values:', {
    currentLap,
    totalLaps,
    sortedDrivers: sortedDrivers.length,
    fastestLap,
    fastestLapDriver
  });

  return (
    <div className="race-info">
      <h2 className="race-info-title">Race Information</h2>
      
      <div className="race-info-section">
        <div className="race-info-item">
          <span className="race-info-label">Lap:</span>
          <span className="race-info-value">
            {currentLap > 0 ? `${currentLap} / ${totalLaps}` : `0 / ${totalLaps || 'N/A'}`}
          </span>
        </div>
      </div>

      <div className="race-info-section">
        <h3 className="race-info-subtitle">Top 3 Positions</h3>
        <div className="positions-list">
          {sortedDrivers.length > 0 ? (
            sortedDrivers.map(([driverId, position], index) => {
              const driver = raceData.drivers[driverId];
              const positionNum = index + 1;
              return (
                <div key={driverId} className="position-item">
                  <span className="position-number">{positionNum}</span>
                  <span 
                    className="position-driver-color" 
                    style={{ backgroundColor: driver?.color || '#808080' }}
                  ></span>
                  <span className="position-driver-name">
                    {driver?.name || `Driver ${driverId}`}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="position-item">No position data available</div>
          )}
        </div>
      </div>

      <div className="race-info-section">
        <h3 className="race-info-subtitle">Fastest Lap</h3>
        {fastestLap !== null && fastestLapDriver ? (
          <div className="fastest-lap">
            <span className="fastest-lap-time">{formatLapTime(fastestLap)}</span>
            <span className="fastest-lap-driver">
              {raceData.drivers[fastestLapDriver]?.name || `Driver ${fastestLapDriver}`}
            </span>
          </div>
        ) : (
          <div className="fastest-lap">No lap time data available</div>
        )}
      </div>
    </div>
  );
}

export default RaceInfo;

