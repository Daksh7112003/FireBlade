import React, { useState } from 'react';
import { PlaneTakeoff, Home, Compass, Loader2 } from 'lucide-react';
import { useControlStore } from '../../stores/controlStore';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { takeoffVehicle, rtlVehicle, setVehicleMode } from '../../api/vehicles.api';

export const CommandToolbar: React.FC = () => {
  const { selectedVehicleId } = useControlStore();
  const telem = useTelemetryStore((s) => (selectedVehicleId ? s.vehicles[selectedVehicleId] : null));

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!selectedVehicleId) return null;

  const currentMode = telem?.flightMode || 'DISARMED';

  const showNotification = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleTakeoff = async () => {
    try {
      setLoadingAction('takeoff');
      await takeoffVehicle(selectedVehicleId, 20.0);
      showNotification('Guided Takeoff (20m) sent to UAV-1');
    } catch (e: any) {
      showNotification(`Takeoff failed: ${e.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRtl = async () => {
    try {
      setLoadingAction('rtl');
      await rtlVehicle(selectedVehicleId);
      showNotification('RTL command sent to UAV-1');
    } catch (e: any) {
      showNotification(`RTL failed: ${e.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleModeChange = async (newMode: string) => {
    try {
      setLoadingAction('mode');
      await setVehicleMode(selectedVehicleId, newMode);
      showNotification(`Mode set to ${newMode}`);
    } catch (e: any) {
      showNotification(`Mode change failed: ${e.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 rounded-lg p-1.5 shadow-xl">
      {/* Flight Mode Dropdown */}
      <div className="flex items-center space-x-1 px-1">
        <Compass className="w-3.5 h-3.5 text-cyan-400" />
        <select
          value={currentMode}
          onChange={(e) => handleModeChange(e.target.value)}
          disabled={loadingAction === 'mode'}
          className="bg-slate-950 border border-slate-700 hover:border-slate-600 rounded px-2 py-1 text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
        >
          <option value="GUIDED">GUIDED</option>
          <option value="AUTO">AUTO</option>
          <option value="LOITER">LOITER</option>
          <option value="RTL">RTL</option>
          <option value="LAND">LAND</option>
          <option value="STABILIZE">STABILIZE</option>
          <option value="ALT_HOLD">ALT_HOLD</option>
        </select>
      </div>

      <div className="h-5 w-px bg-slate-800"></div>

      {/* Direct Takeoff Button */}
      <button
        onClick={handleTakeoff}
        disabled={loadingAction !== null}
        title="Switch to GUIDED, Arm, and Climb to 20m"
        className="flex items-center space-x-1.5 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded text-xs font-bold transition shadow-md shadow-cyan-600/20"
      >
        {loadingAction === 'takeoff' ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <PlaneTakeoff className="w-3.5 h-3.5" />
        )}
        <span>TAKEOFF (20m)</span>
      </button>

      {/* RTL Button */}
      <button
        onClick={handleRtl}
        disabled={loadingAction !== null}
        title="Return to Launch and Land"
        className="flex items-center space-x-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded text-xs font-bold transition shadow-md shadow-amber-600/20"
      >
        {loadingAction === 'rtl' ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Home className="w-3.5 h-3.5" />
        )}
        <span>RTL</span>
      </button>

      {/* Status Feedback Tooltip */}
      {feedback && (
        <span className="text-[11px] font-mono text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-cyan-800 animate-fade-in">
          {feedback}
        </span>
      )}
    </div>
  );
};
