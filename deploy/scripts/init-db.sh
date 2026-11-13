#!/bin/bash
set -e

echo "Initializing Fireblade PostgreSQL + TimescaleDB Extensions..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "postgis";
    CREATE EXTENSION IF NOT EXISTS "timescaledb";
    
    CREATE TABLE IF NOT EXISTS telemetry_logs (
        time TIMESTAMPTZ NOT NULL,
        vehicle_id VARCHAR(64) NOT NULL,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        altitude_msl REAL,
        altitude_agl REAL,
        ground_speed REAL,
        climb_rate REAL,
        pitch REAL,
        roll REAL,
        yaw REAL,
        battery_pct REAL,
        battery_voltage REAL,
        flight_mode VARCHAR(32),
        armed BOOLEAN
    );

    SELECT create_hypertable('telemetry_logs', 'time', if_not_exists => TRUE);
    
    CREATE INDEX IF NOT EXISTS idx_telemetry_vehicle_time ON telemetry_logs (vehicle_id, time DESC);
EOSQL

echo "Database initialized successfully."

