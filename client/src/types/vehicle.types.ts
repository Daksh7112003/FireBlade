export interface Vehicle {
  id: string;
  sysId: number;
  name: string;
  type: 'QUADROTOR' | 'HEXACOPTER' | 'FIXED_WING' | 'VTOL';
  autopilot: 'PX4' | 'ARDUPILOT';
  firmwareVersion?: string;
  connectionEndpoint?: string;
  isActive: boolean;
  createdAt: string;
}
