import React from 'react';

interface Props {
  altitudeMsl: number;
  altitudeAgl: number;
  climbRate: number;
}

export const AltimeterTape: React.FC<Props> = ({ altitudeMsl, altitudeAgl, climbRate }) => {
  return (
    <div className="flex flex-col items-center bg-slate-900/80 backdrop-blur border border-slate-700/60 rounded p-2 text-xs font-mono">
      <span className="text-slate-400">ALT (MSL)</span>
      <span className="text-emerald-400 text-lg font-bold">{altitudeMsl.toFixed(1)} m</span>
      <div className="h-px w-full bg-slate-700 my-1"></div>
      <span className="text-slate-400">AGL: <strong className="text-slate-200">{altitudeAgl.toFixed(1)} m</strong></span>
      <span className="text-slate-400">VSI: <strong className={climbRate >= 0 ? 'text-emerald-400' : 'text-amber-400'}>{climbRate.toFixed(1)} m/s</strong></span>
    </div>
  );
};

