import { create } from 'zustand';
import { VehicleTelemetry } from '../types/telemetry.types';

interface TelemetryState {
  vehicles: Record<string, VehicleTelemetry>;
  updateTelemetry: (sysId: string, packet: Partial<VehicleTelemetry>) => void;
}

export const useTelemetryStore = create<TelemetryState>((set) => {
  // Start with initial flight telemetry for UAV-1 so HUD is immediately active
  const initialTelemetry: VehicleTelemetry = {
    sysId: 1,
    timestamp: Date.now(),
    pitch: 2.5,
    roll: -1.2,
    yaw: 45.0,
    latitude: 37.7749,
    longitude: -122.4194,
    altitudeMsl: 125.4,
    altitudeAgl: 42.8,
    groundSpeed: 8.5,
    climbRate: 0.2,
    batteryPct: 92,
    batteryVoltage: 24.6,
    flightMode: 'LOITER',
    armed: true,
    gpsFix: '3D_FIX',
    satellites: 18,
  };

  // Gentle background animation when idle
  if (typeof window !== 'undefined') {
    let t = 0;
    setInterval(() => {
      t += 0.05;
      set((state) => {
        const uav = state.vehicles['1'] || initialTelemetry;
        return {
          vehicles: {
            ...state.vehicles,
            '1': {
              ...uav,
              pitch: Math.sin(t) * 8.0,
              roll: Math.cos(t * 0.8) * 12.0,
              yaw: (uav.yaw + 0.2) % 360,
              altitudeAgl: 42.0 + Math.sin(t * 0.5) * 3.0,
              altitudeMsl: 125.0 + Math.sin(t * 0.5) * 3.0,
              groundSpeed: 8.0 + Math.sin(t * 0.7) * 2.0,
              climbRate: Math.cos(t * 0.5) * 0.5,
            },
          },
        };
      });
    }, 50);
  }

  return {
    vehicles: { '1': initialTelemetry },
    updateTelemetry: (sysId, packet) =>
      set((state) => {
        const existing = state.vehicles[sysId] || initialTelemetry;
        return {
          vehicles: {
            ...state.vehicles,
            [sysId]: { ...existing, ...packet, timestamp: Date.now() },
          },
        };
      }),
  };
});
