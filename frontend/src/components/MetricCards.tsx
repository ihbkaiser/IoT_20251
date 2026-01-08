import type { Measurement } from '../types';

const formatValue = (value?: number, unit?: string) => {
  if (value === undefined || value === null) return '--';
  return `${value.toFixed(1)}${unit ?? ''}`;
};

const MetricCards = ({ measurement }: { measurement: Measurement | null }) => {
  return (
    <div className="grid grid-4">
      <div className="card">
        <div style={{ color: 'var(--muted)' }}>Heart Rate</div>
        <div className="metric-value">{formatValue(measurement?.hr, ' bpm')}</div>
      </div>
      <div className="card">
        <div style={{ color: 'var(--muted)' }}>SpO2</div>
        <div className="metric-value">{formatValue(measurement?.spo2, ' %')}</div>
      </div>
      <div className="card">
        <div style={{ color: 'var(--muted)' }}>Body Temp</div>
        <div className="metric-value">{formatValue(measurement?.bodyTemp, ' °C')}</div>
      </div>
      <div className="card">
        <div style={{ color: 'var(--muted)' }}>Ambient Temp</div>
        <div className="metric-value">{formatValue(measurement?.ambientTemp, ' °C')}</div>
      </div>
    </div>
  );
};

export default MetricCards;
