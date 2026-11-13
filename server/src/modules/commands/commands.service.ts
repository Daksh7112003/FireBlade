import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { LeaseService } from './lease.service';
import Redis from 'ioredis';
import { redisConfig } from '../../config/redis.config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../database/entities/AuditLog.entity';

@Injectable()
export class CommandsService {
  private redisPublisher: Redis;
  private readonly logger = new Logger(CommandsService.name);

  constructor(
    private readonly leaseService: LeaseService,
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {
    const config = redisConfig();
    this.redisPublisher = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
    });
  }

  async executeCommand(
    vehicleId: string,
    operatorId: string,
    action: string,
    payload: Record<string, any>,
  ) {
    const hasLease = await this.leaseService.verifyLease(vehicleId, operatorId);
    if (!hasLease) {
      throw new ForbiddenException(`Operator ${operatorId} does not hold flight control lease for UAV ${vehicleId}`);
    }

    const commandMsg = {
      vehicleId,
      operatorId,
      action,
      payload,
      timestamp: Date.now(),
    };

    // Forward to Flight Core via Redis
    await this.redisPublisher.publish('commands:outgoing', JSON.stringify(commandMsg));

    // Persist immutable audit log
    const log = this.auditRepository.create({
      vehicleId,
      operatorId,
      action,
      payload,
      status: 'DISPATCHED',
    });
    await this.auditRepository.save(log);

    return {
      status: 'ACCEPTED',
      transactionId: log.id,
      action,
      timestamp: log.timestamp,
    };
  }
}

