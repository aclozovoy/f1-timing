import React, { useRef, useEffect } from 'react';

function LapTimeScatterplot({ raceData, currentTimeIndex }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !raceData || !raceData.lap_times) return;

    const svg = svgRef.current;
    const viewBoxWidth = 1000;
    const viewBoxHeight = 400;
    const padding = { top: 40, right: 60, bottom: 50, left: 80 };
    const plotWidth = viewBoxWidth - padding.left - padding.right;
    const plotHeight = viewBoxHeight - padding.top - padding.bottom;

    // Clear previous content
    svg.innerHTML = '';

    // Create SVG namespace
    const xmlns = 'http://www.w3.org/2000/svg';

    // Get current lap number (leader's lap)
    let currentLap = 0;
    if (raceData.telemetry && raceData.telemetry.length > 0 && currentTimeIndex >= 0) {
      const currentEntry = raceData.telemetry[Math.floor(currentTimeIndex)];
      if (currentEntry && currentEntry.drivers) {
        Object.values(currentEntry.drivers).forEach((pos) => {
          if (pos.lap && pos.lap > currentLap) {
            currentLap = pos.lap;
          }
        });
      }
    }

    // Collect all completed lap times up to current lap
    const allLapTimes = [];
    Object.values(raceData.lap_times).forEach((lapTimes) => {
      Object.entries(lapTimes).forEach(([lapNum, lapTime]) => {
        const lap = parseInt(lapNum);
        if (lap <= currentLap) {
          allLapTimes.push(lapTime);
        }
      });
    });

    if (allLapTimes.length === 0) {
      // No lap times yet, show empty chart
      return;
    }

    // Calculate median lap time
    const sortedLapTimes = [...allLapTimes].sort((a, b) => a - b);
    const medianIndex = Math.floor(sortedLapTimes.length / 2);
    const medianLapTime = sortedLapTimes.length % 2 === 0
      ? (sortedLapTimes[medianIndex - 1] + sortedLapTimes[medianIndex]) / 2
      : sortedLapTimes[medianIndex];

    // Find fastest lap time
    const fastestLapTime = Math.min(...allLapTimes);

    // Set y-axis range: bottom = fastest lap, top = median + 5 seconds
    const yMin = fastestLapTime;
    const yMax = medianLapTime + 5;
    const yRange = yMax - yMin;

    // Get max lap number for x-axis
    const allLapNumbers = Object.values(raceData.lap_times).flatMap(lt => Object.keys(lt).map(Number));
    const maxLap = Math.max(currentLap, ...(allLapNumbers.length > 0 ? allLapNumbers : [1]));
    const maxLapForAxis = Math.max(maxLap, 1); // Ensure at least 1

    // Helper function to convert lap number to x coordinate
    const lapToX = (lap) => {
      if (maxLapForAxis === 1) {
        return padding.left + plotWidth / 2; // Center if only one lap
      }
      return padding.left + ((lap - 1) / (maxLapForAxis - 1)) * plotWidth;
    };

    // Helper function to convert lap time to y coordinate
    const timeToY = (time) => {
      return padding.top + plotHeight - ((time - yMin) / yRange) * plotHeight;
    };

    // Draw grid lines and axes
    // Y-axis grid lines (every 0.5 seconds for better granularity)
    const timeStep = 0.5;
    for (let time = Math.ceil(yMin / timeStep) * timeStep; time <= Math.floor(yMax / timeStep) * timeStep; time += timeStep) {
      const y = timeToY(time);
      const gridLine = document.createElementNS(xmlns, 'line');
      gridLine.setAttribute('x1', padding.left);
      gridLine.setAttribute('y1', y);
      gridLine.setAttribute('x2', padding.left + plotWidth);
      gridLine.setAttribute('y2', y);
      gridLine.setAttribute('stroke', '#333');
      gridLine.setAttribute('stroke-width', '1');
      gridLine.setAttribute('stroke-dasharray', '2,2');
      svg.appendChild(gridLine);

      // Y-axis label (show every 1 second, or at key points)
      if (Math.abs(time % 1) < 0.01 || time === yMin || time === yMax) {
        const label = document.createElementNS(xmlns, 'text');
        label.setAttribute('x', padding.left - 10);
        label.setAttribute('y', y);
        label.setAttribute('font-size', '12');
        label.setAttribute('fill', '#aaa');
        label.setAttribute('text-anchor', 'end');
        label.setAttribute('dominant-baseline', 'middle');
        label.textContent = time.toFixed(2);
        svg.appendChild(label);
      }
    }

    // X-axis grid lines and labels (every 5 laps, plus lap 1)
    // Label for lap 1
    const lap1X = lapToX(1);
    const lap1Label = document.createElementNS(xmlns, 'text');
    lap1Label.setAttribute('x', lap1X);
    lap1Label.setAttribute('y', padding.top + plotHeight + 20);
    lap1Label.setAttribute('font-size', '12');
    lap1Label.setAttribute('fill', '#aaa');
    lap1Label.setAttribute('text-anchor', 'middle');
    lap1Label.textContent = '1';
    svg.appendChild(lap1Label);

    // Grid lines and labels for every 5 laps
    for (let lap = 5; lap <= maxLapForAxis; lap += 5) {
      const x = lapToX(lap);
      const gridLine = document.createElementNS(xmlns, 'line');
      gridLine.setAttribute('x1', x);
      gridLine.setAttribute('y1', padding.top);
      gridLine.setAttribute('x2', x);
      gridLine.setAttribute('y2', padding.top + plotHeight);
      gridLine.setAttribute('stroke', '#333');
      gridLine.setAttribute('stroke-width', '1');
      gridLine.setAttribute('stroke-dasharray', '2,2');
      svg.appendChild(gridLine);

      // X-axis label
      const label = document.createElementNS(xmlns, 'text');
      label.setAttribute('x', x);
      label.setAttribute('y', padding.top + plotHeight + 20);
      label.setAttribute('font-size', '12');
      label.setAttribute('fill', '#aaa');
      label.setAttribute('text-anchor', 'middle');
      label.textContent = lap;
      svg.appendChild(label);
    }

    // Draw axes
    // Y-axis
    const yAxis = document.createElementNS(xmlns, 'line');
    yAxis.setAttribute('x1', padding.left);
    yAxis.setAttribute('y1', padding.top);
    yAxis.setAttribute('x2', padding.left);
    yAxis.setAttribute('y2', padding.top + plotHeight);
    yAxis.setAttribute('stroke', '#666');
    yAxis.setAttribute('stroke-width', '2');
    svg.appendChild(yAxis);

    // X-axis
    const xAxis = document.createElementNS(xmlns, 'line');
    xAxis.setAttribute('x1', padding.left);
    xAxis.setAttribute('y1', padding.top + plotHeight);
    xAxis.setAttribute('x2', padding.left + plotWidth);
    xAxis.setAttribute('y2', padding.top + plotHeight);
    xAxis.setAttribute('stroke', '#666');
    xAxis.setAttribute('stroke-width', '2');
    svg.appendChild(xAxis);

    // Axis labels
    // Y-axis label
    const yAxisLabel = document.createElementNS(xmlns, 'text');
    yAxisLabel.setAttribute('x', padding.left - 40);
    yAxisLabel.setAttribute('y', padding.top + plotHeight / 2);
    yAxisLabel.setAttribute('font-size', '14');
    yAxisLabel.setAttribute('fill', '#e0e0e0');
    yAxisLabel.setAttribute('text-anchor', 'middle');
    yAxisLabel.setAttribute('transform', `rotate(-90, ${padding.left - 40}, ${padding.top + plotHeight / 2})`);
    yAxisLabel.textContent = 'Lap Time (s)';
    svg.appendChild(yAxisLabel);

    // X-axis label
    const xAxisLabel = document.createElementNS(xmlns, 'text');
    xAxisLabel.setAttribute('x', padding.left + plotWidth / 2);
    xAxisLabel.setAttribute('y', viewBoxHeight - 10);
    xAxisLabel.setAttribute('font-size', '14');
    xAxisLabel.setAttribute('fill', '#e0e0e0');
    xAxisLabel.setAttribute('text-anchor', 'middle');
    xAxisLabel.textContent = 'Lap Number';
    svg.appendChild(xAxisLabel);

    // Draw median line
    const medianY = timeToY(medianLapTime);
    const medianLine = document.createElementNS(xmlns, 'line');
    medianLine.setAttribute('x1', padding.left);
    medianLine.setAttribute('y1', medianY);
    medianLine.setAttribute('x2', padding.left + plotWidth);
    medianLine.setAttribute('y2', medianY);
    medianLine.setAttribute('stroke', '#888');
    medianLine.setAttribute('stroke-width', '1');
    medianLine.setAttribute('stroke-dasharray', '4,4');
    svg.appendChild(medianLine);

    // Draw median label
    const medianLabel = document.createElementNS(xmlns, 'text');
    medianLabel.setAttribute('x', padding.left + plotWidth + 5);
    medianLabel.setAttribute('y', medianY);
    medianLabel.setAttribute('font-size', '11');
    medianLabel.setAttribute('fill', '#888');
    medianLabel.setAttribute('dominant-baseline', 'middle');
    medianLabel.textContent = `Median: ${medianLapTime.toFixed(3)}s`;
    svg.appendChild(medianLabel);

    // Plot all completed lap times
    Object.entries(raceData.lap_times).forEach(([driverId, lapTimes]) => {
      const driver = raceData.drivers[driverId];
      if (!driver) return;

      Object.entries(lapTimes).forEach(([lapNum, lapTime]) => {
        const lap = parseInt(lapNum);
        // Only plot laps up to current lap
        if (lap <= currentLap) {
          const x = lapToX(lap);
          const y = timeToY(lapTime);

          // Draw point
          const circle = document.createElementNS(xmlns, 'circle');
          circle.setAttribute('cx', x);
          circle.setAttribute('cy', y);
          circle.setAttribute('r', '4');
          circle.setAttribute('fill', driver.color || '#808080');
          circle.setAttribute('stroke', '#fff');
          circle.setAttribute('stroke-width', '1');
          circle.setAttribute('opacity', '0.8');
          svg.appendChild(circle);
        }
      });
    });

  }, [raceData, currentTimeIndex]);

  return (
    <div className="lap-time-scatterplot-container">
      <h3 className="scatterplot-title">Lap Times</h3>
      <svg ref={svgRef} className="lap-time-scatterplot" viewBox="0 0 1000 400" preserveAspectRatio="xMidYMid meet">
        {/* SVG content is generated dynamically */}
      </svg>
    </div>
  );
}

export default LapTimeScatterplot;

