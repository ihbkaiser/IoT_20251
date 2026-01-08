import { useEffect, useState } from 'react';
import api from '../api/client';
import AlertRuleForm from '../components/AlertRuleForm';
import type { AlertEvent, AlertRule, User } from '../types';
import { connectSocket } from '../socket/client';

const Alerts = ({ user }: { user: User }) => {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);

  const loadRules = async () => {
    const { data } = await api.get<AlertRule[]>('/alerts/rules');
    setRules(data);
  };

  const loadEvents = async () => {
    const { data } = await api.get<AlertEvent[]>('/alerts/events');
    setEvents(data);
  };

  useEffect(() => {
    loadRules();
    loadEvents();
  }, [user]);

  useEffect(() => {
    const socket = connectSocket();
    const handleAlert = (payload: { event: AlertEvent }) => {
      setEvents((prev) => [payload.event, ...prev]);
    };
    socket.on('alert', handleAlert);
    return () => {
      socket.off('alert', handleAlert);
    };
  }, []);

  const handleCreate = async (rule: AlertRule) => {
    const { data } = await api.post<AlertRule>('/alerts/rules', rule);
    setRules((prev) => [data, ...prev]);
  };

  const handleAck = async (id: string) => {
    const { data } = await api.patch<AlertEvent>(`/alerts/events/${id}/ack`);
    setEvents((prev) => prev.map((event) => (event._id === id ? data : event)));
  };

  return (
    <div className="grid" style={{ gap: 24 }}>
      <section className="card">
        <h2>Alert Center</h2>
        <p style={{ color: 'var(--muted)' }}>Define thresholds and acknowledge alert events.</p>
      </section>

      <AlertRuleForm onSubmit={handleCreate} />

      <div className="card">
        <h3>Active Rules</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Device</th>
              <th>Metric</th>
              <th>Operator</th>
              <th>Threshold</th>
              <th>Duration</th>
              <th>Cooldown</th>
              <th>Enabled</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule._id}>
                <td>{rule.deviceId || 'All'}</td>
                <td>{rule.metric}</td>
                <td>{rule.operator}</td>
                <td>{rule.threshold}</td>
                <td>{rule.durationSec}s</td>
                <td>{rule.cooldownSec}s</td>
                <td>{rule.enabled ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Alert Events</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Device</th>
              <th>Metric</th>
              <th>Value</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event._id}>
                <td>{new Date(event.ts).toLocaleString()}</td>
                <td>{event.deviceId}</td>
                <td>{event.metric}</td>
                <td>
                  {event.value} (threshold {event.threshold})
                </td>
                <td>{event.acknowledged ? 'Ack' : 'New'}</td>
                <td>
                  {!event.acknowledged && event._id && (
                    <button onClick={() => handleAck(event._id!)}>Acknowledge</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Alerts;
