import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
  ADMIN = 'ADMIN',
  COMMANDER = 'COMMANDER',
  PILOT_IN_COMMAND = 'PILOT_IN_COMMAND',
  PAYLOAD_OPERATOR = 'PAYLOAD_OPERATOR',
  OBSERVER = 'OBSERVER',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 64 })
  username: string;

  @Column({ select: false })
  passwordHash: string;

  @Column({ length: 128 })
  displayName: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.OBSERVER })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

