import React, { useState } from 'react';
import { PlaneTakeoff, PlaneLanding, Home, Shield, Lock, Unlock } from 'lucide-react';
import { useControlStore } from '../../stores/controlStore';
import { acquireControlLease, releaseControlLease, armVehicle, takeoffVehicle, rtlVehicle } from '../../api/vehicles.api';

export const CommandToolbar: React.FC = () => {
  const { selectedVehicleId, hasControlLease, setLeaseStatus } = useControlStore();
  const [loading, setLoading] = useState(false);

  if (!selectedVehicleId) return null;

  const handleLeaseToggle = async () => {
    try {
      setLoading(true);
      if (hasControlLease) {
        await releaseControlLease(selectedVehicleId);
        setLeaseStatus(false);
      } else {
        const res = await acquireControlLease(selectedVehicleId);
        setLeaseStatus(res.granted);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeoff = async () => {
    if (!hasControlLease) return;
    await takeoffVehicle(selectedVehicleId, 25.0);
  };

  const handleRtl = async () => {
    if (!hasControlLease) return;
    await rtlVehicle(selectedVehicleId);
  };

  return (
    <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 rounded-lg p-2">
      {/* Lease Control Button */}
      <button
        onClick={handleLeaseToggle}
        disabled={loading}
        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition ${
          hasControlLease
            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
        }`}
      >
        {hasControlLease ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
        <span>{hasControlLease ? 'RELEASE LEASE' : 'ACQUIRE LEASE'}</span>
      </button>

      <div className="h-6 w-px bg-slate-800"></div>

      {/* Flight Action Buttons */}
      <button
        onClick={handleTakeoff}
        disabled={!hasControlLease}
        className="flex items-center space-x-1 px-3 py-1.5 bg-cyan-600/80 hover:bg-cyan-500 disabled:opacity-40 text-white rounded text-xs font-semibold"
      >
        <PlaneTakeoff className="w-3.5 h-3.5" />
        <span>TAKEOFF</span>
      </button>

      <button
        onClick={handleRtl}
        disabled={!hasControlLease}
        className="flex items-center space-x-1 px-3 py-1.5 bg-amber-600/80 hover:bg-amber-500 disabled:opacity-40 text-white rounded text-xs font-semibold"
      >
        <Home className="w-3.5 h-3.5" />
        <span>RTL</span>
      </button>
    </div>
  );
};

