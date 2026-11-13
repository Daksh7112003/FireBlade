import React from 'react';

interface Props {
  groundSpeed: number;
}

export const AirspeedTape: React.FC<Props> = ({ groundSpeed }) => {
  return (
    <div className="flex flex-col items-center bg-slate-900/80 backdrop-blur border border-slate-700/60 rounded p-2 text-xs font-mono">
      <span className="text-slate-400">SPEED (GS)</span>
      <span className="text-cyan-400 text-lg font-bold">{(groundSpeed * 3.6).toFixed(1)} km/h</span>
      <div className="h-px w-full bg-slate-700 my-1"></div>
      <span className="text-slate-400">{groundSpeed.toFixed(1)} m/s</span>
    </div>
  );
};
