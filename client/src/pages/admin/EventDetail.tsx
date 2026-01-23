import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getEvent, updateEvent, deleteEvent } from '../../lib/services/events.service';
import { getCategories, createCategory, deleteCategory } from '../../lib/services/categories.service';
import { getCriteria, createCriterion, deleteCriterion } from '../../lib/services/criteria.service';
import { getTeams } from '../../lib/services/teams.service';
import { getTables } from '../../lib/services/tables.service';
import type { Event, Category, Criterion, Team, Table, ScoringPhase } from '../../types';
import './AdminPages.css';
import './EventDetail.css';

export function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [activeTab, setActiveTab] = useState<'categories' | 'teams' | 'tables'>('categories');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCriterionModal, setShowCriterionModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadEventData();
    }
  }, [id]);

  const loadEventData = async () => {
    if (!id) return;
    setIsLoading(true);

    const [eventRes, catRes, critRes, teamRes, tableRes] = await Promise.all([
      getEvent(id),
      getCategories(id),
      getCriteria(id),
      getTeams(id),
      getTables(id),
    ]);

    if (eventRes.data) setEvent(eventRes.data);
    if (catRes.data) setCategories(catRes.data);
    if (critRes.data) setCriteria(critRes.data);
    if (teamRes.data) setTeams(teamRes.data);
    if (tableRes.data) setTables(tableRes.data);

    if (eventRes.error) setError(eventRes.error);
    setIsLoading(false);
  };

  const handleToggleActive = async () => {
    if (!event || !id) return;
    const response = await updateEvent(id, { isActive: !event.isActive });
    if (response.data) {
      setEvent(response.data);
    }
  };

  const handleDeleteEvent = async () => {
    if (!id || !confirm('Are you sure you want to delete this event?')) return;
    const response = await deleteEvent(id);
    if (!response.error) {
      navigate('/admin/events');
    }
  };

  const handleAddCategory = async (name: string, weight: number) => {
    if (!id) return;
    const response = await createCategory(id, {
      name,
      weight,
      displayOrder: categories.length + 1,
    });
    if (response.data) {
      setCategories([...categories, response.data]);
      setShowCategoryModal(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Delete this category and all its criteria?')) return;
    const response = await deleteCategory(categoryId);
    if (!response.error) {
      setCategories(categories.filter((c) => c.id !== categoryId));
      setCriteria(criteria.filter((c) => c.categoryId !== categoryId));
    }
  };

  const handleAddCriterion = async (
    name: string,
    phase: ScoringPhase,
    weight: number,
    description?: string
  ) => {
    if (!id || !selectedCategoryId) return;
    const categoryeCriteria = criteria.filter((c) => c.categoryId === selectedCategoryId);
    const response = await createCriterion(id, {
      categoryId: selectedCategoryId,
      name,
      phase,
      weight,
      description,
      displayOrder: categoryeCriteria.length + 1,
    });
    if (response.data) {
      setCriteria([...criteria, response.data]);
      setShowCriterionModal(false);
    }
  };

  const handleDeleteCriterion = async (criterionId: string) => {
    if (!confirm('Delete this criterion?')) return;
    const response = await deleteCriterion(criterionId);
    if (!response.error) {
      setCriteria(criteria.filter((c) => c.id !== criterionId));
    }
  };

  if (isLoading) {
    return <div className="admin-page loading">Loading event...</div>;
  }

  if (!event) {
    return (
      <div className="admin-page">
        <div className="error-banner">{error || 'Event not found'}</div>
        <Link to="/admin/events">← Back to Events</Link>
      </div>
    );
  }

  return (
    <div className="admin-page event-detail">
      <Link to="/admin/events" className="back-link">
        ← Back to Events
      </Link>

      <div className="event-header">
        <div className="event-title">
          <h1>{event.name}</h1>
          <span className={`status-badge ${event.isActive ? 'active' : 'inactive'}`}>
            {event.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="event-actions">
          <Link to={`/admin/events/${id}/submissions`} className="primary-button">
            Manage Turn-Ins
          </Link>
          <button onClick={handleToggleActive} className="secondary-button">
            {event.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button onClick={handleDeleteEvent} className="danger-button">
            Delete
          </button>
        </div>
      </div>

      <div className="event-info-grid">
        <div className="info-item">
          <label>Date</label>
          <span>{new Date(event.date).toLocaleDateString()}</span>
        </div>
        <div className="info-item">
          <label>Location</label>
          <span>{event.location || 'Not set'}</span>
        </div>
        <div className="info-item">
          <label>Scoring</label>
          <span>{event.scoringScaleMin}-{event.scoringScaleMax} (step {event.scoringScaleStep})</span>
        </div>
        <div className="info-item">
          <label>Aggregation</label>
          <span>{event.aggregationMethod === 'trimmed_mean' ? 'Trimmed Mean' : 'Mean'}</span>
        </div>
      </div>

      <div className="event-stats">
        <div className="stat-card">
          <span className="stat-value">{categories.length}</span>
          <span className="stat-label">Categories</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{teams.length}</span>
          <span className="stat-label">Teams</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{tables.length}</span>
          <span className="stat-label">Tables</span>
        </div>
      </div>

      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          Categories & Criteria
        </button>
        <button
          className={`tab-button ${activeTab === 'teams' ? 'active' : ''}`}
          onClick={() => setActiveTab('teams')}
        >
          Teams ({teams.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'tables' ? 'active' : ''}`}
          onClick={() => setActiveTab('tables')}
        >
          Tables ({tables.length})
        </button>
      </div>

      {activeTab === 'categories' && (
        <div className="tab-content">
          <div className="section-header">
            <h2>Categories & Criteria</h2>
            <button className="primary-button" onClick={() => setShowCategoryModal(true)}>
              Add Category
            </button>
          </div>

          {categories.length === 0 ? (
            <div className="empty-state">
              <p>No categories yet. Add your first category to define judging criteria.</p>
            </div>
          ) : (
            <div className="categories-list">
              {categories
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((category) => {
                  const categoryCriteria = criteria.filter((c) => c.categoryId === category.id);
                  return (
                    <div key={category.id} className="category-item">
                      <div className="category-header">
                        <div>
                          <h3>{category.name}</h3>
                          <span className="category-meta">
                            Weight: {category.weight} | Order: #{category.displayOrder}
                          </span>
                        </div>
                        <div className="category-actions">
                          <button
                            className="small-button"
                            onClick={() => {
                              setSelectedCategoryId(category.id);
                              setShowCriterionModal(true);
                            }}
                          >
                            + Criterion
                          </button>
                          <button
                            className="small-button danger"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {categoryCriteria.length > 0 && (
                        <div className="criteria-table">
                          <div className="criteria-header">
                            <span>Name</span>
                            <span>Phase</span>
                            <span>Weight</span>
                            <span></span>
                          </div>
                          {categoryCriteria
                            .sort((a, b) => a.displayOrder - b.displayOrder)
                            .map((crit) => (
                              <div key={crit.id} className="criteria-row">
                                <span>{crit.name}</span>
                                <span className="phase-tag">
                                  {crit.phase === 'appearance' ? 'Appearance' : 'Taste/Texture'}
                                </span>
                                <span>{crit.weight}</span>
                                <button
                                  className="icon-button danger"
                                  onClick={() => handleDeleteCriterion(crit.id)}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'teams' && (
        <div className="tab-content">
          <div className="section-header">
            <h2>Teams</h2>
            <Link to={`/admin/events/${id}/teams`} className="primary-button">
              Manage Teams
            </Link>
          </div>

          {teams.length === 0 ? (
            <div className="empty-state">
              <p>No teams registered yet.</p>
            </div>
          ) : (
            <div className="teams-grid">
              {teams.map((team) => (
                <div key={team.id} className="team-card">
                  <span className="team-number">#{team.teamNumber}</span>
                  <span className="team-name">{team.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'tables' && (
        <div className="tab-content">
          <div className="section-header">
            <h2>Judge Tables</h2>
            <Link to={`/admin/events/${id}/tables`} className="primary-button">
              Manage Tables
            </Link>
          </div>

          {tables.length === 0 ? (
            <div className="empty-state">
              <p>No tables configured yet.</p>
            </div>
          ) : (
            <div className="tables-grid">
              {tables.map((table) => (
                <div key={table.id} className="table-card">
                  <span className="table-number">Table {table.tableNumber}</span>
                  <span className="table-name">{table.name || ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Category Modal */}
      {showCategoryModal && (
        <CategoryModal
          onClose={() => setShowCategoryModal(false)}
          onSave={handleAddCategory}
        />
      )}

      {/* Add Criterion Modal */}
      {showCriterionModal && (
        <CriterionModal
          onClose={() => {
            setShowCriterionModal(false);
            setSelectedCategoryId(null);
          }}
          onSave={handleAddCriterion}
        />
      )}
    </div>
  );
}

function CategoryModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (name: string, weight: number) => void;
}) {
  const [name, setName] = useState('');
  const [weight, setWeight] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), weight);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Add Category</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Category Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Brisket"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Weight</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              min="0.1"
              step="0.1"
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={!name.trim()}>
              Add Category
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CriterionModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (name: string, phase: ScoringPhase, weight: number, description?: string) => void;
}) {
  const [name, setName] = useState('');
  const [phase, setPhase] = useState<ScoringPhase>('appearance');
  const [weight, setWeight] = useState(1);
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), phase, weight, description.trim() || undefined);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Add Criterion</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Criterion Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Appearance"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Phase</label>
            <select value={phase} onChange={(e) => setPhase(e.target.value as ScoringPhase)}>
              <option value="appearance">Appearance</option>
              <option value="taste_texture">Taste & Texture</option>
            </select>
          </div>
          <div className="form-group">
            <label>Weight</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              min="0.1"
              step="0.1"
            />
          </div>
          <div className="form-group">
            <label>Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what judges should look for"
              rows={2}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={!name.trim()}>
              Add Criterion
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
