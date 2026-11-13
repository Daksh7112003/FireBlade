import React from 'react';
import { WebRtcPlayer } from '../components/video/WebRtcPlayer';

export const VideoWallPage: React.FC = () => {
  return (
    <div className="h-full w-full p-4 bg-tactical-dark">
      <h1 className="text-sm font-bold text-slate-400 mb-3 tracking-wider">MULTI-UAV VIDEO WALL (WEBRTC WHEP)</h1>
      <div className="grid grid-cols-2 gap-3 h-[calc(100%-2rem)]">
        <div className="rounded-lg overflow-hidden border border-slate-800">
          <WebRtcPlayer streamPath="uav_1_cam_1" />
        </div>
        <div className="rounded-lg overflow-hidden border border-slate-800">
          <WebRtcPlayer streamPath="uav_2_cam_1" />
        </div>
      </div>
    </div>
  );
};
