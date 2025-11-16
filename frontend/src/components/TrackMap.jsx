import React, { useRef, useEffect } from 'react';

function TrackMap({ trackData, driverPositions, drivers }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !trackData || !trackData.path) return;

    const svg = svgRef.current;
    const width = svg.clientWidth || 800;
    const height = svg.clientHeight || 600;
    
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
    const scale = Math.min(width / rangeX, height / rangeY) * 0.9;
    const offsetX = (width - (maxX - minX) * scale) / 2 - minX * scale;
    const offsetY = (height - (maxY - minY) * scale) / 2 - minY * scale;

    // Draw track path
    const pathElement = document.createElementNS(xmlns, 'path');
    let pathData = '';
    
    for (let i = 0; i < trackPath.length; i++) {
      const x = trackPath[i].x * scale + offsetX;
      const y = trackPath[i].y * scale + offsetY;
      if (i === 0) {
        pathData += `M ${x} ${y}`;
      } else {
        pathData += ` L ${x} ${y}`;
      }
    }
    
    pathElement.setAttribute('d', pathData);
    pathElement.setAttribute('stroke', '#333');
    pathElement.setAttribute('stroke-width', '3');
    pathElement.setAttribute('fill', 'none');
    pathElement.setAttribute('stroke-linecap', 'round');
    pathElement.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(pathElement);

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
          const normalizedX = (position.x - trackData.center.x) / trackData.scale;
          const normalizedY = (position.y - trackData.center.y) / trackData.scale;
          x = normalizedX * scale + offsetX;
          y = normalizedY * scale + offsetY;
        } else if (position.distance !== undefined && position.distance !== null) {
          // Fallback: use distance along track (simplified)
          // This is a rough approximation - ideally we'd map distance to track position
          const distance = position.distance;
          const trackLength = trackPath.length;
          const index = Math.floor((distance % trackLength) / trackLength * trackPath.length);
          const point = trackPath[Math.min(index, trackPath.length - 1)];
          x = point.x * scale + offsetX;
          y = point.y * scale + offsetY;
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
        circle.setAttribute('stroke', '#000');
        circle.setAttribute('stroke-width', '2');
        svg.appendChild(circle);

        // Draw driver number/name label
        const text = document.createElementNS(xmlns, 'text');
        text.setAttribute('x', x + 12);
        text.setAttribute('y', y);
        text.setAttribute('font-size', '12');
        text.setAttribute('fill', '#000');
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

