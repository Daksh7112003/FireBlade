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

      // Save base state
      ctx.save();

      // Clip to circular or rounded HUD area
      ctx.beginPath();
      ctx.arc(cx, cy, cx - 4, 0, Math.PI * 2);
      ctx.clip();

      // Rotate for Roll & Translate for Pitch
      ctx.translate(cx, cy);
      ctx.rotate((-roll * Math.PI) / 180);
      const pitchPixels = (pitch / 45) * (h / 2);

      // Sky gradient (Deep Tactical Blue to Slate)
      const skyGrad = ctx.createLinearGradient(0, -h * 1.5 + pitchPixels, 0, pitchPixels);
      skyGrad.addColorStop(0, '#0c4a6e');
      skyGrad.addColorStop(1, '#0284c7');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(-w * 2, -h * 2 + pitchPixels, w * 4, h * 2);

      // Ground gradient (Dark Slate Earth)
      const groundGrad = ctx.createLinearGradient(0, pitchPixels, 0, h * 1.5 + pitchPixels);
      groundGrad.addColorStop(0, '#1c1917');
      groundGrad.addColorStop(1, '#0c0a09');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(-w * 2, pitchPixels, w * 4, h * 2);

      // Horizon Line
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-w * 2, pitchPixels);
      ctx.lineTo(w * 2, pitchPixels);
      ctx.stroke();

      // Pitch Ladder Lines (+/- 5, 10, 15, 20 deg)
      ctx.fillStyle = '#ffffff';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const pitchIncrements = [-20, -15, -10, -5, 5, 10, 15, 20];
      for (const deg of pitchIncrements) {
        const y = pitchPixels - (deg / 45) * (h / 2);
        const lineWidth = Math.abs(deg) % 10 === 0 ? 36 : 20;

        ctx.strokeStyle = deg > 0 ? '#38bdf8' : '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-lineWidth, y);
        ctx.lineTo(lineWidth, y);
        ctx.stroke();

        // Degree label
        if (Math.abs(deg) % 10 === 0) {
          ctx.fillText(deg.toString(), -lineWidth - 12, y);
          ctx.fillText(deg.toString(), lineWidth + 12, y);
        }
      }

      ctx.restore();

      // Fixed Roll Arc & Marks (at top)
      ctx.save();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, cx - 12, (210 * Math.PI) / 180, (330 * Math.PI) / 180);
      ctx.stroke();

      // Zero roll tick at top
      ctx.strokeStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(cx, cy - cx + 4);
      ctx.lineTo(cx, cy - cx + 14);
      ctx.stroke();
      ctx.restore();

      // Fixed Aircraft Bore-Sight Reticle
      ctx.save();
      ctx.strokeStyle = '#facc15';
      ctx.fillStyle = '#facc15';
      ctx.lineWidth = 2.5;

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Left reticle wing
      ctx.beginPath();
      ctx.moveTo(cx - 36, cy);
      ctx.lineTo(cx - 14, cy);
      ctx.lineTo(cx - 14, cy + 6);
      ctx.stroke();

      // Right reticle wing
      ctx.beginPath();
      ctx.moveTo(cx + 36, cy);
      ctx.lineTo(cx + 14, cy);
      ctx.lineTo(cx + 14, cy + 6);
      ctx.stroke();

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [vehicleId]);

  return (
    <canvas
      ref={canvasRef}
      width={220}
      height={220}
      className="w-full h-full rounded-full border border-slate-700/60 shadow-xl bg-slate-950/80"
    />
  );
};
