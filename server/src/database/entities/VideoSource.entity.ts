import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('video_sources')
export class VideoSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 64 })
  vehicleId: string;

  @Column({ length: 128 })
  cameraName: string;

  @Column({ length: 255 })
  rtspSourceUrl: string;

  @Column({ length: 128 })
  webrtcWhepPath: string;

  @Column({ type: 'int', default: 1920 })
  streamWidth: number;

  @Column({ type: 'int', default: 1080 })
  streamHeight: number;

  @Column({ type: 'int', default: 30 })
  framerate: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

