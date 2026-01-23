import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getEvent } from '../../lib/services/events.service';
import { getTeams, createTeam, deleteTeam } from '../../lib/services/teams.service';
import type { Event, Team } from '../../types';
import './AdminPages.css';
import './EventTeams.css';

export function EventTeams() {
  const { id } = useParams<{ id: string }>();

  const [event, setEvent] = useState<Event | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setIsLoading(true);

    const [eventRes, teamsRes] = await Promise.all([
      getEvent(id),
      getTeams(id),
    ]);

    if (eventRes.data) setEvent(eventRes.data);
    if (teamsRes.data) setTeams(teamsRes.data);
    if (eventRes.error) setError(eventRes.error);

    setIsLoading(false);
  };

  const handleAddTeam = async (teamNumber: number, name: string) => {
    if (!id) return;
    const response = await createTeam(id, { teamNumber, name });
    if (response.data) {
      setTeams([...teams, response.data]);
      setShowAddModal(false);
    } else {
      setError(response.error || 'Failed to create team');
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Delete this team? This cannot be undone.')) return;
    const response = await deleteTeam(teamId);
    if (!response.error) {
      setTeams(teams.filter((t) => t.id !== teamId));
    }
  };

  const showBarcode = (team: Team) => {
    setSelectedTeam(team);
    setShowBarcodeModal(true);
  };

  if (isLoading) {
    return <div className="admin-page loading">Loading teams...</div>;
  }

  if (!event) {
    return (
      <div className="admin-page">
        <div className="error-banner">{error || 'Event not found'}</div>
        <Link to="/admin/events">Back to Events</Link>
      </div>
    );
  }

  return (
    <div className="admin-page event-teams">
      <Link to={`/admin/events/${id}`} className="back-link">
        ← Back to {event.name}
      </Link>

      <div className="page-header">
        <h1>Teams - {event.name}</h1>
        <button className="primary-button" onClick={() => setShowAddModal(true)}>
          Register Team
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {teams.length === 0 ? (
        <div className="empty-state">
          <p>No teams registered yet. Register your first team to get started.</p>
        </div>
      ) : (
        <div className="teams-list">
          {teams
            .sort((a, b) => a.teamNumber - b.teamNumber)
            .map((team) => (
              <div key={team.id} className="team-row">
                <div className="team-info">
                  <span className="team-number">#{team.teamNumber}</span>
                  <span className="team-name">{team.name}</span>
                </div>
                <div className="team-actions">
                  <button
                    className="secondary-button"
                    onClick={() => showBarcode(team)}
                  >
                    View Barcode
                  </button>
                  <button
                    className="danger-button small"
                    onClick={() => handleDeleteTeam(team.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      <div className="bulk-actions">
        <button className="secondary-button" onClick={() => window.print()}>
          Print All Barcodes
        </button>
      </div>

      {/* Add Team Modal */}
      {showAddModal && (
        <AddTeamModal
          existingNumbers={teams.map((t) => t.teamNumber)}
          onClose={() => setShowAddModal(false)}
          onSave={handleAddTeam}
        />
      )}

      {/* Barcode Modal */}
      {showBarcodeModal && selectedTeam && (
        <BarcodeModal
          team={selectedTeam}
          eventName={event.name}
          onClose={() => {
            setShowBarcodeModal(false);
            setSelectedTeam(null);
          }}
        />
      )}

      {/* Print-only section */}
      <div className="print-only">
        <h2>{event.name} - Team Barcodes</h2>
        <div className="barcode-grid">
          {teams
            .sort((a, b) => a.teamNumber - b.teamNumber)
            .map((team) => (
              <div key={team.id} className="barcode-card">
                <div className="barcode-number">#{team.teamNumber}</div>
                <div className="barcode-visual">
                  <BarcodeDisplay value={`TEAM-${team.teamNumber}`} />
                </div>
                <div className="barcode-label">{team.name}</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function AddTeamModal({
  existingNumbers,
  onClose,
  onSave,
}: {
  existingNumbers: number[];
  onClose: () => void;
  onSave: (teamNumber: number, name: string) => void;
}) {
  const nextNumber = Math.max(0, ...existingNumbers) + 1;
  const [teamNumber, setTeamNumber] = useState(nextNumber);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (existingNumbers.includes(teamNumber)) {
      setError('Team number already exists');
      return;
    }
    if (!name.trim()) {
      setError('Team name is required');
      return;
    }
    onSave(teamNumber, name.trim());
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Register Team</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-banner">{error}</div>}

          <div className="form-group">
            <label htmlFor="teamNumber">Team Number</label>
            <input
              type="number"
              id="teamNumber"
              value={teamNumber}
              onChange={(e) => setTeamNumber(Number(e.target.value))}
              min="1"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="name">Team Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Smokin' Joes"
              autoFocus
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button">
              Register Team
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BarcodeModal({
  team,
  eventName,
  onClose,
}: {
  team: Team;
  eventName: string;
  onClose: () => void;
}) {
  const printBarcode = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Team ${team.teamNumber} Barcode</title>
          <style>
            body {
              font-family: system-ui, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
            }
            .card {
              text-align: center;
              padding: 2rem;
              border: 2px solid #000;
              border-radius: 8px;
            }
            .event-name { font-size: 0.875rem; color: #666; margin-bottom: 0.5rem; }
            .team-number { font-size: 2rem; font-weight: bold; margin-bottom: 1rem; }
            .barcode { font-family: 'Libre Barcode 128', monospace; font-size: 4rem; margin: 1rem 0; }
            .team-name { font-size: 1.25rem; margin-top: 0.5rem; }
          </style>
          <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap" rel="stylesheet">
        </head>
        <body>
          <div class="card">
            <div class="event-name">${eventName}</div>
            <div class="team-number">Team #${team.teamNumber}</div>
            <div class="barcode">TEAM-${team.teamNumber}</div>
            <div class="team-name">${team.name}</div>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content barcode-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Team #{team.teamNumber}</h2>

        <div className="barcode-preview">
          <div className="barcode-large">
            <BarcodeDisplay value={`TEAM-${team.teamNumber}`} />
          </div>
          <p className="team-name-large">{team.name}</p>
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Close
          </button>
          <button type="button" className="primary-button" onClick={printBarcode}>
            Print Barcode
          </button>
        </div>
      </div>
    </div>
  );
}

function BarcodeDisplay({ value }: { value: string }) {
  // Simple CSS-based barcode representation using a web font
  // In production, you'd use a proper barcode library like JsBarcode
  return (
    <div className="barcode-text" style={{ fontFamily: "'Libre Barcode 128', monospace", fontSize: '3rem' }}>
      {value}
    </div>
  );
}
