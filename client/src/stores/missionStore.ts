import { create } from 'zustand';

export interface Waypoint {
  seq: number;
  lat: number;
  lon: number;
  alt: number;
  cmd: string;
}

interface MissionState {
  waypoints: Waypoint[];
  setWaypoints: (waypoints: Waypoint[]) => void;
  addWaypoint: (wp: Waypoint) => void;
  removeWaypoint: (index: number) => void;
}

export const useMissionStore = create<MissionState>((set) => ({
  waypoints: [
    { seq: 0, lat: 37.7749, lon: -122.4194, alt: 30, cmd: 'TAKEOFF' },
    { seq: 1, lat: 37.7770, lon: -122.4170, alt: 50, cmd: 'WAYPOINT' },
    { seq: 2, lat: 37.7790, lon: -122.4210, alt: 50, cmd: 'WAYPOINT' },
    { seq: 3, lat: 37.7765, lon: -122.4230, alt: 40, cmd: 'WAYPOINT' },
    { seq: 4, lat: 37.7749, lon: -122.4194, alt: 30, cmd: 'RTL' },
  ],
  setWaypoints: (waypoints) => set({ waypoints }),
  addWaypoint: (wp) => set((s) => ({ waypoints: [...s.waypoints, wp] })),
  removeWaypoint: (index) =>
    set((s) => ({
      waypoints: s.waypoints
        .filter((_, i) => i !== index)
        .map((wp, idx) => ({ ...wp, seq: idx })),
    })),
}));
