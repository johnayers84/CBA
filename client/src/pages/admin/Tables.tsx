import { useEffect, useState } from 'react';
import { get } from '../../lib/api';
import type { Table, Event } from '../../types';
import './AdminPages.css';

/**
 * Tables management page for admins.
 */
export function Tables() {
  const [tables, setTables] = useState<Table[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadTables(selectedEventId);
    }
  }, [selectedEventId]);

  const loadEvents = async () => {
    const response = await get<Event[]>('/events');
    if (response.data) {
      setEvents(response.data);
      const activeEvent = response.data.find(e => e.isActive);
      if (activeEvent) {
        setSelectedEventId(activeEvent.id);
      } else if (response.data.length > 0) {
        setSelectedEventId(response.data[0].id);
      }
    }
    setIsLoading(false);
  };

  const loadTables = async (eventId: string) => {
    setIsLoading(true);
    const response = await get<Table[]>(`/events/${eventId}/tables`);
    if (response.error) {
      setError(response.error);
    } else {
      setTables(response.data || []);
    }
    setIsLoading(false);
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Judge Tables</h1>
        <button className="primary-button">
          Add Table
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
        <div className="loading">Loading tables...</div>
      ) : tables.length === 0 ? (
        <div className="empty-state">
          <p>No tables configured for this event yet.</p>
        </div>
      ) : (
        <div className="data-list">
          {tables.map((table) => (
            <div key={table.id} className="list-item">
              <div className="item-main">
                <h3>Table {table.tableNumber}</h3>
                <p>{table.name || `Judge Table ${table.tableNumber}`}</p>
              </div>
              <div className="item-meta">
                <button className="secondary-button">
                  Print QR
                </button>
                <button className="secondary-button">
                  Manage Seats
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
