import React from 'react';
import { ArtificialHorizon } from './ArtificialHorizon';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { CompassRose } from './CompassRose';

interface Props {
  vehicleId: string;
}

export const PfdOverlay: React.FC<Props> = ({ vehicleId }) => {
  const telem = useTelemetryStore((s) => s.vehicles[vehicleId]) || {
    altitudeMsl: 0,
    altitudeAgl: 0,
    groundSpeed: 0,
    climbRate: 0,
    yaw: 0,
    pitch: 0,
    roll: 0,
  };

  return (
    <div className="relative w-64 h-64 bg-slate-950/80 backdrop-blur-md rounded-2xl border border-slate-800 p-3 shadow-2xl flex flex-col items-center justify-between select-none">
      {/* Top Heading */}
      <div className="w-full flex justify-between items-center text-[10px] font-mono text-slate-400">
        <span>PFD HUD</span>
        <CompassRose heading={telem.yaw || 0} />
      </div>

      {/* Artificial Horizon in Center */}
      <div className="relative w-40 h-40">
        <ArtificialHorizon vehicleId={vehicleId} />

        {/* Speed Tape (Left) */}
        <div className="absolute -left-6 top-1/2 -translate-y-1/2 bg-slate-900/90 border border-slate-700/60 rounded px-1.5 py-1 text-center font-mono">
          <div className="text-[8px] text-slate-400">SPD</div>
          <div className="text-xs font-bold text-cyan-400">{(telem.groundSpeed * 3.6).toFixed(0)}</div>
          <div className="text-[8px] text-slate-500">km/h</div>
        </div>

        {/* Altitude Tape (Right) */}
        <div className="absolute -right-6 top-1/2 -translate-y-1/2 bg-slate-900/90 border border-slate-700/60 rounded px-1.5 py-1 text-center font-mono">
          <div className="text-[8px] text-slate-400">ALT</div>
          <div className="text-xs font-bold text-emerald-400">{telem.altitudeAgl.toFixed(0)}</div>
          <div className="text-[8px] text-slate-500">m</div>
        </div>
      </div>

      {/* Bottom Attitude Readouts */}
      <div className="w-full flex justify-around text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-1">
        <span>PITCH: <strong className="text-slate-200">{telem.pitch.toFixed(1)}°</strong></span>
        <span>ROLL: <strong className="text-slate-200">{telem.roll.toFixed(1)}°</strong></span>
      </div>
    </div>
  );
};
