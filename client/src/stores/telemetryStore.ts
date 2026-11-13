import { create } from 'zustand';
import { VehicleTelemetry } from '../types/telemetry.types';

interface TelemetryState {
  vehicles: Record<string, VehicleTelemetry>;
  updateTelemetry: (sysId: string, packet: Partial<VehicleTelemetry>) => void;
}

const defaultTelemetry: VehicleTelemetry = {
  sysId: 1,
  timestamp: Date.now(),
  pitch: 0,
  roll: 0,
  yaw: 0,
  latitude: 37.7749,
  longitude: -122.4194,
  altitudeMsl: 0,
  altitudeAgl: 0,
  groundSpeed: 0,
  climbRate: 0,
  batteryPct: 100,
  batteryVoltage: 25.2,
  flightMode: 'DISARMED',
  armed: false,
  gpsFix: 'NO_FIX',
  satellites: 0,
};

export const useTelemetryStore = create<TelemetryState>((set) => ({
  vehicles: { '1': defaultTelemetry },
  updateTelemetry: (sysId, packet) =>
    set((state) => {
      // Filter out GCS (SysID 255) and invalid broadcast (SysID 0)
      if (sysId === '255' || sysId === '0') return state;
      const existing = state.vehicles[sysId] || defaultTelemetry;
      return {
        vehicles: {
          ...state.vehicles,
          [sysId]: { ...existing, ...packet, timestamp: Date.now() },
        },
      };
    }),
}));
