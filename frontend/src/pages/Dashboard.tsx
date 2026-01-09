import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/client';
import { connectSocket } from '../socket/client';
import type { Device, Measurement, User } from '../types';
import MetricCards from '../components/MetricCards';
import TelemetryChart from '../components/TelemetryChart';

type MetricKey = 'hr' | 'spo2' | 'bodyTemp' | 'ambientTemp';
type SessionStatus = 'idle' | 'waiting' | 'counting' | 'saving' | 'done' | 'error';

interface SessionAccumulator {
  startedAt: Date | null;
  warmupEndsAt: Date | null;
  sums: Record<MetricKey, number>;
  counts: Record<MetricKey, number>;
  sampleCount: number;
}

interface SessionSummary {
  deviceId: string;
  startedAt: Date;
  endedAt: Date;
  durationSec: number;
  avgHr?: number;
  avgSpo2?: number;
  avgBodyTemp?: number;
  avgAmbientTemp?: number;
  sampleCount: number;
}

const SESSION_DURATION_SEC = 30;
const SESSION_WARMUP_SEC = 5;
const SESSION_MIN_SAMPLES = 5;

const createAccumulator = (): SessionAccumulator => ({
  startedAt: null,
  warmupEndsAt: null,
  sums: { hr: 0, spo2: 0, bodyTemp: 0, ambientTemp: 0 },
  counts: { hr: 0, spo2: 0, bodyTemp: 0, ambientTemp: 0 },
  sampleCount: 0
});

