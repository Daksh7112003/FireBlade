import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideoService } from './video.service';
import { VideoController } from './video.controller';
import { VideoSource } from '../../database/entities/VideoSource.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VideoSource])],
  providers: [VideoService],
  controllers: [VideoController],
  exports: [VideoService],
})
export class VideoModule {}
