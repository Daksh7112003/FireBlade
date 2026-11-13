import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { redisConfig } from '../../config/redis.config';

@Injectable()
export class LeaseService {
  private redis: Redis;
  private readonly logger = new Logger(LeaseService.name);

  constructor() {
    const config = redisConfig();
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
    });
  }

  async acquireLease(vehicleId: string, operatorId: string, ttlSeconds = 30): Promise<boolean> {
    const key = `control:lease:uav_${vehicleId}`;
    // Atomic SET NX EX ensures mutual exclusion
    const result = await this.redis.set(key, operatorId, 'EX', ttlSeconds, 'NX');
    if (result === 'OK') {
      this.logger.log(`Control lease granted for UAV ${vehicleId} to operator ${operatorId}`);
      return true;
    }
    // Check if operator already holds the lease
    const current = await this.redis.get(key);
    return current === operatorId;
  }

  async verifyLease(vehicleId: string, operatorId: string): Promise<boolean> {
    const key = `control:lease:uav_${vehicleId}`;
    const current = await this.redis.get(key);
    return current === operatorId;
  }

  async releaseLease(vehicleId: string, operatorId: string): Promise<void> {
    const key = `control:lease:uav_${vehicleId}`;
    const current = await this.redis.get(key);
    if (current === operatorId) {
      await this.redis.del(key);
      this.logger.log(`Control lease released for UAV ${vehicleId}`);
    }
  }

  async forcePreempt(vehicleId: string, commanderId: string): Promise<void> {
    const key = `control:lease:uav_${vehicleId}`;
    await this.redis.set(key, commanderId, 'EX', 30);
    this.logger.warn(`Control lease for UAV ${vehicleId} forcibly preempted by commander ${commanderId}`);
  }
}
