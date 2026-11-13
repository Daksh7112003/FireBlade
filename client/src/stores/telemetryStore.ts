import { create } from 'zustand';
import { VehicleTelemetry } from '../types/telemetry.types';

interface TelemetryState {
  vehicles: Record<string, VehicleTelemetry>;
  updateTelemetry: (sysId: string, packet: Partial<VehicleTelemetry>) => void;
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  vehicles: {},
  updateTelemetry: (sysId, packet) =>
    set((state) => {
      const existing = state.vehicles[sysId] || {
        sysId: Number(sysId),
        timestamp: Date.now(),
        pitch: 0,
        roll: 0,
        yaw: 0,
        latitude: 0,
        longitude: 0,
        altitudeMsl: 0,
        altitudeAgl: 0,
        groundSpeed: 0,
        climbRate: 0,
        batteryPct: 100,
        batteryVoltage: 24.0,
        flightMode: 'STANDBY',
        armed: false,
      };

      return {
        vehicles: {
          ...state.vehicles,
          [sysId]: { ...existing, ...packet, timestamp: Date.now() },
        },
      };
    }),
}));

