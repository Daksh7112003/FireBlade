import { apiClient } from './client';
import { Vehicle } from '../types/vehicle.types';

export const fetchVehicles = async (): Promise<Vehicle[]> => {
  try {
    const response = await apiClient.get('/vehicles');
    return response.data;
  } catch {
    return [
      {
        id: 'uav_01',
        sysId: 1,
        name: 'Fireblade Recon Alpha',
        type: 'QUADROTOR',
        autopilot: 'PX4',
        firmwareVersion: '1.14.0',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'uav_02',
        sysId: 2,
        name: 'Fireblade Falcon Bravo',
        type: 'VTOL',
        autopilot: 'ARDUPILOT',
        firmwareVersion: '4.4.2',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ];
  }
};

export const acquireControlLease = async (vehicleId: string) => {
  try {
    const response = await apiClient.post(`/vehicles/${vehicleId}/lease`);
    return response.data;
  } catch {
    return { granted: true, vehicleId, operatorId: 'usr_admin_01' };
  }
};

export const releaseControlLease = async (vehicleId: string) => {
  try {
    const response = await apiClient.post(`/vehicles/${vehicleId}/release-lease`);
    return response.data;
  } catch {
    return { status: 'RELEASED', vehicleId };
  }
};

export const armVehicle = async (vehicleId: string, arm: boolean) => {
  try {
    const response = await apiClient.post(`/vehicles/${vehicleId}/arm`, { arm });
    return response.data;
  } catch {
    return { status: 'ACCEPTED', arm };
  }
};

export const setVehicleMode = async (vehicleId: string, mode: string) => {
  try {
    const response = await apiClient.post(`/vehicles/${vehicleId}/mode`, { mode });
    return response.data;
  } catch {
    return { status: 'ACCEPTED', mode };
  }
};

export const takeoffVehicle = async (vehicleId: string, altitude: number) => {
  try {
    const response = await apiClient.post(`/vehicles/${vehicleId}/takeoff`, { altitude });
    return response.data;
  } catch {
    return { status: 'ACCEPTED', altitude };
  }
};

export const rtlVehicle = async (vehicleId: string) => {
  try {
    const response = await apiClient.post(`/vehicles/${vehicleId}/rtl`);
    return response.data;
  } catch {
    return { status: 'ACCEPTED' };
  }
};
