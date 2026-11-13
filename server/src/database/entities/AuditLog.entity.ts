import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @CreateDateColumn()
  timestamp: Date;

  @Column({ length: 64 })
  operatorId: string;

  @Index()
  @Column({ length: 64 })
  vehicleId: string;

  @Column({ length: 64 })
  action: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any>;

  @Column({ length: 32, default: 'SUCCESS' })
  status: string;

  @Column({ length: 64, nullable: true })
  ipAddress: string;
}
