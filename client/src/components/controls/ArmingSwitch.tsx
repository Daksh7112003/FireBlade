import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react';
import { useControlStore } from '../../stores/controlStore';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { armVehicle } from '../../api/vehicles.api';

export const ArmingSwitch: React.FC = () => {
  const { selectedVehicleId } = useControlStore();
  const telem = useTelemetryStore((s) => (selectedVehicleId ? s.vehicles[selectedVehicleId] : null));
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!selectedVehicleId) return null;

  const isArmed = telem?.armed || false;

  const toggleArm = async () => {
    try {
      setLoading(true);
      setFeedback(null);
      await armVehicle(selectedVehicleId, !isArmed);
      setFeedback(isArmed ? 'Disarm command sent' : 'Force Arm sent to ArduPilot');
      setTimeout(() => setFeedback(null), 3000);
    } catch (e: any) {
      setFeedback(`Error: ${e.message}`);
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={toggleArm}
        disabled={loading}
        title={isArmed ? 'Click to Disarm Motors' : 'Click to Force Arm Motors (Bypass SITL prearm)'}
        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-bold transition shadow-lg ${
          isArmed
            ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse border border-red-400'
            : 'bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-500'
        } disabled:opacity-50`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isArmed ? (
          <ShieldAlert className="w-4 h-4" />
        ) : (
          <ShieldCheck className="w-4 h-4" />
        )}
        <span>{isArmed ? 'ARMED (DISARM)' : 'DISARMED (ARM)'}</span>
      </button>

      {feedback && (
        <span className="text-[11px] font-mono text-cyan-300 bg-slate-950/90 px-2 py-0.5 rounded border border-slate-700 animate-fade-in">
          {feedback}
        </span>
      )}
    </div>
  );
};
