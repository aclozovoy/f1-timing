import React from 'react';

function RaceSelector({ races, selectedRace, onRaceChange, loading }) {
  return (
    <div className="race-selector">
      <label htmlFor="race-select">Select Race: </label>
      <select
        id="race-select"
        value={selectedRace ? `${selectedRace.year}-${selectedRace.gp}` : ''}
        onChange={(e) => {
          if (e.target.value) {
            const [year, gp] = e.target.value.split('-');
            const race = races.find(r => r.year === parseInt(year) && r.gp === gp);
            onRaceChange(race);
          }
        }}
        disabled={loading || races.length === 0}
      >
        <option value="">-- Select a race --</option>
        {races.map((race) => (
          <option key={`${race.year}-${race.gp}`} value={`${race.year}-${race.gp}`}>
            {race.name} ({race.year})
          </option>
        ))}
      </select>
    </div>
  );
}

export default RaceSelector;

