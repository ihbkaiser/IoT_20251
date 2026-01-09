import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import type { User } from '../types';

const Login = ({ onAuthSuccess }: { onAuthSuccess: (user: User) => void }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const switchMode = (next: typeof mode, options?: { preserveMessage?: boolean }) => {
    setMode(next);
    setError('');
    if (!options?.preserveMessage) {
      setMessage('');
    }
    setLoading(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'register') {
        await api.post('/auth/register', { email, password });
        const { data } = await api.post<{ token: string }>('/auth/login', { email, password });
        localStorage.setItem('token', data.token);
        const me = await api.get<User>('/auth/me');
        onAuthSuccess(me.data);
        navigate('/');
      } else if (mode === 'login') {
        const { data } = await api.post<{ token: string }>('/auth/login', { email, password });
        localStorage.setItem('token', data.token);
        const me = await api.get<User>('/auth/me');
        onAuthSuccess(me.data);
        navigate('/');
      } else if (mode === 'forgot') {
        const { data } = await api.post<{ message: string; resetToken?: string }>(
          '/auth/forgot-password',
          { email }
        );
        setMessage(data.message || 'If the email exists, a reset link has been sent.');
        if (data.resetToken) {
          setResetToken(data.resetToken);
          switchMode('reset', { preserveMessage: true });
        } else {
          switchMode('reset', { preserveMessage: true });
        }
      } else if (mode === 'reset') {
        if (!resetToken.trim()) {
          setError('Please enter the reset token from your email.');
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          return;
        }
        await api.post('/auth/reset-password', { token: resetToken.trim(), password });
        setMessage('Password reset successful. Please login.');
        switchMode('login', { preserveMessage: true });
      }
    } catch (err) {
      if (mode === 'forgot') {
        setMessage('If the email exists, a reset link has been sent.');
      } else if (mode === 'reset') {
        setError('Reset failed. The token may be invalid or expired.');
      } else {
        setError('Authentication failed. Please check your details.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <div className="container" style={{ maxWidth: 480 }}>
        <div className="card">
          <h2>
            {mode === 'login'
              ? 'Welcome back'
              : mode === 'register'
                ? 'Create account'
                : mode === 'forgot'
                  ? 'Reset your password'
                  : 'Set a new password'}
          </h2>
          <p style={{ color: 'var(--muted)' }}>
            {mode === 'login'
              ? 'Login to view realtime sensor health metrics.'
              : mode === 'register'
                ? 'Register to start tracking device telemetry.'
                : mode === 'forgot'
                  ? 'Enter your email and we will send a reset token.'
                  : 'Enter the token and your new password.'}
          </p>
          <form className="form" onSubmit={handleSubmit}>
            {mode === 'reset' ? (
              <>
                <input
                  type="text"
                  placeholder="Reset token"
                  value={resetToken}
                  onChange={(event) => setResetToken(event.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="New password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={6}
                />
              </>
            ) : (
              <>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                {mode !== 'forgot' && (
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={6}
                  />
                )}
              </>
            )}
            {error && <span style={{ color: 'var(--danger)' }}>{error}</span>}
            {message && <span style={{ color: 'var(--muted)' }}>{message}</span>}
            <button className="primary" type="submit" disabled={loading}>
              {loading
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Login'
                  : mode === 'register'
                    ? 'Register'
                    : mode === 'forgot'
                      ? 'Send reset token'
                      : 'Update password'}
            </button>
          </form>
          {mode === 'login' && (
            <>
              <button style={{ marginTop: 12 }} onClick={() => switchMode('register')}>
                Need an account? Register
              </button>
              <button style={{ marginTop: 8 }} onClick={() => switchMode('forgot')}>
                Forgot password?
              </button>
            </>
          )}
          {mode === 'register' && (
            <button style={{ marginTop: 12 }} onClick={() => switchMode('login')}>
              Already have an account? Login
            </button>
          )}
          {mode === 'forgot' && (
            <button style={{ marginTop: 12 }} onClick={() => switchMode('login')}>
              Back to login
            </button>
          )}
          {mode === 'reset' && (
            <button style={{ marginTop: 12 }} onClick={() => switchMode('login')}>
              Back to login
            </button>
          )}
        </div>
      </div>
    </main>
  );
};

export default Login;
