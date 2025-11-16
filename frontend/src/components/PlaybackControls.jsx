import React from 'react';

function PlaybackControls({
  isPlaying,
  playbackSpeed,
  currentTime,
  totalTime,
  currentIndex,
  totalLength,
  onPlayPause,
  onFastForward,
  onRewind,
  onSeek
}) {
  const formatTime = (timeStr) => {
    if (!timeStr) return '00:00:00';
    try {
      // New format: Simple H:MM:SS (e.g., "0:00:00", "1:23:45")
      // Also handle old formats for backward compatibility
      
      // Remove "day," or "days" if present (old format)
      let cleanStr = timeStr.replace(/^\d+\s+day(s)?,\s*/, '');
      
      // Check if it's the pandas format with "days" (old format)
      const parts = cleanStr.split(' ');
      let timePart;
      if (parts.length > 1 && parts[0].match(/^\d+$/)) {
        // Format: "0 days 00:01:23.456789" (old format)
        timePart = parts[parts.length - 1];
      } else {
        // Format: "0:00:00" or "1:01:01" (new format or old timedelta)
        timePart = cleanStr;
      }
      
      const [hours, minutes, seconds] = timePart.split(':');
      if (hours && minutes && seconds) {
        // Pad hours to 2 digits, ensure minutes and seconds are 2 digits
        const h = hours.padStart(2, '0');
        const m = minutes.padStart(2, '0');
        const s = Math.floor(parseFloat(seconds)).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
      }
      return timeStr;
    } catch (e) {
      return '00:00:00';
    }
  };

  const getProgress = () => {
    // Use index-based calculation for more reliable progress
    if (totalLength && totalLength > 0 && currentIndex !== undefined && currentIndex !== null) {
      return (currentIndex / totalLength) * 100;
    }
    // Fallback to time-based calculation
    if (!currentTime || !totalTime) return 0;
    try {
      const current = parseTimeString(currentTime);
      const total = parseTimeString(totalTime);
      return total > 0 ? (current / total) * 100 : 0;
    } catch (e) {
      return 0;
    }
  };

  const parseTimeString = (timeStr) => {
    try {
      if (!timeStr) return 0;
      
      // New format: Simple H:MM:SS (e.g., "0:00:00", "1:23:45")
      // Also handle old formats for backward compatibility
      
      // Remove "day," or "days" if present (old format)
      let cleanStr = timeStr.replace(/^\d+\s+day(s)?,\s*/, '');
      
      // Check if it's the pandas format with "days" (old format)
      const parts = cleanStr.split(' ');
      let timePart;
      if (parts.length > 1 && parts[0].match(/^\d+$/)) {
        // Format: "0 days 00:01:23.456789" (old format)
        timePart = parts[parts.length - 1];
      } else {
        // Format: "0:00:00" or "1:01:01" (new format or old timedelta)
        timePart = cleanStr;
      }
      
      const [hours, minutes, seconds] = timePart.split(':');
      if (hours && minutes && seconds) {
        return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
      }
      return 0;
    } catch (e) {
      return 0;
    }
  };

  return (
    <div className="playback-controls">
      <div className="controls-row">
        <button onClick={onRewind} className="control-btn" title="Rewind">
          ⏪
        </button>
        <button onClick={onPlayPause} className="control-btn play-pause" title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button onClick={onFastForward} className="control-btn" title="Fast Forward">
          ⏩
        </button>
        <div className="speed-indicator">
          {playbackSpeed}x
        </div>
      </div>
      
      <div className="time-display">
        <span>{formatTime(currentTime)}</span>
        <span className="time-separator">/</span>
        <span>{formatTime(totalTime)}</span>
      </div>

      <div className="timeline-container">
        <input
          type="range"
          min="0"
          max="100"
          value={getProgress()}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="timeline-slider"
        />
      </div>
    </div>
  );
}

export default PlaybackControls;

