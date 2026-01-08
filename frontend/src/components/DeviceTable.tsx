import type { Device } from '../types';

const DeviceTable = ({ devices, onSelect }: { devices: Device[]; onSelect?: (device: Device) => void }) => {
  return (
    <div className="card">
      <h3>Devices</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Device ID</th>
            <th>Name</th>
            <th>Status</th>
            <th>Last Seen</th>
            {onSelect && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => (
            <tr key={device.deviceId}>
              <td>{device.deviceId}</td>
              <td>{device.name}</td>
              <td>
                <span className={`badge ${device.isOnline ? 'online' : 'offline'}`}>
                  {device.isOnline ? 'Online' : 'Offline'}
                </span>
              </td>
              <td>{device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : '--'}</td>
              {onSelect && (
                <td>
                  <button onClick={() => onSelect(device)}>Select</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DeviceTable;
