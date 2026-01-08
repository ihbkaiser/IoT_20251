# Health IoT Monitoring System

## Overview
This project ingests telemetry from IoT health devices via MQTT, stores it in MongoDB, exposes a REST API, and streams realtime updates to a web dashboard via Socket.IO.

**Stack:** Node.js + TypeScript + Express + MongoDB + MQTT + Socket.IO + React (Vite).

## Architecture
- **MQTT Broker (Mosquitto):** devices publish to `health/{deviceId}/telemetry`
- **Backend API:** validates telemetry, stores measurements, evaluates alert rules, emits realtime events
- **MongoDB:** persists users, devices, measurements, alert rules/events
- **Frontend:** realtime dashboard + history + alert management

## Run with Docker
```bash
docker compose up --build
```

Frontend: http://localhost:5173
Backend: http://localhost:4000

Seed demo data:
```bash
docker compose exec backend npm run seed
```

Seeded credentials:
- Admin: `admin@health.local` / `admin123`
- User: `user@health.local` / `user1234`

## MQTT Topic + Payload
Topic pattern:
```
health/{deviceId}/telemetry
```
Payload example:
```json
{
  "ts": "2026-01-08T12:34:56.000Z",
  "hr": 78,
  "spo2": 97,
  "bodyTemp": 36.7,
  "ambientTemp": 28.3
}
```

Publish demo telemetry (from your host):
```bash
mosquitto_pub -h localhost -t health/demoDevice01/telemetry -m '{"ts":"2026-01-08T12:34:56.000Z","hr":78,"spo2":97,"bodyTemp":36.7,"ambientTemp":28.3}'
```

## REST API (base: `/api/v1`)
**Auth**
- `POST /auth/register` `{email,password}`
- `POST /auth/login` `{email,password}` -> `{token}`
- `GET /auth/me`

**Devices**
- `GET /devices`
- `POST /devices` (admin)
- `PATCH /devices/:deviceId`
- `GET /devices/:deviceId`

**Measurements**
- `GET /measurements?deviceId=...&from=...&to=...&limit=...`
- `GET /measurements/latest?deviceId=...`

**Alerts**
- `GET /alerts/rules`
- `POST /alerts/rules`
- `PATCH /alerts/rules/:id`
- `DELETE /alerts/rules/:id`
- `GET /alerts/events?deviceId=...&from=...&to=...`
- `PATCH /alerts/events/:id/ack`

## Realtime Events
Socket.IO emits:
- `telemetry` -> `{ deviceId, measurement }`
- `alert` -> `{ deviceId, event }`
Clients send the JWT in the Socket.IO auth payload to subscribe to their data stream.

## Screenshots
- `docs/screenshots/dashboard.png`
- `docs/screenshots/history.png`
- `docs/screenshots/alerts.png`

## Local Development
Backend:
```bash
cd backend
npm install
npm run dev
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

## Notes
- Configure environment variables using `backend/.env.example` and `frontend/.env.example`.
- Alerts are evaluated in realtime on telemetry ingestion; duration/cooldown are tracked in-memory.
- Device offline status updates every `ALERT_CHECK_INTERVAL_MS`.
