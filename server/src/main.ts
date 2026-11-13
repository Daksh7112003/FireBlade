import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AuthService } from './modules/auth/auth.service';

async function bootstrap() {
  const logger = new Logger('FirebladeServer');
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: '*' });
  app.useWebSocketAdapter(new IoAdapter(app));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Seed default admin if user table empty
  const authService = app.get(AuthService);
  await authService.seedAdminIfEmpty();

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`====================================================`);
  logger.log(`Fireblade GCS Core Backend listening on port ${port}`);
  logger.log(`REST Endpoints: http://0.0.0.0:${port}/api/v1`);
  logger.log(`WebSocket Gateway: ws://0.0.0.0:${port}/telemetry`);
  logger.log(`====================================================`);
}

bootstrap();
