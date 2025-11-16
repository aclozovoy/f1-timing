import React, { useRef, useEffect, useState } from 'react';

function CircularTrackMap({ driverPositions, drivers, raceData, top3DriverIds = [], currentTimeIndex = 0 }) {
  const svgRef = useRef(null);
  const [trackLength, setTrackLength] = useState(null);

  // Get track length from race data (preferred) or estimate from distance data
  useEffect(() => {
    if (!raceData) return;
    
    // First, try to use track_length from backend if available
    if (raceData.track_length && raceData.track_length > 0) {
      setTrackLength(raceData.track_length);
      return;
    }
    
    // Fallback: estimate from distance data
    if (!raceData.telemetry) return;
    
    // Collect all distances
    const distances = [];
    raceData.telemetry.forEach(entry => {
      if (entry.drivers) {
        Object.values(entry.drivers).forEach(driver => {
          if (driver.distance !== null && driver.distance !== undefined && driver.distance > 0) {
            distances.push(driver.distance);
          }
        });
      }
    });
    
    if (distances.length === 0) return;
    
    // Estimate track length from distance patterns
    // In FastF1, Distance is cumulative, so we need to find the lap length
    // by looking at when drivers complete laps
    const maxDist = Math.max(...distances);
    const minDist = Math.min(...distances);
    
    // If distances are reasonable (under 10km), might be per-lap distance
    // Otherwise, they're cumulative and we need to find the lap length
    let estimatedLength = maxDist;
    
    if (maxDist > 10000) {
      // Distances are cumulative - estimate lap length
      // Look for common distance values in the first lap range (2-8km)
      const sortedDistances = [...new Set(distances)].sort((a, b) => a - b);
      const firstLapRange = sortedDistances.filter(d => d > 2000 && d < 8000);
      
      if (firstLapRange.length > 0) {
        // Use the maximum distance in the first lap range as track length
        estimatedLength = firstLapRange[firstLapRange.length - 1];
      } else {
        // Fallback: assume typical F1 track length (~5km)
        estimatedLength = 5000;
      }
    }
    
    if (estimatedLength > 0) {
      setTrackLength(estimatedLength);
    }
  }, [raceData]);

  // Helper function to parse time string (H:MM:SS) to seconds
  const parseTimeToSeconds = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  };

  // Find the fastest lap (driver ID and lap number)
  const getFastestLapInfo = () => {
    if (!raceData || !raceData.lap_times) return null;
    
    let fastestTime = null;
    let fastestDriverId = null;
    let fastestLapNum = null;
    
    Object.entries(raceData.lap_times).forEach(([driverId, lapTimes]) => {
      Object.entries(lapTimes).forEach(([lapNum, lapTime]) => {
        if (fastestTime === null || lapTime < fastestTime) {
          fastestTime = lapTime;
          fastestDriverId = driverId;
          fastestLapNum = parseInt(lapNum);
        }
      });
    });
    
    if (fastestDriverId && fastestLapNum) {
      return {
        driverId: fastestDriverId,
        lapNum: fastestLapNum,
        lapTime: fastestTime
      };
    }
    
    return null;
  };

  // Extract telemetry for a specific driver and lap, create distance-to-time-percentage mapping
  const createDistanceToTimeMapping = (driverId, lapNum, trackLength) => {
    if (!raceData || !raceData.telemetry || !trackLength || trackLength <= 0) return null;
    
    const lapTelemetry = [];
    let lapStartIndex = -1;
    let lapEndIndex = -1;
    
    // Find all telemetry entries for this driver on this lap
    for (let i = 0; i < raceData.telemetry.length; i++) {
      const entry = raceData.telemetry[i];
      if (!entry || !entry.drivers || !entry.drivers[driverId]) continue;
      
      const driverPos = entry.drivers[driverId];
      if (driverPos.lap === lapNum) {
        if (lapStartIndex === -1) {
          lapStartIndex = i;
        }
        lapEndIndex = i;
        
        // Store distance within lap and time
        const distance = driverPos.distance || 0;
        const distanceInLap = distance % trackLength;
        lapTelemetry.push({
          distance: distanceInLap,
          time: entry.time,
          index: i
        });
      }
    }
    
    if (lapTelemetry.length === 0 || lapStartIndex === -1) return null;
    
    // Get start and end times for this lap
    const startTime = parseTimeToSeconds(raceData.telemetry[lapStartIndex].time);
    const endTime = parseTimeToSeconds(raceData.telemetry[lapEndIndex].time);
    const lapDuration = endTime - startTime;
    
    if (lapDuration <= 0) return null;
    
    // Create mapping: distance -> time percentage (0-1)
    // Sort by distance to ensure proper ordering
    lapTelemetry.sort((a, b) => a.distance - b.distance);
    
    const distanceToTimeMap = new Map();
    lapTelemetry.forEach((entry) => {
      const entryTime = parseTimeToSeconds(entry.time);
      const timeElapsed = entryTime - startTime;
      const timePercentage = timeElapsed / lapDuration;
      distanceToTimeMap.set(entry.distance, timePercentage);
    });
    
    return {
      map: distanceToTimeMap,
      minDistance: lapTelemetry[0]?.distance || 0,
      maxDistance: lapTelemetry[lapTelemetry.length - 1]?.distance || trackLength
    };
  };

  // Get time percentage for a given distance using the mapping
  const getTimePercentageForDistance = (distance, mapping, trackLength) => {
    if (!mapping || !trackLength || distance === null || distance === undefined) return 0;
    
    const distanceInLap = distance % trackLength;
    
    // Find closest distance in the mapping
    let closestDistance = null;
    let minDiff = Infinity;
    
    mapping.map.forEach((timePct, mapDistance) => {
      const diff = Math.abs(mapDistance - distanceInLap);
      if (diff < minDiff) {
        minDiff = diff;
        closestDistance = mapDistance;
      }
    });
    
    if (closestDistance !== null) {
      return mapping.map.get(closestDistance);
    }
    
    // Fallback: linear interpolation if we have min/max
    if (mapping.minDistance !== undefined && mapping.maxDistance !== undefined) {
      // Normalize distance to 0-1 range
      const normalizedDist = (distanceInLap - mapping.minDistance) / (mapping.maxDistance - mapping.minDistance);
      return Math.max(0, Math.min(1, normalizedDist));
    }
    
    return 0;
  };

  useEffect(() => {
    if (!svgRef.current || !driverPositions || !drivers || !raceData) return;

    const svg = svgRef.current;
    // Use viewBox dimensions for consistent sizing
    const viewBoxWidth = 400;
    const viewBoxHeight = 400;
    const centerX = viewBoxWidth / 2;
    const centerY = viewBoxHeight / 2;
    // Reduce radius to account for labels and markers (was 0.35, now 0.25 to leave room)
    const radius = Math.min(viewBoxWidth, viewBoxHeight) * 0.25; // Track circle radius
    
    // Clear previous content
    svg.innerHTML = '';

    // Create SVG namespace
    const xmlns = 'http://www.w3.org/2000/svg';

    // Get fastest lap info and create distance-to-time mapping
    const fastestLapInfo = getFastestLapInfo();
    if (!fastestLapInfo) {
      // Fallback: can't calculate without fastest lap
      return;
    }

    // Create distance-to-time percentage mapping from fastest lap telemetry
    const distanceMapping = createDistanceToTimeMapping(
      fastestLapInfo.driverId,
      fastestLapInfo.lapNum,
      trackLength
    );
    
    if (!distanceMapping) {
      // Fallback: can't create mapping
      return;
    }

    // Draw outer track circle
    const trackCircle = document.createElementNS(xmlns, 'circle');
    trackCircle.setAttribute('cx', centerX);
    trackCircle.setAttribute('cy', centerY);
    trackCircle.setAttribute('r', radius);
    trackCircle.setAttribute('stroke', '#888');
    trackCircle.setAttribute('stroke-width', '4');
    trackCircle.setAttribute('fill', 'none');
    svg.appendChild(trackCircle);

    // Draw start/finish line at 12 o'clock
    const startFinishLength = radius * 0.15;
    const startFinishLine = document.createElementNS(xmlns, 'line');
    startFinishLine.setAttribute('x1', centerX);
    startFinishLine.setAttribute('y1', centerY - radius);
    startFinishLine.setAttribute('x2', centerX);
    startFinishLine.setAttribute('y2', centerY - radius - startFinishLength);
    startFinishLine.setAttribute('stroke', '#FF0000');
    startFinishLine.setAttribute('stroke-width', '3');
    svg.appendChild(startFinishLine);

    // Draw quarter markers (3, 6, 9 o'clock positions)
    const markerLength = radius * 0.1;
    const positions = [
      { angle: 0, label: '25%' },   // 3 o'clock
      { angle: 90, label: '50%' },  // 6 o'clock
      { angle: 180, label: '75%' } // 9 o'clock
    ];

    positions.forEach(({ angle, label }) => {
      const rad = (angle * Math.PI) / 180;
      const x1 = centerX + Math.cos(rad) * radius;
      const y1 = centerY + Math.sin(rad) * radius;
      const x2 = centerX + Math.cos(rad) * (radius + markerLength);
      const y2 = centerY + Math.sin(rad) * (radius + markerLength);

      const marker = document.createElementNS(xmlns, 'line');
      marker.setAttribute('x1', x1);
      marker.setAttribute('y1', y1);
      marker.setAttribute('x2', x2);
      marker.setAttribute('y2', y2);
      marker.setAttribute('stroke', '#aaa');
      marker.setAttribute('stroke-width', '2');
      svg.appendChild(marker);

      // Add label
      const labelText = document.createElementNS(xmlns, 'text');
      labelText.setAttribute('x', x2 + (Math.cos(rad) * 15));
      labelText.setAttribute('y', y2 + (Math.sin(rad) * 15));
      labelText.setAttribute('font-size', '12');
      labelText.setAttribute('fill', '#aaa');
      labelText.setAttribute('text-anchor', 'middle');
      labelText.textContent = label;
      svg.appendChild(labelText);
    });

    // Draw driver positions using distance-to-time mapping from fastest lap
    if (distanceMapping) {
      Object.keys(driverPositions).forEach((driverId) => {
        const position = driverPositions[driverId];
        const driver = drivers[driverId];
        
        if (!position || !driver) return;

        // Determine if this driver is in top 3 and get their position
        const top3Index = top3DriverIds.indexOf(driverId);
        const isTop3 = top3Index !== -1;
        
        // Get medal colors: gold (1st), silver (2nd), bronze (3rd)
        let outlineColor = '#fff';
        let textColor = '#fff';
        if (isTop3) {
          if (top3Index === 0) {
            outlineColor = '#FFD700'; // Gold
            textColor = '#FFD700';
          } else if (top3Index === 1) {
            outlineColor = '#C0C0C0'; // Silver
            textColor = '#C0C0C0';
          } else if (top3Index === 2) {
            outlineColor = '#CD7F32'; // Bronze
            textColor = '#CD7F32';
          }
        }

        // Calculate progress through lap based on distance-to-time mapping from fastest lap
        // A driver at a given location will always be the same percentage through the lap
        // regardless of their individual lap performance
        let progress = 0;
        const driverDistance = position.distance;
        
        if (driverDistance !== null && driverDistance !== undefined && trackLength > 0) {
          // Use the fastest lap's distance-to-time mapping to get time percentage
          progress = getTimePercentageForDistance(driverDistance, distanceMapping, trackLength);
        } else {
          // Skip if no distance data
          return;
        }

        // Convert progress to angle
        // 0% (start/finish) = 12 o'clock = -90 degrees
        // 25% = 3 o'clock = 0 degrees
        // 50% = 6 o'clock = 90 degrees
        // 75% = 9 o'clock = 180 degrees
        // Formula: angle = (progress * 360) - 90
        const angle = (progress * 360) - 90;
        const angleRad = (angle * Math.PI) / 180;

        // Calculate position on circle
        const driverX = centerX + Math.cos(angleRad) * radius;
        const driverY = centerY + Math.sin(angleRad) * radius;

        // Draw driver dot (team color fill, medal color outline for top 3)
        const circle = document.createElementNS(xmlns, 'circle');
        circle.setAttribute('cx', driverX);
        circle.setAttribute('cy', driverY);
        circle.setAttribute('r', '10');
        circle.setAttribute('fill', driver.color || '#808080');
        circle.setAttribute('stroke', outlineColor);
        circle.setAttribute('stroke-width', isTop3 ? '3' : '2');
        svg.appendChild(circle);

        // Draw driver name abbreviation (use first 3 letters or initials)
        const driverName = driver.name || driverId;
        const nameAbbr = driverName.length > 3 
          ? driverName.split(' ').map(n => n[0]).join('').substring(0, 3)
          : driverName.substring(0, 3);
        
        const text = document.createElementNS(xmlns, 'text');
        const labelOffset = 15; // Reduced to ensure labels fit within viewBox
        text.setAttribute('x', driverX + (Math.cos(angleRad) * labelOffset));
        text.setAttribute('y', driverY + (Math.sin(angleRad) * labelOffset));
        text.setAttribute('font-size', '12');
        text.setAttribute('fill', textColor);
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('text-anchor', 'middle');
        text.textContent = nameAbbr.toUpperCase();
        svg.appendChild(text);
      });
    }
  }, [driverPositions, drivers, raceData, top3DriverIds, currentTimeIndex, trackLength]);

  return (
    <div className="circular-track-map-container">
      <svg ref={svgRef} className="circular-track-map" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
        {/* SVG content is generated dynamically */}
      </svg>
    </div>
  );
}

export default CircularTrackMap;

