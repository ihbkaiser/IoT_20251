import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import type { MeasurementSession } from '../types';

const formatTime = (value: string) => {
  const date = new Date(value);
  return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const MeasurementSessionChart = ({ sessions }: { sessions: MeasurementSession[] }) => {
  const chartData = [...sessions].reverse();

  return (
    <div className="card" style={{ height: 320 }}>
      <h3>Measurement Sessions</h3>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={chartData}>
          <XAxis dataKey="startedAt" tickFormatter={formatTime} />
          <YAxis />
          <Tooltip labelFormatter={(value) => formatTime(value as string)} />
          <Legend />
          <Line type="monotone" dataKey="avgHr" name="Avg HR" stroke="#1c6e8c" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="avgSpo2" name="Avg SpO2" stroke="#f37748" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="avgBodyTemp" name="Avg Body Temp" stroke="#1f8a70" strokeWidth={2} dot={false} />
          <Line
            type="monotone"
            dataKey="avgAmbientTemp"
            name="Avg Ambient"
            stroke="#c44d58"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MeasurementSessionChart;
