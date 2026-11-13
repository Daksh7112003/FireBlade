import { apiClient } from './client';
import { Vehicle } from '../types/vehicle.types';

export const fetchVehicles = async (): Promise<Vehicle[]> => {
  const response = await apiClient.get('/vehicles');
  return response.data;
};

export const acquireControlLease = async (vehicleId: string) => {
  const response = await apiClient.post(`/vehicles/${vehicleId}/lease`);
  return response.data;
};

export const releaseControlLease = async (vehicleId: string) => {
  const response = await apiClient.post(`/vehicles/${vehicleId}/release-lease`);
  return response.data;
};

export const armVehicle = async (vehicleId: string, arm: boolean) => {
  const response = await apiClient.post(`/vehicles/${vehicleId}/arm`, { arm });
  return response.data;
};

export const setVehicleMode = async (vehicleId: string, mode: string) => {
  const response = await apiClient.post(`/vehicles/${vehicleId}/mode`, { mode });
  return response.data;
};

export const takeoffVehicle = async (vehicleId: string, altitude: number) => {
  const response = await apiClient.post(`/vehicles/${vehicleId}/takeoff`, { altitude });
  return response.data;
};

export const rtlVehicle = async (vehicleId: string) => {
  const response = await apiClient.post(`/vehicles/${vehicleId}/rtl`);
  return response.data;
};
