import { useEffect, useState } from 'react';
import { get } from '../../lib/api';
import type { EventResults, Event } from '../../types';
import './AdminPages.css';
import './Results.css';

/**
 * Results page for admins to view scores and rankings.
 */
export function Results() {
  const [results, setResults] = useState<EventResults | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadResults(selectedEventId);
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

  const loadResults = async (eventId: string) => {
    setIsLoading(true);
    setError('');
    const response = await get<EventResults>(`/events/${eventId}/results`);
    if (response.error) {
      setError(response.error);
      setResults(null);
    } else {
      setResults(response.data || null);
    }
    setIsLoading(false);
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Results</h1>
        <button className="primary-button">
          Export Results
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
        <div className="loading">Loading results...</div>
      ) : !results ? (
        <div className="empty-state">
          <p>No results available yet.</p>
        </div>
      ) : (
        <div className="results-container">
          {/* Overall Rankings */}
          <section className="results-section">
            <h2>Overall Rankings</h2>
            <div className="rankings-table">
              <div className="table-header">
                <span className="col-rank">Rank</span>
                <span className="col-team">Team</span>
                <span className="col-score">Total Score</span>
                <span className="col-ranksum">Rank Sum</span>
              </div>
              {results.overallRankings.map((team) => (
                <div
                  key={team.teamId}
                  className={`table-row ${team.rank <= 3 ? `rank-${team.rank}` : ''}`}
                >
                  <span className="col-rank">
                    {team.rank <= 3 ? (
                      <span className="rank-badge">{team.rank}</span>
                    ) : (
                      team.rank
                    )}
                  </span>
                  <span className="col-team">
                    <strong>#{team.teamNumber}</strong> {team.teamName}
                  </span>
                  <span className="col-score">{team.totalScore.toFixed(2)}</span>
                  <span className="col-ranksum">{team.rankSum}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Category Results */}
          {results.categoryResults.map((category) => (
            <section key={category.categoryId} className="results-section">
              <h2>{category.categoryName}</h2>
              <div className="rankings-table">
                <div className="table-header">
                  <span className="col-rank">Rank</span>
                  <span className="col-team">Team</span>
                  <span className="col-score">Score</span>
                  <span className="col-status">Status</span>
                </div>
                {category.results.map((result) => (
                  <div
                    key={result.submissionId}
                    className={`table-row ${result.rank <= 3 ? `rank-${result.rank}` : ''}`}
                  >
                    <span className="col-rank">{result.rank}</span>
                    <span className="col-team">
                      <strong>#{result.teamNumber}</strong> {result.teamName}
                    </span>
                    <span className="col-score">{result.finalScore.toFixed(2)}</span>
                    <span className="col-status">
                      <span className={`status-dot ${result.completionStatus}`} />
                      {result.completionStatus}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
