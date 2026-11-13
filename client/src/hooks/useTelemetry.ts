import { useEffect } from 'react';
import { useTelemetryStore } from '../stores/telemetryStore';

export const useTelemetry = (activeVehicleId: string | null) => {
  const updateTelemetry = useTelemetryStore((s) => s.updateTelemetry);

  useEffect(() => {
    // 1. Connect via native EventSource to local telemetry bridge
    let es: EventSource | null = null;
    try {
      es = new EventSource('http://127.0.0.1:3001/stream');

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.sysId && data.sysId !== 255 && data.sysId !== 0) {
            updateTelemetry(data.sysId.toString(), data);
          }
        } catch {
          // Ignore JSON parse errors
        }
      };

      es.onerror = () => {
        // EventSource will automatically reconnect
      };
    } catch {
      // Fallback
    }

    return () => {
      es?.close();
    };
  }, [activeVehicleId, updateTelemetry]);
};
