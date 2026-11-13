import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('control_leases')
export class ControlLease {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 64 })
  vehicleId: string;

  @Column({ length: 64 })
  operatorId: string;

  @Column({ length: 64, nullable: true })
  workstationId: string;

  @CreateDateColumn()
  grantedAt: Date;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ length: 128, nullable: true })
  revocationReason: string;
}
