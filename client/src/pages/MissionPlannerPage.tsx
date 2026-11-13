import React, { useState } from 'react';
import { TacticalMap } from '../components/map/TacticalMap';
import { Upload, CheckCircle2, AlertCircle, Plus, Trash2, Navigation } from 'lucide-react';
import { uploadMissionToUav } from '../api/missions.api';

export const MissionPlannerPage: React.FC = () => {
  const [waypoints, setWaypoints] = useState([
    { seq: 0, lat: 37.7749, lon: -122.4194, alt: 30, cmd: 'TAKEOFF' },
    { seq: 1, lat: 37.7760, lon: -122.4180, alt: 50, cmd: 'WAYPOINT' },
    { seq: 2, lat: 37.7775, lon: -122.4200, alt: 50, cmd: 'WAYPOINT' },
    { seq: 3, lat: 37.7749, lon: -122.4194, alt: 30, cmd: 'RTL' },
  ]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleUpload = async () => {
    try {
      setIsUploading(true);
      setUploadStatus(null);
      const res = await uploadMissionToUav(waypoints);
      if (res.success) {
        setUploadStatus({
          type: 'success',
          message: `Mission accepted! ${res.count} waypoints uploaded to UAV via MAVLink.`,
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

  const addWaypoint = () => {
    const last = waypoints[waypoints.length - 1];
    const newSeq = waypoints.length;
    setWaypoints([
      ...waypoints,
      {
        seq: newSeq,
        lat: last ? last.lat + 0.001 : 37.775,
        lon: last ? last.lon + 0.001 : -122.419,
        alt: 50,
        cmd: 'WAYPOINT',
      },
    ]);
  };

  const removeWaypoint = (index: number) => {
    if (waypoints.length <= 1) return;
    const updated = waypoints.filter((_, i) => i !== index).map((wp, idx) => ({ ...wp, seq: idx }));
    setWaypoints(updated);
  };

  return (
    <div className="h-full w-full flex bg-tactical-dark">
      {/* Tactical Map */}
      <div className="flex-1 relative">
        <TacticalMap selectedVehicleId="1" />
      </div>

      {/* Mission Sidebar */}
      <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col p-4 z-10 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="font-bold text-sm text-white flex items-center space-x-1.5">
              <Navigation className="w-4 h-4 text-cyan-400" />
              <span>MISSION PLANNER</span>
            </h2>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">MAVLink Waypoint Protocol v2</p>
          </div>

          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded text-xs font-bold transition shadow-lg shadow-cyan-600/20"
          >
            <Upload className={`w-3.5 h-3.5 ${isUploading ? 'animate-bounce' : ''}`} />
            <span>{isUploading ? 'UPLOADING...' : 'UPLOAD TO UAV'}</span>
          </button>
        </div>

        {/* Upload Status Banner */}
        {uploadStatus && (
          <div
            className={`my-3 p-2.5 rounded border text-xs font-mono flex items-center space-x-2 ${
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
        <div className="flex-1 overflow-y-auto py-2 space-y-2">
          {waypoints.map((wp, idx) => (
            <div
              key={wp.seq}
              className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between font-mono text-xs hover:border-slate-700 transition"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-cyan-400 font-bold">WP #{wp.seq}</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300">
                    {wp.cmd}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex space-x-2">
                  <span>ALT: <strong className="text-slate-200">{wp.alt}m</strong></span>
                  <span>LAT: <strong className="text-slate-200">{wp.lat.toFixed(4)}</strong></span>
                  <span>LON: <strong className="text-slate-200">{wp.lon.toFixed(4)}</strong></span>
                </div>
              </div>

              <button
                onClick={() => removeWaypoint(idx)}
                title="Remove waypoint"
                className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-900 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Waypoint Button */}
        <div className="pt-3 border-t border-slate-800">
          <button
            onClick={addWaypoint}
            className="w-full flex items-center justify-center space-x-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD WAYPOINT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
