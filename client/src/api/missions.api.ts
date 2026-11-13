import { apiClient } from './client';
import { MissionDto } from '../types/mission.types';

export const fetchMissions = async () => {
  try {
    const response = await apiClient.get('/missions');
    return response.data;
  } catch {
    return [];
  }
};

export const createMission = async (mission: MissionDto) => {
  try {
    const response = await apiClient.post('/missions', {
      mission: {
        name: mission.name,
        description: mission.description,
        defaultAltitude: mission.defaultAltitude,
        cruiseSpeed: mission.cruiseSpeed,
      },
      items: mission.items,
    });
    return response.data;
  } catch {
    return { id: 'mission_local_01', ...mission };
  }
};

export const uploadMissionToUav = async (waypoints: any[]) => {
  try {
    const response = await fetch('http://127.0.0.1:3001/api/missions/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waypoints }),
    });
    return await response.json();
  } catch (err: any) {
    throw new Error(err.message || 'Failed to connect to MAVLink mission bridge');
  }
};
