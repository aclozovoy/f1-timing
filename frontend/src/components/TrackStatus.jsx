import React from 'react';

function TrackStatus({ raceData, currentTime }) {
  const parseTimeToSeconds = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  };

  const normalizeStatusText = (statusMessage, statusCode) => {
    const message = (statusMessage || statusCode || '').toLowerCase();
    
    // Safety Car variations
    if (message.includes('scdeployed') || 
        message.includes('safety car deployed') ||
        (message.includes('sc') && !message.includes('vsc'))) {
      return 'Safety Car';
    }
    
    // Virtual Safety Car
    if (message.includes('vscdeployed') || 
        message.includes('virtual safety car') ||
        message.includes('vsc')) {
      return 'Virtual Safety Car';
    }
    
    // Red Flag
    if (message.includes('red') || message.includes('suspended')) {
      return 'Red Flag';
    }
    
    // Yellow Flag
    if (message.includes('yellow')) {
      return 'Yellow Flag';
    }
    
    // Green / All Clear
    if (message.includes('green') || 
        message.includes('all clear') ||
        message.includes('clear') ||
        message === '') {
      return 'Green';
    }
    
    // Return original if no match, but capitalize first letter
    const original = statusMessage || statusCode || 'Green';
    return original.charAt(0).toUpperCase() + original.slice(1).toLowerCase();
  };

  const getStatusColor = (statusMessage, statusCode) => {
    const message = (statusMessage || statusCode || '').toLowerCase();
    
    // Red flags
    if (message.includes('red') || message.includes('suspended')) {
      return 'red';
    }
    
    // Yellow flags / Safety Car / VSC
    if (message.includes('yellow') || 
        message.includes('safety car') || 
        message.includes('sc') ||
        message.includes('vsc') ||
        message.includes('virtual')) {
      return 'yellow';
    }
    
    // Green / All Clear
    if (message.includes('green') || 
        message.includes('all clear') ||
        message.includes('clear') ||
        message === '') {
      return 'green';
    }
    
    // Default to green if unknown
    return 'green';
  };

  if (!raceData || !currentTime) {
    return null;
  }

  const hasTrackStatus = raceData.track_status && Array.isArray(raceData.track_status) && raceData.track_status.length > 0;
  const hasRaceControl = raceData.race_control_messages && Array.isArray(raceData.race_control_messages) && raceData.race_control_messages.length > 0;
  
  if (!hasTrackStatus && !hasRaceControl) {
    return null;
  }

  // Find current track status (most recent status before or at current time)
  const currentStatus = hasTrackStatus ? raceData.track_status
    .filter(status => status.time <= currentTime)
    .sort((a, b) => {
      // Sort by time descending
      const timeA = parseTimeToSeconds(a.time);
      const timeB = parseTimeToSeconds(b.time);
      return timeB - timeA;
    })[0] : null;

  // Get recent race control messages (within last 30 seconds)
  const recentMessages = hasRaceControl ? raceData.race_control_messages
    .filter(msg => {
      const msgTime = parseTimeToSeconds(msg.time);
      const currTime = parseTimeToSeconds(currentTime);
      return msgTime <= currTime && (currTime - msgTime) <= 30;
    })
    .sort((a, b) => {
      const timeA = parseTimeToSeconds(a.time);
      const timeB = parseTimeToSeconds(b.time);
      return timeB - timeA;
    })
    .slice(0, 3) : []; // Show up to 3 most recent messages

  const statusColor = currentStatus ? getStatusColor(currentStatus.message, currentStatus.status) : 'green';
  const statusText = currentStatus ? normalizeStatusText(currentStatus.message, currentStatus.status) : 'Green';

  return (
    <div className="track-status-container">
      <h3 className="track-status-title">Track Status & Race Control</h3>
      <div className="track-status-box">
        <div className={`current-status status-${statusColor}`}>
          <div className="status-label">Current Status:</div>
          <div className="status-value">{statusText}</div>
          {currentStatus && <div className="status-time">{currentStatus.time}</div>}
        </div>
        
        {recentMessages.length > 0 && (
          <div className="race-control-messages">
            <div className="messages-label">Recent Messages:</div>
            {recentMessages.map((msg, idx) => (
              <div key={idx} className="control-message">
                <span className="message-time">{msg.time}</span>
                {msg.category && <span className="message-category">{msg.category}:</span>}
                <span className="message-text">{msg.message}</span>
              </div>
            ))}
          </div>
        )}
        
        {!currentStatus && recentMessages.length === 0 && (
          <div className="status-message">No status updates at this time</div>
        )}
      </div>
    </div>
  );
}

export default TrackStatus;

