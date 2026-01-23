import { Outlet, Link, useNavigate } from 'react-router-dom';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { useAuthStore } from '../stores/authStore';
import './Layout.css';

/**
 * Main application layout with header and navigation.
 */
export function Layout() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, isJudge, logout, judgeContext } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-content">
          <Link to="/" className="logo">
            <h1>CBA</h1>
            <span className="logo-subtitle">BBQ Competition</span>
          </Link>

          <nav className="nav-links">
            {isAdmin() && (
              <>
                <Link to="/admin/events">Events</Link>
                <Link to="/admin/teams">Teams</Link>
                <Link to="/admin/tables">Tables</Link>
              </>
            )}
            {isJudge() && judgeContext && (
              <Link to="/judge">Scoring</Link>
            )}
          </nav>

          <div className="header-right">
            <SyncStatusIndicator />
            {isAuthenticated() ? (
              <button className="logout-button" onClick={handleLogout}>
                Logout
              </button>
            ) : (
              <Link to="/scan" className="scan-link">
                Scan QR
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        <p>CBA BBQ Competition App</p>
      </footer>
    </div>
  );
}
