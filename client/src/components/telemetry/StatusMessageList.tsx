import React from 'react';
import { Terminal } from 'lucide-react';

export const StatusMessageList: React.FC = () => {
  const messages = [
    { time: '15:35:10', text: 'MAVLink Link Established on UDP 14550', type: 'info' },
    { time: '15:35:12', text: 'Pre-arm checks passed: EKF, Gyro, Compass OK', type: 'success' },
    { time: '15:35:15', text: 'Vehicle 1 Switched to LOITER mode', type: 'info' },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono">
      <div className="flex items-center space-x-1.5 text-slate-400 mb-1 border-b border-slate-800 pb-1">
        <Terminal className="w-3.5 h-3.5" />
        <span className="font-bold">SYSTEM STATUSTEXT LOG</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1">
        {messages.map((m, i) => (
          <div key={i} className="flex space-x-2">
            <span className="text-slate-500">{m.time}</span>
            <span className={m.type === 'success' ? 'text-emerald-400' : 'text-slate-300'}>{m.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
