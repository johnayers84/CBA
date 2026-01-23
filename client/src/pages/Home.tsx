import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import './Home.css';

/**
 * Home page - entry point for judges and admins.
 */
export function Home() {
  const { isAuthenticated, isJudge, isAdmin, judgeContext } = useAuthStore();

  return (
    <div className="home-page">
      <div className="home-hero">
        <h1>BBQ Competition Judging</h1>
        <p>Score submissions quickly and reliably, even offline.</p>
      </div>

      <div className="home-actions">
        {!isAuthenticated() && (
          <>
            <Link to="/scan" className="action-card primary">
              <div className="action-icon">📱</div>
              <h2>Scan Table QR</h2>
              <p>Judges: Scan your table QR code to start scoring</p>
            </Link>

            <Link to="/admin/login" className="action-card">
              <div className="action-icon">🔐</div>
              <h2>Admin Login</h2>
              <p>Event operators: Sign in to manage the competition</p>
            </Link>
          </>
        )}

        {isJudge() && judgeContext && (
          <Link to="/judge" className="action-card primary">
            <div className="action-icon">📋</div>
            <h2>Continue Judging</h2>
            <p>
              Table {judgeContext.tableNumber}, Seat {judgeContext.seatNumber}
            </p>
          </Link>
        )}

        {isAdmin() && (
          <>
            <Link to="/admin/events" className="action-card primary">
              <div className="action-icon">📅</div>
              <h2>Manage Events</h2>
              <p>Create and configure competition events</p>
            </Link>

            <Link to="/admin/teams" className="action-card">
              <div className="action-icon">👥</div>
              <h2>Teams</h2>
              <p>Register teams and print barcodes</p>
            </Link>

            <Link to="/admin/tables" className="action-card">
              <div className="action-icon">🪑</div>
              <h2>Judge Tables</h2>
              <p>Configure tables and generate QR codes</p>
            </Link>

            <Link to="/admin/results" className="action-card">
              <div className="action-icon">🏆</div>
              <h2>Results</h2>
              <p>View scores and rankings</p>
            </Link>
          </>
        )}
      </div>

      <div className="home-features">
        <h2>Features</h2>
        <ul>
          <li>
            <strong>Offline Support:</strong> Score submissions even without internet.
            Data syncs automatically when reconnected.
          </li>
          <li>
            <strong>Fast Scanning:</strong> QR codes for quick judge authentication
            and team turn-in verification.
          </li>
          <li>
            <strong>Live Results:</strong> Real-time score aggregation with
            configurable weighting and trimmed means.
          </li>
        </ul>
      </div>
    </div>
  );
}
