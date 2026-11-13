import React from 'react';
import { useControlStore } from '../../stores/controlStore';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { Battery, Signal, Navigation } from 'lucide-react';

export const FleetOverviewGrid: React.FC = () => {
  const { selectedVehicleId, setSelectedVehicle } = useControlStore();
  const vehicles = useTelemetryStore((s) => s.vehicles);

  const vehicleList = Object.keys(vehicles).length > 0 ? Object.values(vehicles) : [
    { sysId: 1, flightMode: 'LOITER', altitudeAgl: 35.4, batteryPct: 88, armed: true },
  ];

  return (
    <div className="flex flex-col space-y-2 p-2">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Fleet</h3>
      <div className="grid grid-cols-1 gap-1.5">
        {vehicleList.map((v) => {
          const isSelected = selectedVehicleId === v.sysId.toString();
          return (
            <div
              key={v.sysId}
              onClick={() => setSelectedVehicle(v.sysId.toString())}
              className={`p-2.5 rounded-lg border cursor-pointer transition ${
                isSelected
                  ? 'bg-slate-800 border-cyan-500 shadow-md'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm text-slate-200">UAV-{v.sysId}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
                  {v.flightMode || 'STANDBY'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <div className="flex items-center space-x-1">
                  <Navigation className="w-3 h-3 text-cyan-400" />
                  <span>{v.altitudeAgl?.toFixed(1) || '0.0'}m</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Battery className="w-3 h-3 text-emerald-400" />
                  <span>{v.batteryPct || 100}%</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Signal className="w-3 h-3 text-slate-400" />
                  <span className={v.armed ? 'text-red-400 font-bold' : 'text-slate-400'}>
                    {v.armed ? 'ARM' : 'DIS'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

