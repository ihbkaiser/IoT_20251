import type { User } from '../types';

const Settings = ({ user }: { user: User }) => {
  return (
    <div className="grid" style={{ gap: 24 }}>
      <section className="card">
        <h2>Settings</h2>
        <p style={{ color: 'var(--muted)' }}>Manage your profile and session.</p>
      </section>
      <div className="card">
        <h3>User Profile</h3>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        <p>
          <strong>Role:</strong> {user.role}
        </p>
      </div>
    </div>
  );
};

export default Settings;
