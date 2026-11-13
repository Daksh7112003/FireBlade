import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { TelemetryGateway } from './telemetry.gateway';
import Redis from 'ioredis';
import { redisConfig } from '../../config/redis.config';

@Injectable()
export class TelemetryService implements OnModuleInit, OnModuleDestroy {
  private redisSubscriber: Redis;
  private readonly logger = new Logger(TelemetryService.name);

  constructor(private readonly telemetryGateway: TelemetryGateway) {}

  onModuleInit() {
    const config = redisConfig();
    this.redisSubscriber = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this.redisSubscriber.subscribe('telemetry:broadcast', (err) => {
      if (err) {
        this.logger.error('Failed to subscribe to Redis telemetry channel', err);
      } else {
        this.logger.log('Subscribed to Redis telemetry:broadcast channel');
      }
    });

    this.redisSubscriber.on('message', (channel, message) => {
      if (channel === 'telemetry:broadcast') {
        try {
          const telem = JSON.parse(message);
          this.telemetryGateway.broadcastTelemetry(telem.sysId.toString(), telem);
        } catch (e) {
          this.logger.error('Error parsing telemetry JSON', e);
        }
      }
    });
  }

  onModuleDestroy() {
    if (this.redisSubscriber) {
      this.redisSubscriber.disconnect();
    }
  }
}
