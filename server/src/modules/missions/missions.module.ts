import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MissionsService } from './missions.service';
import { MissionsController } from './missions.controller';
import { Mission } from '../../database/entities/Mission.entity';
import { MissionItem } from '../../database/entities/MissionItem.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Mission, MissionItem])],
  providers: [MissionsService],
  controllers: [MissionsController],
  exports: [MissionsService],
})
export class MissionsModule {}