const Dashboard = ({ user }: { user: User }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [latest, setLatest] = useState<Measurement | null>(null);
  const [series, setSeries] = useState<Measurement[]>([]);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('idle');
  const [countdown, setCountdown] = useState<number>(SESSION_DURATION_SEC);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);

  const sessionRef = useRef<SessionAccumulator>(createAccumulator());
  const sessionDeviceRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof window.setInterval> | null>(null);

  const selectedDevice = useMemo(
    () => devices.find((device) => device.deviceId === selectedDeviceId),
    [devices, selectedDeviceId]
  );

  const resetSession = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    sessionRef.current = createAccumulator();
    sessionDeviceRef.current = '';
    setCountdown(SESSION_DURATION_SEC);
    setSessionStatus('idle');
  };

  const addToSession = (measurement: Measurement) => {
    if (measurement.contact !== true) return;
    const acc = sessionRef.current;
    if (!acc.startedAt || !acc.warmupEndsAt) return;
    const sampleTime = new Date(measurement.ts);
    if (Number.isNaN(sampleTime.getTime()) || sampleTime < acc.warmupEndsAt) {
      return;
    }
    acc.sampleCount += 1;
    const metrics: MetricKey[] = ['hr', 'spo2', 'bodyTemp', 'ambientTemp'];
    metrics.forEach((key) => {
      const value = measurement[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        acc.sums[key] += value;
        acc.counts[key] += 1;
      }
    });
  };

  const startCountdown = (startedAt: Date) => {
    sessionRef.current.startedAt = startedAt;
    sessionRef.current.warmupEndsAt = new Date(startedAt.getTime() + SESSION_WARMUP_SEC * 1000);
    setSessionStatus('counting');
    setCountdown(SESSION_DURATION_SEC);
    timerRef.current = window.setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
  };

  const finishSession = async () => {
    const acc = sessionRef.current;
    const deviceId = sessionDeviceRef.current;
    if (!deviceId || !acc.startedAt) {
      resetSession();
      return;
    }
    if (acc.sampleCount < SESSION_MIN_SAMPLES) {
      setSessionStatus('error');
      return;
    }

    setSessionStatus('saving');
    const endedAt = new Date();
    const payload: Record<string, unknown> = {
      deviceId,
      startedAt: acc.startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      sampleCount: acc.sampleCount
    };

    const buildAverage = (sum: number, count: number) =>
      count > 0 ? Number((sum / count).toFixed(2)) : undefined;

    const avgHr = acc.counts.hr > 0 ? buildAverage(acc.sums.hr, acc.counts.hr) : undefined;
    const avgSpo2 = acc.counts.spo2 > 0 ? buildAverage(acc.sums.spo2, acc.counts.spo2) : undefined;
    const avgBodyTemp =
      acc.counts.bodyTemp > 0 ? buildAverage(acc.sums.bodyTemp, acc.counts.bodyTemp) : undefined;
    const avgAmbientTemp =
      acc.counts.ambientTemp > 0 ? buildAverage(acc.sums.ambientTemp, acc.counts.ambientTemp) : undefined;

    if (avgHr !== undefined) payload.avgHr = avgHr;
    if (avgSpo2 !== undefined) payload.avgSpo2 = avgSpo2;
    if (avgBodyTemp !== undefined) payload.avgBodyTemp = avgBodyTemp;
    if (avgAmbientTemp !== undefined) payload.avgAmbientTemp = avgAmbientTemp;

    setSessionSummary({
      deviceId,
      startedAt: acc.startedAt,
      endedAt,
      durationSec: Math.max(
        1,
        Math.round((endedAt.getTime() - acc.startedAt.getTime()) / 1000)
      ),
      avgHr,
      avgSpo2,
      avgBodyTemp,
      avgAmbientTemp,
      sampleCount: acc.sampleCount
    });

    try {
      await api.post('/measurements/sessions', payload);
      setSessionStatus('done');
    } catch (error) {
      setSessionStatus('error');
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

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
    if (sessionStatus === 'counting' && countdown === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      void finishSession();
    }
  }, [countdown, sessionStatus]);

  useEffect(() => {
    if (sessionStatus !== 'idle' && sessionDeviceRef.current && sessionDeviceRef.current !== selectedDeviceId) {
      resetSession();
    }
  }, [selectedDeviceId, sessionStatus]);

  const isSessionActive = sessionStatus === 'waiting' || sessionStatus === 'counting' || sessionStatus === 'saving';
  const sessionMessage = (() => {
    switch (sessionStatus) {
      case 'waiting':
        return `Place your finger on the sensor to start. Warmup ${SESSION_WARMUP_SEC}s.`;
      case 'counting':
        return `Measuring... ${countdown}s remaining.`;
      case 'saving':
        return 'Saving session...';
      case 'done':
        return 'Session saved.';
      case 'error':
        return `Session failed or not enough valid samples (min ${SESSION_MIN_SAMPLES}).`;
      default:
        return `Press start to capture a ${SESSION_DURATION_SEC}s session.`;
    }
  })();

  const handleStartSession = () => {
    if (!selectedDeviceId) return;
    resetSession();
    sessionDeviceRef.current = selectedDeviceId;
    setSessionStatus('waiting');
  };

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

      if (sessionDeviceRef.current !== payload.deviceId) return;
      if (
        sessionStatus === 'waiting' &&
        payload.measurement.contact === true &&
        !sessionRef.current.startedAt
      ) {
        const startedAt = new Date(payload.measurement.ts);
        startCountdown(startedAt);
        addToSession(payload.measurement);
      } else if (sessionStatus === 'counting') {
        addToSession(payload.measurement);
      }
    };

    socket.on('telemetry', handleTelemetry);
    return () => {
      socket.off('telemetry', handleTelemetry);
    };
  }, [selectedDeviceId, sessionStatus]);

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

      <section className="card">
        <h2>Session Capture</h2>
        <p style={{ color: 'var(--muted)' }}>Start a 30s measurement session when contact is detected.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <button
            className="primary"
            onClick={handleStartSession}
            disabled={!selectedDeviceId || isSessionActive}
          >
            {sessionStatus === 'counting' ? `Measuring ${countdown}s` : 'Start Session'}
          </button>
          {sessionStatus === 'done' && <span className="badge online">Saved</span>}
          {sessionStatus === 'error' && <span className="badge offline">Failed</span>}
        </div>
        <p style={{ color: 'var(--muted)', marginTop: 8 }}>{sessionMessage}</p>
        {sessionSummary && sessionSummary.deviceId === selectedDeviceId && (
          <div className="grid grid-2" style={{ marginTop: 12 }}>
            <div>
              <strong>Last Session</strong>
              <div style={{ color: 'var(--muted)' }}>
                {sessionSummary.durationSec}s · {sessionSummary.sampleCount} samples
              </div>
            </div>
            <div>
              <div>Avg HR: {sessionSummary.avgHr ?? '--'}</div>
              <div>Avg SpO2: {sessionSummary.avgSpo2 ?? '--'}</div>
              <div>Avg Body Temp: {sessionSummary.avgBodyTemp ?? '--'}</div>
              <div>Avg Ambient: {sessionSummary.avgAmbientTemp ?? '--'}</div>
            </div>
          </div>
        )}
      </section>

      <MetricCards measurement={latest} />

      <TelemetryChart data={series} />
    </div>
  );
};

export default Dashboard;
