import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import type { User } from '../types';

const Login = ({ onAuthSuccess }: { onAuthSuccess: (user: User) => void }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        await api.post('/auth/register', { email, password });
      }

      const { data } = await api.post<{ token: string }>('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      const me = await api.get<User>('/auth/me');
      onAuthSuccess(me.data);
      navigate('/');
    } catch (err) {
      setError('Authentication failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <div className="container" style={{ maxWidth: 480 }}>
        <div className="card">
          <h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
          <p style={{ color: 'var(--muted)' }}>
            {mode === 'login'
              ? 'Login to view realtime sensor health metrics.'
              : 'Register to start tracking device telemetry.'}
          </p>
          <form className="form" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
            {error && <span style={{ color: 'var(--danger)' }}>{error}</span>}
            <button className="primary" type="submit" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
            </button>
          </form>
          <button
            style={{ marginTop: 12 }}
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    </main>
  );
};

export default Login;
