export interface VehicleTelemetry {
  sysId: number;
  timestamp: number;
  pitch: number;
  roll: number;
  yaw: number;
  latitude: number;
  longitude: number;
  altitudeMsl: number;
  altitudeAgl: number;
  groundSpeed: number;
  climbRate: number;
  batteryPct: number;
  batteryVoltage: number;
  flightMode: string;
  armed: boolean;
  gpsFix?: string;
  satellites?: number;
}
