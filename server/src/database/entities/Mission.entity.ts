import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { MissionItem } from './MissionItem.entity';

@Entity('missions')
export class Mission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 128 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  authorId: string;

  @Column({ nullable: true })
  assignedVehicleId: string;

  @Column({ type: 'float', default: 50.0 })
  defaultAltitude: number;

  @Column({ type: 'float', default: 12.0 })
  cruiseSpeed: number;

  @OneToMany(() => MissionItem, (item) => item.mission, { cascade: true })
  items: MissionItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

