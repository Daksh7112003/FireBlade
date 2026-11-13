import React from 'react';
import { TacticalMap } from '../components/map/TacticalMap';
import { Upload } from 'lucide-react';

export const MissionPlannerPage: React.FC = () => {
  const waypoints = [
    { seq: 0, lat: 37.7749, lon: -122.4194, alt: 30, cmd: 'TAKEOFF' },
    { seq: 1, lat: 37.7760, lon: -122.4180, alt: 50, cmd: 'WAYPOINT' },
    { seq: 2, lat: 37.7775, lon: -122.4200, alt: 50, cmd: 'WAYPOINT' },
    { seq: 3, lat: 37.7749, lon: -122.4194, alt: 30, cmd: 'RTL' },
  ];

  return (
    <div className="h-full w-full flex bg-tactical-dark">
      <div className="flex-1 relative">
        <TacticalMap selectedVehicleId="1" />
      </div>

      <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col p-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="font-bold text-sm text-white">MISSION PLANNER</h2>
          <button className="flex items-center space-x-1 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold">
            <Upload className="w-3.5 h-3.5" />
            <span>UPLOAD TO UAV</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-2">
          {waypoints.map((wp) => (
            <div key={wp.seq} className="p-3 bg-slate-950 border border-slate-800 rounded flex items-center justify-between font-mono text-xs">
              <div>
                <span className="text-cyan-400 font-bold mr-2">WP #{wp.seq}</span>
                <span className="text-slate-300 font-semibold">{wp.cmd}</span>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  ALT: {wp.alt}m | LAT: {wp.lat.toFixed(4)} | LON: {wp.lon.toFixed(4)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
