import React from 'react';
import { Plane, Settings, RefreshCw } from 'lucide-react';

export const FleetManagementPage: React.FC = () => {
  const mockVehicles = [
    { id: 'uav_01', sysId: 1, name: 'Recon Alpha', type: 'QUADROTOR', autopilot: 'PX4 v1.14', status: 'ONLINE' },
    { id: 'uav_02', sysId: 2, name: 'Surveillance Bravo', type: 'VTOL', autopilot: 'ArduPilot 4.4', status: 'ONLINE' },
  ];

  return (
    <div className="h-full w-full p-6 bg-tactical-dark overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">FLEET MANAGEMENT</h1>
          <p className="text-xs text-slate-400 mt-1">Multi-UAV Hardware Inventory & Autopilot Configuration</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {mockVehicles.map((v) => (
          <div key={v.id} className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-white text-base">{v.name} (SysID: {v.sysId})</span>
              <span className="px-2 py-0.5 rounded text-xs bg-emerald-950 text-emerald-400 border border-emerald-800">
                {v.status}
              </span>
            </div>
            <div className="text-xs text-slate-400 space-y-1 font-mono">
              <div>Type: <strong className="text-slate-200">{v.type}</strong></div>
              <div>Autopilot: <strong className="text-slate-200">{v.autopilot}</strong></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
