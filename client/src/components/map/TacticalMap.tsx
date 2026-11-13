import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { useMissionStore } from '../../stores/missionStore';
import { Crosshair, MapPin, Layers, Box } from 'lucide-react';

interface Props {
  selectedVehicleId: string;
  editable?: boolean;
}

type MapLayerType = 'satellite' | 'dark' | 'streets';

export const TacticalMap: React.FC<Props> = ({ selectedVehicleId, editable = false }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const droneMarker = useRef<maplibregl.Marker | null>(null);
  const droneElement = useRef<HTMLDivElement | null>(null);
  const waypointMarkers = useRef<maplibregl.Marker[]>([]);
  const hasCentered = useRef(false);

  const [activeLayer, setActiveLayer] = useState<MapLayerType>('satellite');
  const [is3dPitch, setIs3dPitch] = useState(true);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  const { waypoints, defaultAlt, addWaypoint, updateWaypoint } = useMissionStore();

  const tileSources: Record<MapLayerType, { url: string; maxzoom: number }> = {
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      maxzoom: 19,
    },
    dark: {
      url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      maxzoom: 19,
    },
    streets: {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      maxzoom: 19,
    },
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current) return;

    const telem = useTelemetryStore.getState().vehicles[selectedVehicleId];
    const initialCenter: [number, number] = [
      telem?.longitude || -122.4194,
      telem?.latitude || 37.7749,
    ];

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'base-tiles': {
            type: 'raster',
            tiles: [tileSources[activeLayer].url],
            tileSize: 256,
          },
          'terrain-source': {
            type: 'raster-dem',
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            encoding: 'terrarium',
            tileSize: 256,
            maxzoom: 15,
          },
        },
        layers: [
          {
            id: 'base-layer',
            type: 'raster',
            source: 'base-tiles',
            minzoom: 0,
            maxzoom: tileSources[activeLayer].maxzoom,
          },
        ],
      },
      center: initialCenter,
      zoom: 15,
      pitch: is3dPitch ? 55 : 0,
      bearing: is3dPitch ? -20 : 0,
      maxPitch: 80,
    });

    // Force canvas resize to ensure edge-to-edge rendering
    setTimeout(() => {
      map.current?.resize();
      if (is3dPitch && map.current) {
        try {
          map.current.setTerrain({ source: 'terrain-source', exaggeration: 1.5 });
        } catch {}
      }
    }, 150);

    if (editable) {
      map.current.getCanvas().style.cursor = 'crosshair';
    }

    // High-visibility tactical UAV marker
    const el = document.createElement('div');
    el.className = 'relative flex flex-col items-center cursor-pointer select-none';
    el.innerHTML = `
      <div class="relative flex items-center justify-center">
        <!-- Radar Pulse Ring -->
        <div class="absolute w-12 h-12 rounded-full bg-cyan-400/25 animate-ping"></div>
        <div class="absolute w-10 h-10 rounded-full border-2 border-cyan-400/60 bg-cyan-950/70 shadow-2xl"></div>
        
        <!-- Rotating Drone SVG Symbol -->
        <div id="uav-rotor-body" class="relative z-10 w-8 h-8 flex items-center justify-center transition-transform duration-100 ease-linear">
          <svg viewBox="0 0 36 36" class="w-8 h-8 drop-shadow-xl fill-cyan-400">
            <!-- Quadcopter arms -->
            <line x1="6" y1="6" x2="30" y2="30" stroke="#38bdf8" stroke-width="2.5" />
            <line x1="30" y1="6" x2="6" y2="30" stroke="#38bdf8" stroke-width="2.5" />
            <!-- Rotors -->
            <circle cx="6" cy="6" r="3.5" fill="#facc15" stroke="#0f172a" stroke-width="1" />
            <circle cx="30" cy="6" r="3.5" fill="#facc15" stroke="#0f172a" stroke-width="1" />
            <circle cx="6" cy="30" r="3.5" fill="#facc15" stroke="#0f172a" stroke-width="1" />
            <circle cx="30" cy="30" r="3.5" fill="#facc15" stroke="#0f172a" stroke-width="1" />
            <!-- Fuselage with forward nose -->
            <polygon points="18,5 24,26 18,21 12,26" fill="#38bdf8" stroke="#0f172a" stroke-width="1" />
          </svg>
        </div>
      </div>
      <!-- Callsign Badge -->
      <div class="mt-1 px-1.5 py-0.5 rounded bg-slate-950/90 border border-cyan-500/70 text-[9px] font-mono font-bold text-cyan-300 whitespace-nowrap shadow-xl">
        UAV-${selectedVehicleId} <span id="uav-alt-badge" class="text-slate-400">0m</span>
      </div>
    `;

    droneElement.current = el;

    droneMarker.current = new maplibregl.Marker({ element: el })
      .setLngLat(initialCenter)
      .addTo(map.current);

    map.current.on('load', () => {
      if (!map.current) return;

      map.current.addSource('mission-path', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: waypoints.map((wp) => [wp.lon, wp.lat]),
          },
        },
      });

      map.current.addLayer({
        id: 'mission-path-glow',
        type: 'line',
        source: 'mission-path',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#06b6d4',
          'line-width': 7,
          'line-opacity': 0.4,
        },
      });

      map.current.addLayer({
        id: 'mission-path-line',
        type: 'line',
        source: 'mission-path',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#facc15',
          'line-width': 2.5,
          'line-dasharray': [3, 2],
        },
      });
    });

    // Click map to drop waypoint
    map.current.on('click', (e) => {
      if (!editable) return;
      const { lng, lat } = e.lngLat;
      addWaypoint({
        lat: Number(lat.toFixed(6)),
        lon: Number(lng.toFixed(6)),
        alt: defaultAlt,
        cmd: 'WAYPOINT',
      });
    });

    const handleWindowResize = () => {
      map.current?.resize();
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      map.current?.remove();
    };
  }, [selectedVehicleId, editable]);

  // Handle Layer Switch
  const switchLayer = (type: MapLayerType) => {
    setActiveLayer(type);
    setShowLayerMenu(false);
    if (!map.current) return;

    map.current.setStyle({
      version: 8,
      sources: {
        'base-tiles': {
          type: 'raster',
          tiles: [tileSources[type].url],
          tileSize: 256,
        },
        'terrain-source': {
          type: 'raster-dem',
          tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
          encoding: 'terrarium',
          tileSize: 256,
          maxzoom: 15,
        },
        'mission-path': {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: waypoints.map((wp) => [wp.lon, wp.lat]),
            },
          },
        },
      },
      layers: [
        {
          id: 'base-layer',
          type: 'raster',
          source: 'base-tiles',
          minzoom: 0,
          maxzoom: tileSources[type].maxzoom,
        },
        {
          id: 'mission-path-glow',
          type: 'line',
          source: 'mission-path',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#06b6d4',
            'line-width': 7,
            'line-opacity': 0.4,
          },
        },
        {
          id: 'mission-path-line',
          type: 'line',
          source: 'mission-path',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#facc15',
            'line-width': 2.5,
            'line-dasharray': [3, 2],
          },
        },
      ],
    });

    if (is3dPitch) {
      setTimeout(() => {
        try {
          map.current?.setTerrain({ source: 'terrain-source', exaggeration: 1.5 });
        } catch {}
      }, 200);
    }
  };

  // Toggle 3D Pitch
  const toggle3dPitch = () => {
    if (!map.current) return;
    const nextState = !is3dPitch;
    const newPitch = nextState ? 55 : 0;
    const newBearing = nextState ? -20 : 0;
    map.current.easeTo({ pitch: newPitch, bearing: newBearing, duration: 800 });
    try {
      if (nextState) {
        map.current.setTerrain({ source: 'terrain-source', exaggeration: 1.5 });
      } else {
        map.current.setTerrain(null);
      }
    } catch {}
    setIs3dPitch(nextState);
  };

  // Update Mission Path & Draggable Pins
  useEffect(() => {
    if (!map.current) return;

    const source = map.current.getSource('mission-path') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: waypoints.map((wp) => [wp.lon, wp.lat]),
        },
      });
    }

    waypointMarkers.current.forEach((m) => m.remove());
    waypointMarkers.current = [];

    waypoints.forEach((wp, idx) => {
      const pin = document.createElement('div');
      pin.className = `flex items-center justify-center w-7 h-7 rounded-full border-2 font-mono text-[11px] font-bold shadow-2xl cursor-grab transition active:cursor-grabbing ${
        wp.cmd === 'TAKEOFF'
          ? 'bg-emerald-950 border-emerald-400 text-emerald-300'
          : wp.cmd === 'RTL'
          ? 'bg-amber-950 border-amber-400 text-amber-300'
          : 'bg-slate-900 border-yellow-400 text-yellow-300'
      }`;
      pin.innerText = `${wp.seq}`;

      const m = new maplibregl.Marker({
        element: pin,
        draggable: editable,
      })
        .setLngLat([wp.lon, wp.lat])
        .addTo(map.current!);

      if (editable) {
        m.on('dragend', () => {
          const lngLat = m.getLngLat();
          updateWaypoint(idx, {
            lat: Number(lngLat.lat.toFixed(6)),
            lon: Number(lngLat.lng.toFixed(6)),
          });
        });
      }

      waypointMarkers.current.push(m);
    });
  }, [waypoints, editable, updateWaypoint]);

  // Telemetry Position & Heading Updates
  useEffect(() => {
    const unsub = useTelemetryStore.subscribe((state) => {
      const telem = state.vehicles[selectedVehicleId];
      if (telem && telem.latitude && telem.longitude && droneMarker.current) {
        droneMarker.current.setLngLat([telem.longitude, telem.latitude]);

        if (!hasCentered.current && map.current && Math.abs(telem.latitude) > 0.001) {
          map.current.flyTo({ center: [telem.longitude, telem.latitude], zoom: 16 });
          hasCentered.current = true;
        }

        if (droneElement.current) {
          const rotorBody = droneElement.current.querySelector('#uav-rotor-body') as HTMLElement;
          if (rotorBody) {
            rotorBody.style.transform = `rotate(${telem.yaw || 0}deg)`;
          }
          const altBadge = droneElement.current.querySelector('#uav-alt-badge') as HTMLElement;
          if (altBadge) {
            altBadge.innerText = `${(telem.altitudeAgl || 0).toFixed(0)}m`;
          }
        }
      }
    });

    return () => unsub();
  }, [selectedVehicleId]);

  const centerOnUav = () => {
    const telem = useTelemetryStore.getState().vehicles[selectedVehicleId];
    if (telem && map.current && telem.latitude && telem.longitude) {
      map.current.flyTo({ center: [telem.longitude, telem.latitude], zoom: 16 });
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Interactive Helper Banner when editing mission */}
      {editable && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center space-x-2 bg-slate-950/90 border border-cyan-500/50 backdrop-blur px-3 py-1.5 rounded-full shadow-2xl text-xs font-mono text-cyan-300 pointer-events-none select-none">
          <MapPin className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Click map to drop waypoint &bull; Drag pins to move</span>
        </div>
      )}

      {/* Top-Right Control Buttons */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
        {/* Center UAV */}
        <button
          onClick={centerOnUav}
          title="Center UAV on Map"
          className="p-2 bg-slate-900/90 hover:bg-slate-800 text-cyan-400 border border-slate-700/80 rounded-lg shadow-xl backdrop-blur transition"
        >
          <Crosshair className="w-4 h-4" />
        </button>

        {/* 3D Angled Pitch Toggle */}
        <button
          onClick={toggle3dPitch}
          title={is3dPitch ? 'Switch to 2D Top-Down' : 'Switch to 3D Angled View'}
          className={`p-2 rounded-lg border shadow-xl backdrop-blur transition font-mono text-xs flex items-center justify-center ${
            is3dPitch
              ? 'bg-cyan-600 text-white border-cyan-400'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-700/80'
          }`}
        >
          <Box className="w-4 h-4" />
        </button>

        {/* Layer Switcher Button */}
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            title="Switch Map Layers"
            className="p-2 bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700/80 rounded-lg shadow-xl backdrop-blur transition"
          >
            <Layers className="w-4 h-4" />
          </button>

          {showLayerMenu && (
            <div className="absolute right-0 mt-1 w-36 bg-slate-900/95 border border-slate-700/80 rounded-lg shadow-2xl p-1 z-20 font-mono text-xs space-y-1">
              <button
                onClick={() => switchLayer('satellite')}
                className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between ${
                  activeLayer === 'satellite' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>🛰️ Satellite</span>
              </button>
              <button
                onClick={() => switchLayer('dark')}
                className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between ${
                  activeLayer === 'dark' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>🌑 Dark Tactical</span>
              </button>
              <button
                onClick={() => switchLayer('streets')}
                className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between ${
                  activeLayer === 'streets' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>🗺️ Streets</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
