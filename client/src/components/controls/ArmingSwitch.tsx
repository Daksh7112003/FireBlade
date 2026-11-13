import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { useControlStore } from '../../stores/controlStore';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { armVehicle } from '../../api/vehicles.api';

export const ArmingSwitch: React.FC = () => {
  const { selectedVehicleId, hasControlLease } = useControlStore();
  const telem = useTelemetryStore((s) => (selectedVehicleId ? s.vehicles[selectedVehicleId] : null));
  const [loading, setLoading] = useState(false);

  if (!selectedVehicleId) return null;

  const isArmed = telem?.armed || false;

  const toggleArm = async () => {
    if (!hasControlLease) return;
    try {
      setLoading(true);
      await armVehicle(selectedVehicleId, !isArmed);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleArm}
      disabled={!hasControlLease || loading}
      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-bold transition ${
        isArmed
          ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
          : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
      } disabled:opacity-40`}
    >
      {isArmed ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
      <span>{isArmed ? 'ARMED (DISARM)' : 'DISARMED (ARM)'}</span>
    </button>
  );
};

