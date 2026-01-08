import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { connectSocket } from '../socket/client';
import type { Device, Measurement, User } from '../types';
import MetricCards from '../components/MetricCards';
import TelemetryChart from '../components/TelemetryChart';

const Dashboard = ({ user }: { user: User }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [latest, setLatest] = useState<Measurement | null>(null);
  const [series, setSeries] = useState<Measurement[]>([]);

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
    if (!selectedDeviceId) return;

    const loadLatest = async () => {
      const { data } = await api.get<Measurement | null>(`/measurements/latest`, {
        params: { deviceId: selectedDeviceId }
      });
      setLatest(data);
    };

    const loadSeries = async () => {
      const from = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data } = await api.get<Measurement[]>(`/measurements`, {
        params: { deviceId: selectedDeviceId, from, limit: 120 }
      });
      setSeries(data);
    };

    loadLatest();
    loadSeries();
  }, [selectedDeviceId]);

  useEffect(() => {
    const socket = connectSocket();
    const handleTelemetry = (payload: { deviceId: string; measurement: Measurement }) => {
      if (payload.deviceId !== selectedDeviceId) return;
      setLatest(payload.measurement);
      setSeries((prev) => [payload.measurement, ...prev].slice(0, 120));
      setDevices((prev) =>
        prev.map((device) =>
          device.deviceId === payload.deviceId
            ? { ...device, isOnline: true, lastSeenAt: payload.measurement.ts }
            : device
        )
      );
    };

    socket.on('telemetry', handleTelemetry);
    return () => {
      socket.off('telemetry', handleTelemetry);
    };
  }, [selectedDeviceId]);

  return (
    <div className="grid" style={{ gap: 24 }}>
      <section className="card">
        <h2>Realtime Overview</h2>
        <p style={{ color: 'var(--muted)' }}>Stay on top of live vitals and device status.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <select value={selectedDeviceId} onChange={(event) => setSelectedDeviceId(event.target.value)}>
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.name}
              </option>
            ))}
          </select>
          {selectedDevice && (
            <span className={`badge ${selectedDevice.isOnline ? 'online' : 'offline'}`}>
              {selectedDevice.isOnline ? 'Online' : 'Offline'}
            </span>
          )}
        </div>
      </section>

      <MetricCards measurement={latest} />

      <TelemetryChart data={series} />
    </div>
  );
};

export default Dashboard;
