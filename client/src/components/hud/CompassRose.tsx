import React from 'react';

interface Props {
  heading: number;
}

export const CompassRose: React.FC<Props> = ({ heading }) => {
  return (
    <div className="flex items-center justify-center bg-slate-900/80 backdrop-blur border border-slate-700/60 rounded px-3 py-1 font-mono text-sm">
      <span className="text-slate-400 mr-2">HDG:</span>
      <span className="text-yellow-400 font-bold">{Math.round((heading + 360) % 360)}°</span>
    </div>
  );
};

