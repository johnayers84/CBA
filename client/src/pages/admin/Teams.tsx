import { useEffect, useState } from 'react';
import { get } from '../../lib/api';
import type { Team, Event } from '../../types';
import './AdminPages.css';

/**
 * Teams management page for admins.
 */
export function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadTeams(selectedEventId);
    }
  }, [selectedEventId]);

  const loadEvents = async () => {
    const response = await get<Event[]>('/events');
    if (response.data) {
      setEvents(response.data);
      // Auto-select first active event
      const activeEvent = response.data.find(e => e.isActive);
      if (activeEvent) {
        setSelectedEventId(activeEvent.id);
      } else if (response.data.length > 0) {
        setSelectedEventId(response.data[0].id);
      }
    }
    setIsLoading(false);
  };

  const loadTeams = async (eventId: string) => {
    setIsLoading(true);
    const response = await get<Team[]>(`/events/${eventId}/teams`);
    if (response.error) {
      setError(response.error);
    } else {
      setTeams(response.data || []);
    }
    setIsLoading(false);
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Teams</h1>
        <button className="primary-button">
          Register Team
        </button>
      </div>

      <div className="filter-bar">
        <div className="form-group">
          <label htmlFor="event">Event</label>
          <select
            id="event"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {isLoading ? (
        <div className="loading">Loading teams...</div>
      ) : teams.length === 0 ? (
        <div className="empty-state">
          <p>No teams registered for this event yet.</p>
        </div>
      ) : (
        <div className="data-list">
          {teams.map((team) => (
            <div key={team.id} className="list-item">
              <div className="item-main">
                <h3>#{team.teamNumber} - {team.name}</h3>
                <p>Registered {new Date(team.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="item-meta">
                <button className="secondary-button">
                  Print Barcode
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
