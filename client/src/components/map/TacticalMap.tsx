import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { useMissionStore } from '../../stores/missionStore';
import { Crosshair, MapPin } from 'lucide-react';

interface Props {
  selectedVehicleId: string;
  editable?: boolean;
}

export const TacticalMap: React.FC<Props> = ({ selectedVehicleId, editable = false }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const droneMarker = useRef<maplibregl.Marker | null>(null);
  const droneElement = useRef<HTMLDivElement | null>(null);
  const waypointMarkers = useRef<maplibregl.Marker[]>([]);
  const hasCentered = useRef(false);

  const { waypoints, defaultAlt, addWaypoint, updateWaypoint } = useMissionStore();

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
          },
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [-122.4194, 37.7749],
      zoom: 15,
    });

    if (editable) {
      map.current.getCanvas().style.cursor = 'crosshair';
    }

    // Create high-visibility tactical UAV marker
    const el = document.createElement('div');
    el.className = 'relative flex flex-col items-center cursor-pointer select-none';
    el.innerHTML = `
      <div class="relative flex items-center justify-center">
        <!-- Radar Pulse Ring -->
        <div class="absolute w-12 h-12 rounded-full bg-cyan-500/20 animate-ping"></div>
        <div class="absolute w-10 h-10 rounded-full border-2 border-cyan-400/40 bg-cyan-950/60"></div>
        
        <!-- Rotating Drone SVG Symbol -->
        <div id="uav-rotor-body" class="relative z-10 w-8 h-8 flex items-center justify-center transition-transform duration-100 ease-linear">
          <svg viewBox="0 0 36 36" class="w-8 h-8 drop-shadow-lg fill-cyan-400">
            <!-- Quadcopter arms -->
            <line x1="6" y1="6" x2="30" y2="30" stroke="#38bdf8" stroke-width="2.5" />
            <line x1="30" y1="6" x2="6" y2="30" stroke="#38bdf8" stroke-width="2.5" />
            <!-- Rotors -->
            <circle cx="6" cy="6" r="3.5" fill="#facc15" stroke="#0f172a" stroke-width="1" />
            <circle cx="30" cy="6" r="3.5" fill="#facc15" stroke="#0f172a" stroke-width="1" />
            <circle cx="6" cy="30" r="3.5" fill="#facc15" stroke="#0f172a" stroke-width="1" />
            <circle cx="30" cy="30" r="3.5" fill="#facc15" stroke="#0f172a" stroke-width="1" />
            <!-- Central fuselage with nose pointer -->
            <polygon points="18,6 23,26 18,22 13,26" fill="#38bdf8" stroke="#0f172a" stroke-width="1" />
          </svg>
        </div>
      </div>
      <!-- Callsign Badge -->
      <div class="mt-1 px-1.5 py-0.5 rounded bg-slate-950/90 border border-cyan-500/60 text-[9px] font-mono font-bold text-cyan-300 whitespace-nowrap shadow-md">
        UAV-${selectedVehicleId} <span id="uav-alt-badge" class="text-slate-400">0m</span>
      </div>
    `;

    droneElement.current = el;

    droneMarker.current = new maplibregl.Marker({ element: el })
      .setLngLat([-122.4194, 37.7749])
      .addTo(map.current);

    map.current.on('load', () => {
      if (!map.current) return;

      // Add GeoJSON source for flight corridor
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

      // Glow outline
      map.current.addLayer({
        id: 'mission-path-glow',
        type: 'line',
        source: 'mission-path',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#06b6d4',
          'line-width': 6,
          'line-opacity': 0.35,
        },
      });

      // Main dashed flight line
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

    // Click on map to add waypoint
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

    return () => {
      map.current?.remove();
    };
  }, [selectedVehicleId, editable, defaultAlt, addWaypoint]);

  // Update Mission Path & Draggable Waypoint Pins
  useEffect(() => {
    if (!map.current) return;

    // 1. Update GeoJSON flight corridor LineString
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

    // 2. Clear previous markers
    waypointMarkers.current.forEach((m) => m.remove());
    waypointMarkers.current = [];

    // 3. Re-render numbered pins (draggable if in edit mode)
    waypoints.forEach((wp, idx) => {
      const pin = document.createElement('div');
      pin.className = `flex items-center justify-center w-7 h-7 rounded-full border-2 font-mono text-[11px] font-bold shadow-xl cursor-grab transition active:cursor-grabbing ${
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

  // Telemetry updates (move drone marker & update heading rotation)
  useEffect(() => {
    const unsub = useTelemetryStore.subscribe((state) => {
      const telem = state.vehicles[selectedVehicleId];
      if (telem && telem.latitude && telem.longitude && droneMarker.current) {
        droneMarker.current.setLngLat([telem.longitude, telem.latitude]);

        // Auto-center map on first valid position
        if (!hasCentered.current && map.current && Math.abs(telem.latitude) > 0.001) {
          map.current.flyTo({ center: [telem.longitude, telem.latitude], zoom: 16 });
          hasCentered.current = true;
        }

        // Rotate drone body
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
          <span>Click anywhere on map to drop waypoint &bull; Drag pins to move</span>
        </div>
      )}

      {/* Center Drone Button */}
      <button
        onClick={centerOnUav}
        title="Center UAV on Map"
        className="absolute top-4 right-4 z-10 p-2 bg-slate-900/90 hover:bg-slate-800 text-cyan-400 border border-slate-700/80 rounded-lg shadow-xl backdrop-blur transition"
      >
        <Crosshair className="w-4 h-4" />
      </button>
    </div>
  );
};
