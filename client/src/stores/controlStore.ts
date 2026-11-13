import { create } from 'zustand';

interface ControlState {
  selectedVehicleId: string | null;
  hasControlLease: boolean;
  leaseExpiresAt: number | null;
  setSelectedVehicle: (id: string | null) => void;
  setLeaseStatus: (hasLease: boolean, expiresAt?: number) => void;
}

export const useControlStore = create<ControlState>((set) => ({
  selectedVehicleId: '1', // Default to SysID 1
  hasControlLease: false,
  leaseExpiresAt: null,
  setSelectedVehicle: (id) => set({ selectedVehicleId: id, hasControlLease: false }),
  setLeaseStatus: (hasControlLease, expiresAt) =>
    set({ hasControlLease, leaseExpiresAt: expiresAt || null }),
}));
