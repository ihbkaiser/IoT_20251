import { useEffect, useState } from 'react';
import api from '../api/client';
import DeviceTable from '../components/DeviceTable';
import type { Device, User } from '../types';

const Devices = ({ user }: { user: User }) => {
  const [devices, setDevices] = useState<Device[]>([]);

  const loadDevices = async () => {
    const { data } = await api.get<Device[]>('/devices');
    setDevices(data);
  };

  useEffect(() => {
    loadDevices();
  }, [user]);

  return (
    <div className="grid" style={{ gap: 24 }}>
      <section className="card">
        <h2>Devices</h2>
        <p style={{ color: 'var(--muted)' }}>Manage assigned devices and monitor status.</p>
      </section>
      <DeviceTable devices={devices} />
    </div>
  );
};

export default Devices;
