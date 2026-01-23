import { useNetworkStatus } from '../hooks/useNetworkStatus';
import './SyncStatusIndicator.css';

/**
 * Displays network status and pending sync count.
 */
export function SyncStatusIndicator() {
  const { isOnline, pendingCount, isSyncing, sync } = useNetworkStatus();

  return (
    <div className={`sync-status ${isOnline ? 'online' : 'offline'}`}>
      <div className="sync-status-indicator">
        <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
        <span className="status-text">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {pendingCount > 0 && (
        <div className="pending-count">
          <span className="pending-badge">{pendingCount}</span>
          <span className="pending-text">pending</span>
          {isOnline && !isSyncing && (
            <button
              className="sync-button"
              onClick={sync}
              title="Sync now"
            >
              Sync
            </button>
          )}
          {isSyncing && (
            <span className="syncing-indicator">Syncing...</span>
          )}
        </div>
      )}
    </div>
  );
}
