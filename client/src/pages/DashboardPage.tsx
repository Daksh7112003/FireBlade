import React from 'react';
import { TacticalMap } from '../components/map/TacticalMap';
import { CesiumGlobe } from '../components/map/CesiumGlobe';
import { PfdOverlay } from '../components/hud/PfdOverlay';
import { WebRtcPlayer } from '../components/video/WebRtcPlayer';
import { FleetOverviewGrid } from '../components/telemetry/FleetOverviewGrid';
import { CommandToolbar } from '../components/controls/CommandToolbar';
import { ArmingSwitch } from '../components/controls/ArmingSwitch';
import { StatusMessageList } from '../components/telemetry/StatusMessageList';
import { useControlStore } from '../stores/controlStore';
import { useUiStore } from '../stores/uiStore';
import { useTelemetry } from '../hooks/useTelemetry';
import { Map, Video, Eye, EyeOff, Globe } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { selectedVehicleId } = useControlStore();
  const { activeTab, setActiveTab, mapEngine, setMapEngine, showPfd, togglePfd } = useUiStore();

  useTelemetry(selectedVehicleId);

  return (
    <div className="h-full w-full flex flex-col bg-tactical-dark">
      {/* Top Controls Bar */}
      <div className="h-12 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          {/* Main View Switcher */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded border border-slate-800">
            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center space-x-1 px-3 py-1 rounded text-xs font-bold transition ${
                activeTab === 'map' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>MAP VIEW</span>
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`flex items-center space-x-1 px-3 py-1 rounded text-xs font-bold transition ${
                activeTab === 'video' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>VIDEO STREAM</span>
            </button>
          </div>

          {/* 3D Map Engine Selector (Satellite vs Cesium Globe) */}
          {activeTab === 'map' && (
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded border border-slate-800">
              <button
                onClick={() => setMapEngine('tactical')}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
                  mapEngine === 'tactical' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                3D SATELLITE
              </button>
              <button
                onClick={() => setMapEngine('cesium')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-mono transition ${
                  mapEngine === 'cesium' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-3 h-3 text-cyan-400" />
                <span>CESIUM GLOBE</span>
              </button>
            </div>
          )}

          <button
            onClick={togglePfd}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition"
          >
            {showPfd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showPfd ? 'HIDE HUD' : 'SHOW HUD'}</span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <ArmingSwitch />
          <CommandToolbar />
        </div>
      </div>

      {/* Main Workspace Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Primary Display (Map or Video) */}
        <div className="flex-1 relative">
          {activeTab === 'map' ? (
            mapEngine === 'cesium' ? (
              <CesiumGlobe selectedVehicleId={selectedVehicleId || '1'} />
            ) : (
              <TacticalMap selectedVehicleId={selectedVehicleId || '1'} />
            )
          ) : (
            <WebRtcPlayer streamPath={`uav_${selectedVehicleId || '1'}_cam_1`} />
          )}

          {/* Floating PFD HUD Glass Cockpit */}
          {showPfd && selectedVehicleId && (
            <div className="absolute bottom-6 left-6 z-20 transition-all duration-200">
              <PfdOverlay vehicleId={selectedVehicleId} />
            </div>
          )}
        </div>

        {/* Right Sidebar: Fleet Status & Logs */}
        <div className="w-80 bg-slate-900/95 border-l border-slate-800 flex flex-col">
          <div className="flex-1 overflow-y-auto border-b border-slate-800">
            <FleetOverviewGrid />
          </div>
          <div className="h-48">
            <StatusMessageList />
          </div>
        </div>
      </div>
    </div>
  );
};
