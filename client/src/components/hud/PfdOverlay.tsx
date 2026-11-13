import React from 'react';
import { ArtificialHorizon } from './ArtificialHorizon';
import { AltimeterTape } from './AltimeterTape';
import { AirspeedTape } from './AirspeedTape';
import { CompassRose } from './CompassRose';
import { useTelemetryStore } from '../../stores/telemetryStore';

interface Props {
  vehicleId: string;
}

export const PfdOverlay: React.FC<Props> = ({ vehicleId }) => {
  const telem = useTelemetryStore((s) => s.vehicles[vehicleId]) || {
    altitudeMsl: 0,
    altitudeAgl: 0,
    groundSpeed: 0,
    climbRate: 0,
    yaw: 0,
  };

  return (
    <div className="relative w-80 h-80 flex items-center justify-center pointer-events-none select-none">
      <div className="w-full h-full">
        <ArtificialHorizon vehicleId={vehicleId} />
      </div>

      <div className="absolute left-2 top-10 pointer-events-auto">
        <AirspeedTape groundSpeed={telem.groundSpeed || 0} />
      </div>

      <div className="absolute right-2 top-10 pointer-events-auto">
        <AltimeterTape
          altitudeMsl={telem.altitudeMsl || 0}
          altitudeAgl={telem.altitudeAgl || 0}
          climbRate={telem.climbRate || 0}
        />
      </div>

      <div className="absolute bottom-2 pointer-events-auto">
        <CompassRose heading={telem.yaw || 0} />
      </div>
    </div>
  );
};

