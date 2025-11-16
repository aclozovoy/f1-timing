import React, { useRef, useEffect, useState } from 'react';

function CircularTrackMap({ driverPositions, drivers, raceData }) {
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

  useEffect(() => {
    if (!svgRef.current || !driverPositions || !drivers) return;

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

    // Draw driver positions
    if (trackLength && trackLength > 0) {
      Object.keys(driverPositions).forEach((driverId) => {
        const position = driverPositions[driverId];
        const driver = drivers[driverId];
        
        if (!position || !driver) return;

        // Calculate progress through lap (0-1)
        let progress = 0;
        if (position.distance !== undefined && position.distance !== null) {
          // Use modulo to get position within current lap
          progress = (position.distance % trackLength) / trackLength;
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

        // Draw driver dot
        const circle = document.createElementNS(xmlns, 'circle');
        circle.setAttribute('cx', driverX);
        circle.setAttribute('cy', driverY);
        circle.setAttribute('r', '10');
        circle.setAttribute('fill', driver.color || '#808080');
        circle.setAttribute('stroke', '#fff');
        circle.setAttribute('stroke-width', '2');
        svg.appendChild(circle);

        // Draw driver number/name label
        const text = document.createElementNS(xmlns, 'text');
        const labelOffset = 15; // Reduced to ensure labels fit within viewBox
        text.setAttribute('x', driverX + (Math.cos(angleRad) * labelOffset));
        text.setAttribute('y', driverY + (Math.sin(angleRad) * labelOffset));
        text.setAttribute('font-size', '12');
        text.setAttribute('fill', '#fff');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('text-anchor', 'middle');
        text.textContent = driver.name || driverId;
        svg.appendChild(text);
      });
    }
  }, [driverPositions, drivers, trackLength]);

  return (
    <div className="circular-track-map-container">
      <svg ref={svgRef} className="circular-track-map" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
        {/* SVG content is generated dynamically */}
      </svg>
    </div>
  );
}

export default CircularTrackMap;

