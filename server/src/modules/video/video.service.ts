import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VideoSource } from '../../database/entities/VideoSource.entity';

@Injectable()
export class VideoService {
  constructor(
    @InjectRepository(VideoSource)
    private readonly videoRepository: Repository<VideoSource>,
  ) {}

  async getStreams(): Promise<VideoSource[]> {
    return this.videoRepository.find({ where: { isActive: true } });
  }

  async getStreamForVehicle(vehicleId: string): Promise<VideoSource[]> {
    return this.videoRepository.find({ where: { vehicleId, isActive: true } });
  }
}

