import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import type { Measurement } from '../types';

const formatTime = (value: string) => {
  const date = new Date(value);
  return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const TelemetryChart = ({ data }: { data: Measurement[] }) => {
  return (
    <div className="card" style={{ height: 320 }}>
      <h3>Realtime Telemetry</h3>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={[...data].reverse()}>
          <XAxis dataKey="ts" tickFormatter={formatTime} />
          <YAxis />
          <Tooltip labelFormatter={(value) => formatTime(value as string)} />
          <Legend />
          <Line type="monotone" dataKey="hr" stroke="#1c6e8c" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="spo2" stroke="#f37748" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="bodyTemp" stroke="#1f8a70" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="ambientTemp" stroke="#c44d58" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TelemetryChart;
