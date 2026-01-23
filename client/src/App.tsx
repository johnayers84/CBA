import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { ScanQR } from './pages/ScanQR';
import { JudgeDashboard } from './pages/JudgeDashboard';
import { AdminLogin, Events, Teams, Tables, Results } from './pages/admin';
import { useAuthStore } from './stores/authStore';
import { useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';

// Register service worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});

/**
 * Protected route wrapper for admin pages.
 */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, isAuthenticated } = useAuthStore();

  if (!isAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!isAdmin()) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/**
 * Protected route wrapper for judge pages.
 */
function JudgeRoute({ children }: { children: React.ReactNode }) {
  const { isJudge, isAuthenticated, judgeContext } = useAuthStore();

  if (!isAuthenticated() || !isJudge() || !judgeContext) {
    return <Navigate to="/scan" replace />;
  }

  return <>{children}</>;
}

/**
 * Main App component with routing.
 */
function App() {
  // Sync auth token on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      useAuthStore.getState().setToken(token);
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Public routes */}
          <Route index element={<Home />} />
          <Route path="scan" element={<ScanQR />} />

          {/* Judge routes */}
          <Route
            path="judge"
            element={
              <JudgeRoute>
                <JudgeDashboard />
              </JudgeRoute>
            }
          />

          {/* Admin routes */}
          <Route path="admin">
            <Route path="login" element={<AdminLogin />} />
            <Route
              path="events"
              element={
                <AdminRoute>
                  <Events />
                </AdminRoute>
              }
            />
            <Route
              path="teams"
              element={
                <AdminRoute>
                  <Teams />
                </AdminRoute>
              }
            />
            <Route
              path="tables"
              element={
                <AdminRoute>
                  <Tables />
                </AdminRoute>
              }
            />
            <Route
              path="results"
              element={
                <AdminRoute>
                  <Results />
                </AdminRoute>
              }
            />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
