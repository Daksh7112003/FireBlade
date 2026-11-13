import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum VehicleType {
  QUADROTOR = 'QUADROTOR',
  HEXACOPTER = 'HEXACOPTER',
  FIXED_WING = 'FIXED_WING',
  VTOL = 'VTOL',
}

export enum AutopilotType {
  PX4 = 'PX4',
  ARDUPILOT = 'ARDUPILOT',
}

@Entity('vehicles')
export class Vehicle {
  @PrimaryColumn({ length: 64 })
  id: string; // e.g. uav_01

  @Column({ unique: true })
  sysId: number; // MAVLink System ID 1..255

  @Column({ length: 128 })
  name: string;

  @Column({ type: 'enum', enum: VehicleType, default: VehicleType.QUADROTOR })
  type: VehicleType;

  @Column({ type: 'enum', enum: AutopilotType, default: AutopilotType.PX4 })
  autopilot: AutopilotType;

  @Column({ length: 64, nullable: true })
  firmwareVersion: string;

  @Column({ length: 128, nullable: true })
  connectionEndpoint: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

