import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEvents } from '../../lib/services/events.service';
import type { Event } from '../../types';
import './AdminPages.css';

/**
 * Events list page for admins.
 */
export function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setIsLoading(true);
    const response = await getEvents();
    if (response.error) {
      setError(response.error);
    } else {
      setEvents(response.data || []);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return <div className="admin-page loading">Loading events...</div>;
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Events</h1>
        <Link to="/admin/events/new" className="primary-button">
          Create Event
        </Link>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {events.length === 0 ? (
        <div className="empty-state">
          <p>No events yet. Create your first competition event.</p>
        </div>
      ) : (
        <div className="data-list">
          {events
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((event) => (
              <Link
                key={event.id}
                to={`/admin/events/${event.id}`}
                className="list-item"
              >
                <div className="item-main">
                  <h3>{event.name}</h3>
                  <p>{event.location || 'No location set'}</p>
                </div>
                <div className="item-meta">
                  <span className={`status-badge ${event.isActive ? 'active' : 'inactive'}`}>
                    {event.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="date">{new Date(event.date).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
