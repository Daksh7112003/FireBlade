import { apiClient } from './client';
import { MissionDto } from '../types/mission.types';

export const fetchMissions = async () => {
  const response = await apiClient.get('/missions');
  return response.data;
};

export const createMission = async (mission: MissionDto) => {
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
};

