import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { CommandsModule } from './modules/commands/commands.module';
import { MissionsModule } from './modules/missions/missions.module';
import { VideoModule } from './modules/video/video.module';
import { SystemModule } from './modules/system/system.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    VehiclesModule,
    TelemetryModule,
    CommandsModule,
    MissionsModule,
    VideoModule,
    SystemModule,
  ],
})
export class AppModule {}
