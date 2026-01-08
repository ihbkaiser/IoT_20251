import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import type { Device, Measurement, User } from '../types';
import TelemetryChart from '../components/TelemetryChart';

const History = ({ user }: { user: User }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<Measurement[]>([]);

  const selectedDevice = useMemo(
    () => devices.find((device) => device.deviceId === selectedDeviceId),
    [devices, selectedDeviceId]
  );

  useEffect(() => {
    const loadDevices = async () => {
      const { data } = await api.get<Device[]>('/devices');
      setDevices(data);
      if (data.length > 0) {
        setSelectedDeviceId((prev) => prev || data[0].deviceId);
      }
    };
    loadDevices();
  }, [user]);

  useEffect(() => {
    const now = new Date();
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    setFrom(hourAgo.toISOString().slice(0, 16));
    setTo(now.toISOString().slice(0, 16));
  }, []);

  const fetchHistory = async () => {
    if (!selectedDeviceId || !from || !to) return;
    const { data } = await api.get<Measurement[]>('/measurements', {
      params: {
        deviceId: selectedDeviceId,
        from: new Date(from).toISOString(),
        to: new Date(to).toISOString(),
        limit: 500
      }
    });
    setData(data);
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedDeviceId, from, to]);

  return (
    <div className="grid" style={{ gap: 24 }}>
      <section className="card">
        <h2>History Explorer</h2>
        <p style={{ color: 'var(--muted)' }}>Review trends across your chosen time range.</p>
        <div className="grid grid-2">
          <label>
            Device
            <select value={selectedDeviceId} onChange={(event) => setSelectedDeviceId(event.target.value)}>
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <div>
              {selectedDevice ? (
                <span className={`badge ${selectedDevice.isOnline ? 'online' : 'offline'}`}>
                  {selectedDevice.isOnline ? 'Online' : 'Offline'}
                </span>
              ) : (
                '--'
              )}
            </div>
          </label>
          <label>
            From
            <input type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label>
            To
            <input type="datetime-local" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
        </div>
        <button className="primary" style={{ marginTop: 12 }} onClick={fetchHistory}>
          Fetch History
        </button>
      </section>

      <TelemetryChart data={data} />

      <div className="card">
        <h3>Measurements</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>HR</th>
              <th>SpO2</th>
              <th>Body Temp</th>
              <th>Ambient</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row._id || row.ts}>
                <td>{new Date(row.ts).toLocaleString()}</td>
                <td>{row.hr ?? '--'}</td>
                <td>{row.spo2 ?? '--'}</td>
                <td>{row.bodyTemp ?? '--'}</td>
                <td>{row.ambientTemp ?? '--'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default History;
