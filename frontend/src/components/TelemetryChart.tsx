import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Measurement } from '../types';

type MetricKey = 'hr' | 'spo2' | 'bodyTemp' | 'ambientTemp';

const METRICS: { key: MetricKey; label: string; color: string }[] = [
  { key: 'hr', label: 'HR', color: '#1c6e8c' },
  { key: 'spo2', label: 'SpO2', color: '#f37748' },
  { key: 'bodyTemp', label: 'Body Temp', color: '#1f8a70' },
  { key: 'ambientTemp', label: 'Ambient Temp', color: '#c44d58' }
];

const formatTime = (value: string) => {
  const date = new Date(value);
  return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const TelemetryChart = ({ data }: { data: Measurement[] }) => {
  const [visibleMetrics, setVisibleMetrics] = useState<Record<MetricKey, boolean>>({
    hr: true,
    spo2: true,
    bodyTemp: false,
    ambientTemp: false
  });

  const activeMetrics = useMemo(
    () => METRICS.filter((metric) => visibleMetrics[metric.key]),
    [visibleMetrics]
  );
  const hasMetrics = activeMetrics.length > 0;

  return (
    <div className="card" style={{ height: 360 }}>
      <h3>Realtime Telemetry</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '10px 0 4px' }}>
        {METRICS.map((metric) => (
          <label key={metric.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={visibleMetrics[metric.key]}
              onChange={() =>
                setVisibleMetrics((prev) => ({ ...prev, [metric.key]: !prev[metric.key] }))
              }
            />
            <span style={{ color: metric.color, fontWeight: 600 }}>{metric.label}</span>
          </label>
        ))}
      </div>
      {hasMetrics ? (
        <ResponsiveContainer width="100%" height="78%">
          <LineChart data={[...data].reverse()}>
            <XAxis dataKey="ts" tickFormatter={formatTime} />
            <YAxis />
            <Tooltip labelFormatter={(value) => formatTime(value as string)} />
            <Legend />
            {activeMetrics.map((metric) => (
              <Line
                key={metric.key}
                type="monotone"
                dataKey={metric.key}
                stroke={metric.color}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div
          style={{
            height: 240,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--muted)'
          }}
        >
          Chon it nhat 1 thong so de ve bieu do.
        </div>
      )}
    </div>
  );
};

export default TelemetryChart;
