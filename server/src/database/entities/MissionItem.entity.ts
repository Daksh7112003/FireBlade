import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Mission } from './Mission.entity';

@Entity('mission_items')
export class MissionItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Mission, (mission) => mission.items, { onDelete: 'CASCADE' })
  mission: Mission;

  @Column({ type: 'int' })
  seq: number;

  @Column({ type: 'int', default: 16 }) // MAV_CMD_NAV_WAYPOINT
  command: number;

  @Column({ type: 'int', default: 3 }) // MAV_FRAME_GLOBAL_RELATIVE_ALT
  frame: number;

  @Column({ type: 'float', default: 0 })
  param1: number;

  @Column({ type: 'float', default: 0 })
  param2: number;

  @Column({ type: 'float', default: 0 })
  param3: number;

  @Column({ type: 'float', default: 0 })
  param4: number;

  @Column({ type: 'double precision' })
  latitude: number;

  @Column({ type: 'double precision' })
  longitude: number;

  @Column({ type: 'float' })
  altitude: number;

  @Column({ default: true })
  autocontinue: boolean;
}

