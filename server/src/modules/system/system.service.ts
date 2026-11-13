import { Injectable } from '@nestjs/common';
import * as os from 'os';

@Injectable()
export class SystemService {
  getSystemHealth() {
    return {
      status: 'UP',
      uptime: os.uptime(),
      hostname: os.hostname(),
      loadAverage: os.loadavg(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpus: os.cpus().length,
      platform: os.platform(),
      timestamp: Date.now(),
    };
  }
}

