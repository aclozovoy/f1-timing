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

  // Calculate all driver positions based on lap number first, then distance within lap
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
    });

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
        <h3 className="race-info-subtitle">Driver Positions</h3>
        <div className="positions-list">
          {sortedDrivers.length > 0 ? (
            <>
              {/* Column headers */}
              <div className="position-item position-header">
                <span className="position-number"></span>
                <span className="position-driver-color"></span>
                <span className="position-driver-name">Driver</span>
                <span className="position-lap-time-header">Last Lap</span>
                <span className="position-personal-best-header">Personal Best</span>
              </div>
              {sortedDrivers.map(([driverId, position], index) => {
              const driver = raceData.drivers[driverId];
              const positionNum = index + 1;
              
              // Get driver's last completed lap time
              // Find the highest lap number with a lap time (most recent completed lap)
              const driverLapTimes = raceData.lap_times?.[driverId] || {};
              const driverCurrentLap = position.lap || 0;
              
              let lastLapTime = null;
              let lastLapNumber = 0;
              
              if (driverCurrentLap > 0 && Object.keys(driverLapTimes).length > 0) {
                // Check current lap first, then work backwards
                for (let lapNum = driverCurrentLap; lapNum >= 1; lapNum--) {
                  if (driverLapTimes[lapNum] !== undefined) {
                    lastLapTime = driverLapTimes[lapNum];
                    lastLapNumber = lapNum;
                    break;
                  }
                }
              }
              
              // Determine if this is overall fastest lap
              const isOverallFastest = lastLapTime !== null && 
                                       fastestLap !== null && 
                                       Math.abs(lastLapTime - fastestLap) < 0.001; // Account for floating point
              
              // Calculate driver's personal best lap time (only up to current race lap)
              let personalBest = null;
              let isPersonalFastest = false;
              let isPersonalBestOverallFastest = false;
              if (driverLapTimes && Object.keys(driverLapTimes).length > 0 && currentLap > 0) {
                // Only consider laps up to the current race lap
                const lapsUpToCurrent = [];
                for (let lapNum = 1; lapNum <= currentLap; lapNum++) {
                  if (driverLapTimes[lapNum] !== undefined) {
                    lapsUpToCurrent.push(driverLapTimes[lapNum]);
                  }
                }
                
                if (lapsUpToCurrent.length > 0) {
                  personalBest = Math.min(...lapsUpToCurrent);
                  if (lastLapTime !== null) {
                    isPersonalFastest = Math.abs(lastLapTime - personalBest) < 0.001;
                  }
                  // Check if personal best is the overall fastest lap
                  if (personalBest !== null && fastestLap !== null) {
                    isPersonalBestOverallFastest = Math.abs(personalBest - fastestLap) < 0.001;
                  }
                }
              }
              
              // Determine color class for last lap time
              let lapTimeClass = 'lap-time-normal';
              if (isOverallFastest) {
                lapTimeClass = 'lap-time-fastest';
              } else if (isPersonalFastest) {
                lapTimeClass = 'lap-time-personal';
              }
              
              // Determine color class for personal best
              let personalBestClass = 'personal-best-normal';
              if (isPersonalBestOverallFastest) {
                personalBestClass = 'personal-best-fastest';
              }
              
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
                  {lastLapTime !== null && (
                    <span className={`position-lap-time ${lapTimeClass}`}>
                      {formatLapTime(lastLapTime)}
                    </span>
                  )}
                  {personalBest !== null && (
                    <span className={`position-personal-best ${personalBestClass}`}>
                      {formatLapTime(personalBest)}
                    </span>
                  )}
                </div>
              );
              })}
            </>
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

