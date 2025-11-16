import React from 'react';

function PlaybackControls({
  isPlaying,
  playbackSpeed,
  currentTime,
  totalTime,
  onPlayPause,
  onFastForward,
  onRewind,
  onSeek
}) {
  const formatTime = (timeStr) => {
    if (!timeStr) return '00:00:00';
    try {
      // Parse time string (format: "0 days 00:01:23.456789")
      const parts = timeStr.split(' ');
      if (parts.length > 1) {
        const timePart = parts[parts.length - 1];
        const [hours, minutes, seconds] = timePart.split(':');
        return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${Math.floor(parseFloat(seconds)).toString().padStart(2, '0')}`;
      }
      return timeStr;
    } catch (e) {
      return '00:00:00';
    }
  };

  const getProgress = () => {
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
      const parts = timeStr.split(' ');
      if (parts.length > 1) {
        const timePart = parts[parts.length - 1];
        const [hours, minutes, seconds] = timePart.split(':');
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

