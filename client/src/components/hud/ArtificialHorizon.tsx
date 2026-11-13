import React, { useEffect, useRef } from 'react';
import { useTelemetryStore } from '../../stores/telemetryStore';

interface Props {
  vehicleId: string;
}

export const ArtificialHorizon: React.FC<Props> = ({ vehicleId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const telem = useTelemetryStore.getState().vehicles[vehicleId];
      const pitch = telem?.pitch || 0;
      const roll = telem?.roll || 0;

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);
      ctx.save();

      // Rotate for Roll & Translate for Pitch
      ctx.translate(cx, cy);
      ctx.rotate((-roll * Math.PI) / 180);
      const pitchPixels = (pitch / 45) * (h / 2);

      // Sky (Blue)
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-w, -h * 2 + pitchPixels, w * 2, h * 2);

      // Ground (Brown/Dark Slate)
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-w, pitchPixels, w * 2, h * 2);

      // Horizon Line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-w, pitchPixels);
      ctx.lineTo(w, pitchPixels);
      ctx.stroke();

      ctx.restore();

      // Fixed Aircraft Reference Symbol (Crosshairs)
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.beginPath();
      // Left wing
      ctx.moveTo(cx - 50, cy);
      ctx.lineTo(cx - 20, cy);
      ctx.lineTo(cx - 20, cy + 10);
      // Right wing
      ctx.moveTo(cx + 50, cy);
      ctx.lineTo(cx + 20, cy);
      ctx.lineTo(cx + 20, cy + 10);
      // Center pip
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [vehicleId]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={320}
      className="w-full h-full rounded-lg border border-slate-700/50 shadow-2xl"
    />
  );
};
