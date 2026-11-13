import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { VideoService } from './video.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/v1/video')
@UseGuards(AuthGuard('jwt'))
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Get('streams')
  async getAllStreams() {
    return this.videoService.getStreams();
  }

  @Get('streams/:vehicleId')
  async getStreamForVehicle(@Param('vehicleId') vehicleId: string) {
    return this.videoService.getStreamForVehicle(vehicleId);
  }
}
