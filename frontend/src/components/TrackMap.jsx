import React, { useRef, useEffect } from 'react';

function TrackMap({ trackData, driverPositions, drivers }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !trackData || !trackData.path) return;

    const svg = svgRef.current;
    // Use viewBox dimensions for consistent sizing
    const viewBoxWidth = 800;
    const viewBoxHeight = 600;
    
    // Clear previous content
    svg.innerHTML = '';

    // Create SVG namespace
    const xmlns = 'http://www.w3.org/2000/svg';

    // Scale and center track coordinates
    const trackPath = trackData.path;
    if (trackPath.length === 0) return;

    // Find bounds of normalized coordinates
    const xCoords = trackPath.map(p => p.x);
    const yCoords = trackPath.map(p => p.y);
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    // Use viewBox dimensions and add padding (0.85 instead of 0.9 for better fit)
    const scale = Math.min(viewBoxWidth / rangeX, viewBoxHeight / rangeY) * 0.85;
    // Center the track in the viewBox
    // Calculate center of the track bounds in normalized coordinates
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    // Offset to center the track: map the track center to the viewBox center
    // Since we invert coordinates: x = -normalizedX * scale + offset
    // We want: -centerX * scale + offsetX = viewBoxWidth / 2
    // So: offsetX = viewBoxWidth / 2 + centerX * scale
    const offsetX = viewBoxWidth / 2 + centerX * scale;
    const offsetY = viewBoxHeight / 2 + centerY * scale;

    // Draw track path - close the loop by connecting last point to first
    const pathElement = document.createElementNS(xmlns, 'path');
    let pathData = '';
    
    for (let i = 0; i < trackPath.length; i++) {
      // Invert both X and Y to match the correct orientation
      // X needs to be inverted (like in the plot script)
      // Y needs to be inverted because SVG Y increases downward
      const x = -trackPath[i].x * scale + offsetX;
      const y = -trackPath[i].y * scale + offsetY;
      if (i === 0) {
        pathData += `M ${x} ${y}`;
      } else {
        pathData += ` L ${x} ${y}`;
      }
    }
    
    // Close the loop by connecting last point to first
    if (trackPath.length > 0) {
      const firstX = -trackPath[0].x * scale + offsetX;
      const firstY = -trackPath[0].y * scale + offsetY;
      pathData += ` Z`;
    }
    
    pathElement.setAttribute('d', pathData);
    pathElement.setAttribute('stroke', '#888');
    pathElement.setAttribute('stroke-width', '3');
    pathElement.setAttribute('fill', 'none');
    pathElement.setAttribute('stroke-linecap', 'round');
    pathElement.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(pathElement);

    // Draw start/finish line marker
    if (trackPath.length > 0) {
      const startX = -trackPath[0].x * scale + offsetX;
      const startY = -trackPath[0].y * scale + offsetY;
      
      // Calculate track direction at start/finish point
      // Use both the direction from last point to first (closing the loop)
      // and from first to second point, then average for better accuracy
      let trackDirX = 0, trackDirY = 0;
      
      if (trackPath.length > 1) {
        // Direction from first point to second point (forward direction)
        const forwardX = trackPath[1].x - trackPath[0].x;
        const forwardY = trackPath[1].y - trackPath[0].y;
        
        // Direction from last point to first point (backward direction, closing loop)
        const lastIdx = trackPath.length - 1;
        const backwardX = trackPath[0].x - trackPath[lastIdx].x;
        const backwardY = trackPath[0].y - trackPath[lastIdx].y;
        
        // Average the two directions to get the track direction at start/finish
        trackDirX = (forwardX + backwardX) / 2;
        trackDirY = (forwardY + backwardY) / 2;
        
        // Normalize the direction vector
        const dirLen = Math.sqrt(trackDirX * trackDirX + trackDirY * trackDirY);
        if (dirLen > 0) {
          trackDirX /= dirLen;
          trackDirY /= dirLen;
        }
      }
      
      // If we couldn't determine direction, use a default
      if (trackDirX === 0 && trackDirY === 0) {
        trackDirX = 1;
        trackDirY = 0;
      }
      
      // Calculate perpendicular direction (rotate 90 degrees counterclockwise)
      // For a vector (x, y), the perpendicular is (-y, x)
      const perpX = -trackDirY;
      const perpY = trackDirX;
      
      // Draw the start/finish line perpendicular to the track
      const startFinishLine = document.createElementNS(xmlns, 'line');
      const lineLength = 25; // Length of the line on each side
      startFinishLine.setAttribute('x1', startX - perpX * lineLength);
      startFinishLine.setAttribute('y1', startY - perpY * lineLength);
      startFinishLine.setAttribute('x2', startX + perpX * lineLength);
      startFinishLine.setAttribute('y2', startY + perpY * lineLength);
      startFinishLine.setAttribute('stroke', '#FF0000');
      startFinishLine.setAttribute('stroke-width', '4');
      startFinishLine.setAttribute('stroke-linecap', 'round');
      svg.appendChild(startFinishLine);
      
      // Add a circle marker at start/finish
      const startMarker = document.createElementNS(xmlns, 'circle');
      startMarker.setAttribute('cx', startX);
      startMarker.setAttribute('cy', startY);
      startMarker.setAttribute('r', '6');
      startMarker.setAttribute('fill', '#FF0000');
      startMarker.setAttribute('stroke', '#fff');
      startMarker.setAttribute('stroke-width', '2');
      svg.appendChild(startMarker);
    }

    // Draw sector markers if available
    if (trackData.sectors && trackData.sectors.track_length) {
      const trackLength = trackData.sectors.track_length;
      const sector2Start = trackData.sectors.sector2_start;
      const sector3Start = trackData.sectors.sector3_start;
      
      // Find positions for sector markers by approximating distance along track
      // We'll use a simple approach: assume points are evenly distributed
      const sector2Index = Math.floor((sector2Start / trackLength) * trackPath.length);
      const sector3Index = Math.floor((sector3Start / trackLength) * trackPath.length);
      
      // Draw sector 2 marker
      if (sector2Index < trackPath.length && sector2Index > 0) {
        const sector2X = -trackPath[sector2Index].x * scale + offsetX;
        const sector2Y = -trackPath[sector2Index].y * scale + offsetY;
        
        const sector2Marker = document.createElementNS(xmlns, 'circle');
        sector2Marker.setAttribute('cx', sector2X);
        sector2Marker.setAttribute('cy', sector2Y);
        sector2Marker.setAttribute('r', '5');
        sector2Marker.setAttribute('fill', '#00FF00');
        sector2Marker.setAttribute('stroke', '#fff');
        sector2Marker.setAttribute('stroke-width', '2');
        svg.appendChild(sector2Marker);
        
        // Add label
        const sector2Label = document.createElementNS(xmlns, 'text');
        sector2Label.setAttribute('x', sector2X + 10);
        sector2Label.setAttribute('y', sector2Y);
        sector2Label.setAttribute('font-size', '12');
        sector2Label.setAttribute('fill', '#00FF00');
        sector2Label.setAttribute('font-weight', 'bold');
        sector2Label.textContent = 'S2';
        svg.appendChild(sector2Label);
      }
      
      // Draw sector 3 marker
      if (sector3Index < trackPath.length && sector3Index > 0) {
        const sector3X = -trackPath[sector3Index].x * scale + offsetX;
        const sector3Y = -trackPath[sector3Index].y * scale + offsetY;
        
        const sector3Marker = document.createElementNS(xmlns, 'circle');
        sector3Marker.setAttribute('cx', sector3X);
        sector3Marker.setAttribute('cy', sector3Y);
        sector3Marker.setAttribute('r', '5');
        sector3Marker.setAttribute('fill', '#00FF00');
        sector3Marker.setAttribute('stroke', '#fff');
        sector3Marker.setAttribute('stroke-width', '2');
        svg.appendChild(sector3Marker);
        
        // Add label
        const sector3Label = document.createElementNS(xmlns, 'text');
        sector3Label.setAttribute('x', sector3X + 10);
        sector3Label.setAttribute('y', sector3Y);
        sector3Label.setAttribute('font-size', '12');
        sector3Label.setAttribute('fill', '#00FF00');
        sector3Label.setAttribute('font-weight', 'bold');
        sector3Label.textContent = 'S3';
        svg.appendChild(sector3Label);
      }
    }

    // Draw driver positions
    if (driverPositions && drivers) {
      Object.keys(driverPositions).forEach((driverId) => {
        const position = driverPositions[driverId];
        const driver = drivers[driverId];
        
        if (!position || !driver) return;

        // Map driver position to track coordinates
        // Use X/Y directly if available, otherwise use distance along track
        let x, y;
        
        if (position.x !== undefined && position.x !== null && 
            position.y !== undefined && position.y !== null &&
            trackData.center && trackData.scale) {
          // Use actual coordinates, normalize them using track data
          // Normalize coordinates (backend already inverted X during normalization)
          const normalizedX = -(position.x - trackData.center.x) / trackData.scale;
          const normalizedY = (position.y - trackData.center.y) / trackData.scale;
          // Invert both X and Y to match track path orientation
          x = -normalizedX * scale + offsetX;
          y = -normalizedY * scale + offsetY;
        } else if (position.distance !== undefined && position.distance !== null) {
          // Fallback: use distance along track (simplified)
          // This is a rough approximation - ideally we'd map distance to track position
          const distance = position.distance;
          const trackLength = trackPath.length;
          const index = Math.floor((distance % trackLength) / trackLength * trackPath.length);
          const point = trackPath[Math.min(index, trackPath.length - 1)];
          // Invert both X and Y to match track path orientation
          x = -point.x * scale + offsetX;
          y = -point.y * scale + offsetY;
        } else {
          // Skip if no valid position data
          return;
        }

        // Draw driver dot
        const circle = document.createElementNS(xmlns, 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', '8');
        circle.setAttribute('fill', driver.color || '#808080');
        circle.setAttribute('stroke', '#fff');
        circle.setAttribute('stroke-width', '2');
        svg.appendChild(circle);

        // Draw driver number/name label
        const text = document.createElementNS(xmlns, 'text');
        text.setAttribute('x', x + 12);
        text.setAttribute('y', y);
        text.setAttribute('font-size', '12');
        text.setAttribute('fill', '#fff');
        text.setAttribute('font-weight', 'bold');
        text.textContent = driver.name || driverId;
        svg.appendChild(text);
      });
    }
  }, [trackData, driverPositions, drivers]);

  return (
    <div className="track-map-container">
      <svg ref={svgRef} className="track-map" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
        {/* SVG content is generated dynamically */}
      </svg>
    </div>
  );
}

export default TrackMap;

