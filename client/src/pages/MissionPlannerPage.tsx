import React, { useState } from 'react';
import { TacticalMap } from '../components/map/TacticalMap';
import { Upload, CheckCircle2, AlertCircle, Plus, Trash2, Navigation, RotateCcw } from 'lucide-react';
import { uploadMissionToUav } from '../api/missions.api';
import { useMissionStore, Waypoint } from '../stores/missionStore';

export const MissionPlannerPage: React.FC = () => {
  const { waypoints, defaultAlt, setDefaultAlt, addWaypoint, updateWaypoint, removeWaypoint, clearMission } =
    useMissionStore();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleUpload = async () => {
    if (waypoints.length === 0) {
      setUploadStatus({ type: 'error', message: 'Add at least one waypoint before uploading.' });
      return;
    }

    try {
      setIsUploading(true);
      setUploadStatus(null);
      const res = await uploadMissionToUav(waypoints);
      if (res.success) {
        setUploadStatus({
          type: 'success',
          message: `Mission accepted! ${res.count} waypoints synced with ArduPilot.`,
        });
      } else {
        throw new Error(res.error || 'Autopilot rejected mission');
      }
    } catch (err: any) {
      setUploadStatus({
        type: 'error',
        message: err.message || 'Failed to communicate with MAVLink flight core',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualAdd = () => {
    const last = waypoints[waypoints.length - 1];
    addWaypoint({
      lat: last ? Number((last.lat + 0.0015).toFixed(6)) : 37.775,
      lon: last ? Number((last.lon + 0.0015).toFixed(6)) : -122.419,
      alt: defaultAlt,
      cmd: 'WAYPOINT',
    });
  };

  return (
    <div className="h-full w-full flex bg-tactical-dark">
      {/* Tactical Map with Click-to-Add Waypoint Enabled */}
      <div className="flex-1 relative">
        <TacticalMap selectedVehicleId="1" editable={true} />
      </div>

      {/* Mission Sidebar */}
      <div className="w-[420px] bg-slate-900 border-l border-slate-800 flex flex-col p-4 z-10 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="font-bold text-sm text-white flex items-center space-x-1.5">
              <Navigation className="w-4 h-4 text-cyan-400" />
              <span>MISSION PLANNER</span>
            </h2>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Click map to drop points &bull; Drag pins</p>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={clearMission}
              title="Clear all waypoints"
              className="p-1.5 bg-slate-800 hover:bg-red-900/60 text-slate-400 hover:text-red-300 rounded transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading || waypoints.length === 0}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded text-xs font-bold transition shadow-lg shadow-cyan-600/20"
            >
              <Upload className={`w-3.5 h-3.5 ${isUploading ? 'animate-bounce' : ''}`} />
              <span>{isUploading ? 'UPLOADING...' : 'UPLOAD TO UAV'}</span>
            </button>
          </div>
        </div>

        {/* Global Altitude Setting */}
        <div className="flex items-center justify-between py-2.5 px-3 bg-slate-950/80 border border-slate-800/80 rounded my-2 text-xs font-mono">
          <span className="text-slate-400">Default Altitude:</span>
          <div className="flex items-center space-x-1">
            <input
              type="number"
              value={defaultAlt}
              onChange={(e) => setDefaultAlt(Number(e.target.value))}
              className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-center text-cyan-300 font-bold focus:outline-none"
            />
            <span className="text-slate-500">meters</span>
          </div>
        </div>

        {/* Upload Status Banner */}
        {uploadStatus && (
          <div
            className={`mb-2 p-2.5 rounded border text-xs font-mono flex items-center space-x-2 ${
              uploadStatus.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                : 'bg-red-950/80 border-red-700 text-red-300'
            }`}
          >
            {uploadStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{uploadStatus.message}</span>
          </div>
        )}

        {/* Waypoints List */}
        <div className="flex-1 overflow-y-auto py-1 space-y-2">
          {waypoints.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-slate-500 text-xs font-mono text-center px-4">
              <Navigation className="w-8 h-8 text-slate-600 mb-2" />
              <span>No waypoints placed.</span>
              <span className="text-cyan-500/80 mt-1">Click anywhere on the tactical map to add your first waypoint!</span>
            </div>
          ) : (
            waypoints.map((wp, idx) => (
              <div
                key={wp.seq}
                className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between font-mono text-xs hover:border-slate-700 transition"
              >
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-400 font-bold">WP #{wp.seq}</span>
                    <select
                      value={wp.cmd}
                      onChange={(e) => updateWaypoint(idx, { cmd: e.target.value as Waypoint['cmd'] })}
                      className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-200 focus:outline-none"
                    >
                      <option value="TAKEOFF">TAKEOFF</option>
                      <option value="WAYPOINT">WAYPOINT</option>
                      <option value="LOITER">LOITER</option>
                      <option value="RTL">RTL</option>
                      <option value="LAND">LAND</option>
                    </select>

                    <div className="flex items-center space-x-1 ml-auto mr-2">
                      <span className="text-[10px] text-slate-500">ALT:</span>
                      <input
                        type="number"
                        value={wp.alt}
                        onChange={(e) => updateWaypoint(idx, { alt: Number(e.target.value) })}
                        className="w-12 bg-slate-900 border border-slate-700 rounded px-1 text-center text-emerald-400 text-[11px]"
                      />
                      <span className="text-[10px] text-slate-500">m</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 flex space-x-3">
                    <span>LAT: <strong className="text-slate-300">{wp.lat.toFixed(5)}</strong></span>
                    <span>LON: <strong className="text-slate-300">{wp.lon.toFixed(5)}</strong></span>
                  </div>
                </div>

                <button
                  onClick={() => removeWaypoint(idx)}
                  title="Delete waypoint"
                  className="text-slate-500 hover:text-red-400 p-1.5 rounded hover:bg-slate-900 transition ml-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex space-x-2">
          <button
            onClick={handleManualAdd}
            className="flex-1 flex items-center justify-center space-x-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD WAYPOINT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
