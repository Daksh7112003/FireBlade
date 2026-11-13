export interface MissionItemDto {
  seq: number;
  command: number;
  frame: number;
  latitude: number;
  longitude: number;
  altitude: number;
  param1?: number;
  param2?: number;
  param3?: number;
  param4?: number;
  autocontinue?: boolean;
}

export interface MissionDto {
  id?: string;
  name: string;
  description?: string;
  assignedVehicleId?: string;
  defaultAltitude: number;
  cruiseSpeed: number;
  items: MissionItemDto[];
}
