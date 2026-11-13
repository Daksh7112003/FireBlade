import React, { useEffect, useRef, useState } from 'react';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { useMissionStore } from '../../stores/missionStore';
import { RotateCcw, Layers, MapPin, Eye, Compass, ShieldAlert } from 'lucide-react';

declare const Cesium: any;

interface Props {
  selectedVehicleId: string;
}

type GlobeLayer = 'satellite' | 'dark' | 'streets';

export const CesiumGlobe: React.FC<Props> = ({ selectedVehicleId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const droneEntityRef = useRef<any>(null);
  const pathEntityRef = useRef<any>(null);
  const waypointEntitiesRef = useRef<any[]>([]);
  const currentLayerRef = useRef<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<GlobeLayer>('satellite');
  const [showLayerPicker, setShowLayerPicker] = useState(false);
  const [cameraMode, setCameraMode] = useState<'follow' | 'free'>('free');

  const { waypoints, defaultAlt, addWaypoint } = useMissionStore();

  const tileUrls: Record<GlobeLayer, string> = {
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    dark: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    streets: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  };

  // Initialize Cesium 3D Globe
  useEffect(() => {
    let isCancelled = false;

    const tryInitCesium = () => {
      if (typeof Cesium === 'undefined') {
        setIsLoading(true);
        const timer = setTimeout(tryInitCesium, 300);
        return () => clearTimeout(timer);
      }

      if (!containerRef.current || viewerRef.current) return;

      // Ensure container has rendered geometry before initializing WebGL
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        requestAnimationFrame(tryInitCesium);
        return;
      }

      try {
        // Disable Cesium Ion token requirements
        if (Cesium.Ion) {
          Cesium.Ion.defaultAccessToken = '';
        }

        // Fast raster XYZ imagery provider (no external metadata query)
        const imageryProvider = new Cesium.UrlTemplateImageryProvider({
          url: tileUrls[activeLayer],
          maximumLevel: 19,
          credit: 'Fireblade Tactical 3D Engine',
        });

        const viewer = new Cesium.Viewer(containerRef.current, {
          baseLayer: new Cesium.ImageryLayer(imageryProvider),
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
          scene3DOnly: false,
          shouldAnimate: true,
          requestRenderMode: false,
          orderIndependentTranslucency: false,
          contextOptions: {
            webgl: {
              alpha: false,
              preserveDrawingBuffer: false,
            },
          },
        });

        if (isCancelled) {
          viewer.destroy();
          return;
        }

        viewerRef.current = viewer;
        currentLayerRef.current = viewer.imageryLayers.get(0);

        // Hide bottom credit container for clean military UI
        if (viewer.cesiumWidget?.creditContainer) {
          (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = 'none';
        }

        // Atmosphere and render settings
        viewer.scene.globe.enableLighting = false;
        viewer.scene.globe.depthTestAgainstTerrain = false; // Always show pins on top
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#020617');
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#020617');

        // Safe render error handling
        viewer.scene.renderError.addEventListener((err: any) => {
          console.warn('[Cesium 3D Globe] Render notification:', err);
        });

        // Initialize Drone Telemetry Entity
        const telem = useTelemetryStore.getState().vehicles[selectedVehicleId];
        const lon = telem?.longitude || -122.4194;
        const lat = telem?.latitude || 37.7749;
        const alt = (telem?.altitudeAgl || 60) + 10;

        droneEntityRef.current = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
          point: {
            pixelSize: 16,
            color: Cesium.Color.fromCssColorString('#06b6d4'),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 3,
            heightReference: Cesium.HeightReference.NONE,
          },
          label: {
            text: `UAV-${selectedVehicleId}`,
            font: 'bold 11px monospace',
            fillColor: Cesium.Color.fromCssColorString('#38bdf8'),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -24),
            heightReference: Cesium.HeightReference.NONE,
          },
        });

        // Click-To-Add Waypoint on 3D Globe
        const clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        clickHandler.setInputAction((click: any) => {
          const ray = viewer.camera.getPickRay(click.position);
          if (!ray) return;
          const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
          if (cartesian) {
            const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            const dropLon = Number(Cesium.Math.toDegrees(cartographic.longitude).toFixed(6));
            const dropLat = Number(Cesium.Math.toDegrees(cartographic.latitude).toFixed(6));

            addWaypoint({
              lat: dropLat,
              lon: dropLon,
              alt: defaultAlt,
              cmd: 'WAYPOINT',
            });
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Smooth Camera Fly-In
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(lon, lat, 1400),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-45),
            roll: 0.0,
          },
          duration: 1.5,
        });

        setIsLoading(false);
        setLoadError(null);

        // Force viewport update
        setTimeout(() => {
          viewer.resize();
        }, 150);
      } catch (err: any) {
        console.error('Cesium Globe initialization failed:', err);
        setLoadError(err.message || 'Failed to initialize WebGL context');
        setIsLoading(false);
      }
    };

    const cleanup = tryInitCesium();

    const handleResize = () => {
      viewerRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isCancelled = true;
      if (typeof cleanup === 'function') cleanup();
      window.removeEventListener('resize', handleResize);
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch {}
        viewerRef.current = null;
      }
    };
  }, [selectedVehicleId]);

  // Switch Imagery Layers (Satellite vs Dark vs Streets)
  const handleLayerChange = (layer: GlobeLayer) => {
    setActiveLayer(layer);
    setShowLayerPicker(false);
    const viewer = viewerRef.current;
    if (!viewer || typeof Cesium === 'undefined') return;

    try {
      if (currentLayerRef.current) {
        viewer.imageryLayers.remove(currentLayerRef.current, true);
      }
      const newProvider = new Cesium.UrlTemplateImageryProvider({
        url: tileUrls[layer],
        maximumLevel: 19,
      });
      currentLayerRef.current = viewer.imageryLayers.addImageryProvider(newProvider, 0);
    } catch (e) {
      console.warn('Failed to switch 3D imagery layer:', e);
    }
  };

  // Render 3D Waypoints & Flight Corridor Line
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || typeof Cesium === 'undefined') return;

    try {
      // Clear previous waypoint markers
      waypointEntitiesRef.current.forEach((entity) => viewer.entities.remove(entity));
      waypointEntitiesRef.current = [];

      if (pathEntityRef.current) {
        viewer.entities.remove(pathEntityRef.current);
        pathEntityRef.current = null;
      }

      if (waypoints.length === 0) return;

      // 1. Render Each 3D Waypoint Pin with Altitude Drop-Line
      waypoints.forEach((wp) => {
        const alt = wp.alt || 50;
        const color =
          wp.cmd === 'TAKEOFF'
            ? Cesium.Color.fromCssColorString('#10b981')
            : wp.cmd === 'RTL'
            ? Cesium.Color.fromCssColorString('#f97316')
            : Cesium.Color.fromCssColorString('#facc15');

        // Waypoint Sphere Marker at Target Altitude
        const wpEntity = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(wp.lon, wp.lat, alt),
          point: {
            pixelSize: 13,
            color: color,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2.5,
            heightReference: Cesium.HeightReference.NONE,
          },
          label: {
            text: `WP ${wp.seq} [${alt}m]`,
            font: 'bold 10px monospace',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -18),
            heightReference: Cesium.HeightReference.NONE,
          },
          // Vertical Altitude Guide Line down to surface
          polyline: {
            positions: [
              Cesium.Cartesian3.fromDegrees(wp.lon, wp.lat, alt),
              Cesium.Cartesian3.fromDegrees(wp.lon, wp.lat, 0),
            ],
            width: 1.5,
            material: new Cesium.PolylineDashMaterialProperty({
              color: color.withAlpha(0.6),
              dashLength: 8.0,
            }),
          },
        });

        waypointEntitiesRef.current.push(wpEntity);
      });

      // 2. Render 3D Flight Corridor Ribbon
      if (waypoints.length >= 2) {
        const corridorPositions = waypoints.map((wp) =>
          Cesium.Cartesian3.fromDegrees(wp.lon, wp.lat, wp.alt || 50)
        );

        pathEntityRef.current = viewer.entities.add({
          polyline: {
            positions: corridorPositions,
            width: 4.0,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.3,
              color: Cesium.Color.fromCssColorString('#06b6d4'),
            }),
          },
        });
      }
    } catch (err) {
      console.warn('3D Waypoint render warning:', err);
    }
  }, [waypoints]);

  // Real-time Drone Telemetry Updates
  useEffect(() => {
    const unsub = useTelemetryStore.subscribe((state) => {
      const telem = state.vehicles[selectedVehicleId];
      const viewer = viewerRef.current;
      if (
        telem &&
        telem.latitude &&
        telem.longitude &&
        droneEntityRef.current &&
        typeof Cesium !== 'undefined'
      ) {
        const alt = (telem.altitudeAgl || 0) + 12;
        const newPos = Cesium.Cartesian3.fromDegrees(telem.longitude, telem.latitude, alt);
        droneEntityRef.current.position = newPos;

        if (cameraMode === 'follow' && viewer) {
          viewer.camera.lookAt(
            newPos,
            new Cesium.HeadingPitchRange(
              Cesium.Math.toRadians(telem.yaw || 0),
              Cesium.Math.toRadians(-35),
              800
            )
          );
        }
      }
    });

    return () => unsub();
  }, [selectedVehicleId, cameraMode]);

  // Camera Actions
  const flyToDrone = () => {
    const viewer = viewerRef.current;
    const telem = useTelemetryStore.getState().vehicles[selectedVehicleId];
    if (viewer && telem && typeof Cesium !== 'undefined') {
      viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY); // Release camera lock if any
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          telem.longitude || -122.4194,
          telem.latitude || 37.7749,
          1200
        ),
        orientation: {
          heading: Cesium.Math.toRadians(telem.yaw || 0),
          pitch: Cesium.Math.toRadians(-45),
          roll: 0.0,
        },
        duration: 1.0,
      });
    }
  };

  const topDownView = () => {
    const viewer = viewerRef.current;
    const telem = useTelemetryStore.getState().vehicles[selectedVehicleId];
    if (viewer && telem && typeof Cesium !== 'undefined') {
      viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          telem.longitude || -122.4194,
          telem.latitude || 37.7749,
          2500
        ),
        orientation: {
          heading: 0,
          pitch: Cesium.Math.toRadians(-90),
          roll: 0.0,
        },
        duration: 1.0,
      });
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden">
      {/* Cesium WebGL Viewport Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading & Status Indicator */}
      {isLoading && (
        <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mb-4"></div>
          <h3 className="text-white font-bold text-sm mb-1 tracking-wider">INITIALIZING 3D GLOBE ENGINE</h3>
          <p className="text-slate-400 text-xs font-mono">Loading satellite imagery &amp; WebGL shaders...</p>
        </div>
      )}

      {/* Error Fallback */}
      {loadError && (
        <div className="absolute inset-0 z-30 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center">
          <ShieldAlert className="w-10 h-10 text-amber-400 mb-3" />
          <h3 className="text-white font-bold text-sm mb-1">3D Context Warning</h3>
          <p className="text-slate-400 text-xs font-mono max-w-md mb-4">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold transition"
          >
            Reload Engine
          </button>
        </div>
      )}

      {/* Top Left Live Status Pill */}
      <div className="absolute top-4 left-4 z-20 flex items-center space-x-2">
        <div className="bg-slate-950/90 border border-cyan-500/50 backdrop-blur px-3 py-1.5 rounded-full text-xs font-mono text-cyan-300 shadow-xl flex items-center space-x-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="font-bold">CESIUM 3D GLOBE</span>
          <span className="text-[10px] text-slate-400 uppercase font-sans">({activeLayer})</span>
        </div>

        {/* Quick Helper Pill */}
        <div className="hidden md:flex items-center space-x-1 px-2.5 py-1 bg-slate-900/80 border border-slate-700/60 rounded-full text-[11px] text-slate-300 font-mono">
          <MapPin className="w-3 h-3 text-yellow-400" />
          <span>Click globe to drop 3D waypoint</span>
        </div>
      </div>

      {/* Top Right Tactical Controls Toolbar */}
      <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
        {/* Layer Selector */}
        <div className="relative">
          <button
            onClick={() => setShowLayerPicker(!showLayerPicker)}
            className="p-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg shadow-xl transition flex items-center space-x-1.5 text-xs font-medium"
            title="Imagery Layer"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline capitalize">{activeLayer}</span>
          </button>

          {showLayerPicker && (
            <div className="absolute right-0 mt-2 w-40 bg-slate-900/95 border border-slate-700 rounded-lg shadow-2xl p-1.5 flex flex-col space-y-1 backdrop-blur z-30">
              <button
                onClick={() => handleLayerChange('satellite')}
                className={`text-left px-2.5 py-1.5 rounded text-xs transition flex items-center justify-between ${
                  activeLayer === 'satellite' ? 'bg-cyan-600/30 text-cyan-300 font-bold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>Satellite (ArcGIS)</span>
                {activeLayer === 'satellite' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>}
              </button>
              <button
                onClick={() => handleLayerChange('dark')}
                className={`text-left px-2.5 py-1.5 rounded text-xs transition flex items-center justify-between ${
                  activeLayer === 'dark' ? 'bg-cyan-600/30 text-cyan-300 font-bold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>Tactical Dark</span>
                {activeLayer === 'dark' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>}
              </button>
              <button
                onClick={() => handleLayerChange('streets')}
                className={`text-left px-2.5 py-1.5 rounded text-xs transition flex items-center justify-between ${
                  activeLayer === 'streets' ? 'bg-cyan-600/30 text-cyan-300 font-bold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>OpenStreetMap</span>
                {activeLayer === 'streets' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>}
              </button>
            </div>
          )}
        </div>

        {/* Center / Fly to UAV */}
        <button
          onClick={flyToDrone}
          title="Center on UAV"
          className="p-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg shadow-xl transition"
        >
          <RotateCcw className="w-4 h-4 text-cyan-400" />
        </button>

        {/* Top-Down 2D Switcher */}
        <button
          onClick={topDownView}
          title="Top-Down 90° View"
          className="p-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg shadow-xl transition"
        >
          <Compass className="w-4 h-4 text-emerald-400" />
        </button>

        {/* Camera Follow Mode Toggle */}
        <button
          onClick={() => {
            const nextMode = cameraMode === 'follow' ? 'free' : 'follow';
            setCameraMode(nextMode);
            if (nextMode === 'free' && viewerRef.current) {
              viewerRef.current.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
            }
          }}
          title={cameraMode === 'follow' ? 'UAV Chase Camera Active' : 'Free Orbit Camera'}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold shadow-xl transition flex items-center space-x-1.5 ${
            cameraMode === 'follow'
              ? 'bg-cyan-600 border-cyan-400 text-white'
              : 'bg-slate-900/90 border-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{cameraMode === 'follow' ? 'FOLLOWING' : 'FREE CAM'}</span>
        </button>
      </div>
    </div>
  );
};
