import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, NavLink } from 'react-router-dom';
import api from './api/client';
import type { User } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Devices from './pages/Devices';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';

const RequireAuth = ({ user, children }: { user: User | null; children: JSX.Element }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : undefined);

const Layout = ({ user, onLogout }: { user: User; onLogout: () => void }) => {
  return (
    <div>
      <header className="navbar">
        <h1>Health IoT Monitor</h1>
        <nav className="nav-links">
          <NavLink to="/" end className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/history" className={linkClass}>
            History
          </NavLink>
          <NavLink to="/devices" className={linkClass}>
            Devices
          </NavLink>
          <NavLink to="/alerts" className={linkClass}>
            Alerts
          </NavLink>
          <NavLink to="/settings" className={linkClass}>
            Settings
          </NavLink>
          <button onClick={onLogout}>Logout</button>
        </nav>
      </header>
      <main>
        <div className="container">{user && <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/history" element={<History user={user} />} />
          <Route path="/devices" element={<Devices user={user} />} />
          <Route path="/alerts" element={<Alerts user={user} />} />
          <Route path="/settings" element={<Settings user={user} />} />
        </Routes>}</div>
      </main>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get<User>('/auth/me');
      setUser(data);
    } catch (error) {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return <div className="container" style={{ padding: '32px' }}>Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login onAuthSuccess={setUser} />} />
      <Route
        path="/*"
        element={
          <RequireAuth user={user}>
            <Layout user={user!} onLogout={handleLogout} />
          </RequireAuth>
        }
      />
    </Routes>
  );
};

export default App;
