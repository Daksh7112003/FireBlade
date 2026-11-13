import { useEffect } from 'express';
import { io, Socket } from 'socket.io-client';
import { useTelemetryStore } from '../stores/telemetryStore';
import { useEffect as useReactEffect } from 'react';

let socket: Socket | null = null;

export const useTelemetry = (activeVehicleId: string | null) => {
  const updateTelemetry = useTelemetryStore((s) => s.updateTelemetry);

  useReactEffect(() => {
    if (!socket) {
      socket = io('/telemetry', {
        transports: ['websocket'],
      });

      socket.on('vehicle:telemetry:update', (data) => {
        updateTelemetry(data.sysId?.toString() || '1', data);
      });
    }

    if (activeVehicleId && socket) {
      socket.emit('subscribe:vehicle', { vehicleId: activeVehicleId });
    }

    return () => {
      if (activeVehicleId && socket) {
        socket.emit('unsubscribe:vehicle', { vehicleId: activeVehicleId });
      }
    };
  }, [activeVehicleId, updateTelemetry]);
};

