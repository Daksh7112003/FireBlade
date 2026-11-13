import React, { useEffect, useRef, useState } from 'react';
import { Video, AlertCircle } from 'lucide-react';

interface Props {
  streamPath: string; // e.g. uav_1_cam_1
}

export const WebRtcPlayer: React.FC<Props> = ({ streamPath }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let pc: RTCPeerConnection | null = null;

    const startWhep = async () => {
      try {
        setError(null);
        pc = new RTCPeerConnection();

        pc.addTransceiver('video', { direction: 'recvonly' });

        pc.ontrack = (event) => {
          if (videoRef.current && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0];
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const response = await fetch(`/whep/live/${streamPath}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        });

        if (!response.ok) {
          throw new Error(`WHEP session error: HTTP ${response.status}`);
        }

        const answerSdp = await response.text();
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerSdp }));
      } catch (err: any) {
        setError(err.message || 'Video stream unreachable');
      }
    };

    startWhep();

    return () => {
      pc?.close();
    };
  }, [streamPath]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      {error ? (
        <div className="flex flex-col items-center text-slate-500 space-y-2">
          <AlertCircle className="w-10 h-10 text-amber-500" />
          <span className="text-sm font-mono">{error}</span>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain"
        />
      )}
      <div className="absolute top-2 left-2 flex items-center space-x-1.5 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs font-mono text-emerald-400">
        <Video className="w-3.5 h-3.5" />
        <span>LIVE | {streamPath}</span>
      </div>
    </div>
  );
};
