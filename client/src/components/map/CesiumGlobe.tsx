import React, { useEffect, useRef } from 'react';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { useMissionStore } from '../../stores/missionStore';

declare const Cesium: any;

interface Props {
  selectedVehicleId: string;
}

export const CesiumGlobe: React.FC<Props> = ({ selectedVehicleId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const droneEntityRef = useRef<any>(null);
  const pathEntityRef = useRef<any>(null);

  const waypoints = useMissionStore((s) => s.waypoints);

  useEffect(() => {
    if (!containerRef.current || typeof Cesium === 'undefined') return;

    try {
      // Initialize Cesium 3D Viewer
      const viewer = new Cesium.Viewer(containerRef.current, {
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        scene3DOnly: true,
      });

      viewerRef.current = viewer;

      // Dark tactical space atmosphere
      viewer.scene.globe.enableLighting = true;
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0b0f19');

      // Add 3D Drone Entity
      const initialPos = Cesium.Cartesian3.fromDegrees(-122.4194, 37.7749, 50);
      droneEntityRef.current = viewer.entities.add({
        position: initialPos,
        point: {
          pixelSize: 14,
          color: Cesium.Color.CYAN,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
        },
        label: {
          text: `UAV-${selectedVehicleId}`,
          font: '12px monospace',
          fillColor: Cesium.Color.CYAN,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -20),
        },
      });

      // Camera fly to initial location
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-122.4194, 37.7749, 1500),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-45),
          roll: 0.0,
        },
        duration: 1.5,
      });

      return () => {
        viewer.destroy();
      };
    } catch (err) {
      console.error('Cesium initialization error:', err);
    }
  }, [selectedVehicleId]);

  // Update 3D Mission Flight Corridor
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || typeof Cesium === 'undefined' || waypoints.length < 2) return;

    if (pathEntityRef.current) {
      viewer.entities.remove(pathEntityRef.current);
    }

    const positions = waypoints.map((wp) =>
      Cesium.Cartesian3.fromDegrees(wp.lon, wp.lat, wp.alt || 50)
    );

    pathEntityRef.current = viewer.entities.add({
      polyline: {
        positions: positions,
        width: 3,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.2,
          color: Cesium.Color.YELLOW,
        }),
      },
    });
  }, [waypoints]);

  // Update 3D Drone Position on Live Telemetry
  useEffect(() => {
    const unsub = useTelemetryStore.subscribe((state) => {
      const telem = state.vehicles[selectedVehicleId];
      if (telem && telem.latitude && telem.longitude && droneEntityRef.current && typeof Cesium !== 'undefined') {
        const newPos = Cesium.Cartesian3.fromDegrees(
          telem.longitude,
          telem.latitude,
          telem.altitudeAgl || 50
        );
        droneEntityRef.current.position = newPos;
      }
    });

    return () => unsub();
  }, [selectedVehicleId]);

  return (
    <div className="relative w-full h-full bg-slate-950">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-4 left-4 z-10 bg-slate-950/80 border border-cyan-500/40 backdrop-blur px-3 py-1 rounded text-xs font-mono text-cyan-300">
        3D CESIUM GLOBE ACTIVE
      </div>
    </div>
  );
};
