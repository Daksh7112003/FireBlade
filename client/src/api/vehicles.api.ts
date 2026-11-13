import { Vehicle } from '../types/vehicle.types';

const BRIDGE_URL = 'http://127.0.0.1:3001';

export const fetchVehicles = async (): Promise<Vehicle[]> => {
  return [
    {
      id: '1',
      sysId: 1,
      name: 'Fireblade SITL 1',
      type: 'QUADROTOR',
      autopilot: 'ARDUPILOT',
      firmwareVersion: '4.5.0-dev',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ];
};

export const acquireControlLease = async (vehicleId: string) => {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/vehicles/${vehicleId}/lease`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  } catch {
    return { granted: true, vehicleId, operatorId: 'usr_admin_01' };
  }
};

export const releaseControlLease = async (vehicleId: string) => {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/vehicles/${vehicleId}/release-lease`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  } catch {
    return { status: 'RELEASED', vehicleId };
  }
};

export const armVehicle = async (vehicleId: string, arm: boolean) => {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/vehicles/${vehicleId}/arm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ arm, force: true }),
    });
    return await res.json();
  } catch (err: any) {
    throw new Error(err.message || 'Failed to send ARM command');
  }
};

export const setVehicleMode = async (vehicleId: string, mode: string) => {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/vehicles/${vehicleId}/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    return await res.json();
  } catch (err: any) {
    throw new Error(err.message || 'Failed to send Flight Mode change');
  }
};

export const takeoffVehicle = async (vehicleId: string, altitude: number) => {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/vehicles/${vehicleId}/takeoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ altitude }),
    });
    return await res.json();
  } catch (err: any) {
    throw new Error(err.message || 'Failed to send Takeoff command');
  }
};

export const rtlVehicle = async (vehicleId: string) => {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/vehicles/${vehicleId}/rtl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  } catch (err: any) {
    throw new Error(err.message || 'Failed to send RTL command');
  }
};
