import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommandsService } from './commands.service';
import { CommandsController } from './commands.controller';
import { LeaseService } from './lease.service';
import { AuditLog } from '../../database/entities/AuditLog.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [CommandsService, LeaseService],
  controllers: [CommandsController],
  exports: [CommandsService, LeaseService],
})
export class CommandsModule {}
