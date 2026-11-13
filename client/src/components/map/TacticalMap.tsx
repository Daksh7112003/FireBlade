import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useTelemetryStore } from '../../stores/telemetryStore';

interface Props {
  selectedVehicleId: string;
}

export const TacticalMap: React.FC<Props> = ({ selectedVehicleId }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);

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
      zoom: 14,
    });

    const el = document.createElement('div');
    el.className = 'w-6 h-6 bg-cyan-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center';
    el.innerHTML = '<div class="w-2 h-2 bg-white rounded-full"></div>';

    marker.current = new maplibregl.Marker({ element: el })
      .setLngLat([-122.4194, 37.7749])
      .addTo(map.current);

    return () => {
      map.current?.remove();
    };
  }, []);

  // Update position on telemetry
  useEffect(() => {
    const unsub = useTelemetryStore.subscribe((state) => {
      const telem = state.vehicles[selectedVehicleId];
      if (telem && telem.latitude && telem.longitude && marker.current) {
        marker.current.setLngLat([telem.longitude, telem.latitude]);
      }
    });

    return () => unsub();
  }, [selectedVehicleId]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};

