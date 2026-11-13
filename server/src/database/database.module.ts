import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from '../config/database.config';
import { User } from './entities/User.entity';
import { Vehicle } from './entities/Vehicle.entity';
import { Mission } from './entities/Mission.entity';
import { MissionItem } from './entities/MissionItem.entity';
import { ControlLease } from './entities/ControlLease.entity';
import { AuditLog } from './entities/AuditLog.entity';
import { VideoSource } from './entities/VideoSource.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => databaseConfig(),
    }),
    TypeOrmModule.forFeature([
      User,
      Vehicle,
      Mission,
      MissionItem,
      ControlLease,
      AuditLog,
      VideoSource,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}

