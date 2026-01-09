#!/usr/bin/env python3
import argparse
import json
from datetime import datetime, timezone

import serial
import paho.mqtt.client as mqtt


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def ensure_timestamp(payload: dict) -> dict:
    ts = payload.get("ts")
    if not isinstance(ts, str) or len(ts) < 4:
        payload["ts"] = now_iso()
        return payload
    try:
        year = int(ts[:4])
        if year < 2020:
            payload["ts"] = now_iso()
    except ValueError:
        payload["ts"] = now_iso()
    return payload


def main() -> None:
    parser = argparse.ArgumentParser(description="ESP32 Serial to MQTT bridge.")
    parser.add_argument("serial_port", help="Serial port, e.g. /dev/ttyUSB0 or COM3")
    parser.add_argument("baudrate", type=int, help="Serial baudrate, e.g. 115200")
    parser.add_argument("device_id", help="Device ID for MQTT topic")
    parser.add_argument("--host", default="localhost", help="MQTT broker host")
    parser.add_argument("--port", dest="mqtt_port", type=int, default=1883, help="MQTT broker port")
    args = parser.parse_args()

    topic = f"health/{args.device_id}/telemetry"
    mqtt_client = mqtt.Client()
    mqtt_client.connect(args.host, args.mqtt_port, 60)
    mqtt_client.loop_start()

    with serial.Serial(args.serial_port, args.baudrate, timeout=1) as ser:
        while True:
            line = ser.readline().decode("utf-8", errors="ignore").strip()
            if not line:
                continue
            try:
                payload = json.loads(line)
            except json.JSONDecodeError:
                continue
            payload = ensure_timestamp(payload)
            mqtt_client.publish(topic, json.dumps(payload))


if __name__ == "__main__":
    main()
