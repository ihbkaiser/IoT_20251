import { useState, type FormEvent } from 'react';
import type { AlertRule } from '../types';

const defaultRule: AlertRule = {
  deviceId: null,
  metric: 'hr',
  operator: '>',
  threshold: 100,
  durationSec: 10,
  cooldownSec: 60,
  enabled: true
};

const AlertRuleForm = ({ onSubmit }: { onSubmit: (rule: AlertRule) => void }) => {
  const [form, setForm] = useState<AlertRule>(defaultRule);

  const handleChange = (key: keyof AlertRule, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <h3>Create Alert Rule</h3>
      <label>
        Device ID (optional)
        <input
          type="text"
          placeholder="Leave blank for all devices"
          value={form.deviceId ?? ''}
          onChange={(event) => handleChange('deviceId', event.target.value || null)}
        />
      </label>
      <label>
        Metric
        <select value={form.metric} onChange={(event) => handleChange('metric', event.target.value)}>
          <option value="hr">Heart Rate</option>
          <option value="spo2">SpO2</option>
          <option value="bodyTemp">Body Temp</option>
          <option value="ambientTemp">Ambient Temp</option>
        </select>
      </label>
      <label>
        Operator
        <select value={form.operator} onChange={(event) => handleChange('operator', event.target.value)}>
          <option value=">">&gt;</option>
          <option value=">=">&gt;=</option>
          <option value="<">&lt;</option>
          <option value="<=">&lt;=</option>
        </select>
      </label>
      <label>
        Threshold
        <input
          type="number"
          value={form.threshold}
          onChange={(event) => handleChange('threshold', Number(event.target.value))}
        />
      </label>
      <label>
        Duration (sec)
        <input
          type="number"
          value={form.durationSec}
          onChange={(event) => handleChange('durationSec', Number(event.target.value))}
        />
      </label>
      <label>
        Cooldown (sec)
        <input
          type="number"
          value={form.cooldownSec}
          onChange={(event) => handleChange('cooldownSec', Number(event.target.value))}
        />
      </label>
      <label>
        Enabled
        <select
          value={form.enabled ? 'yes' : 'no'}
          onChange={(event) => handleChange('enabled', event.target.value === 'yes')}
        >
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </label>
      <button className="accent" type="submit">Create Rule</button>
    </form>
  );
};

export default AlertRuleForm;
