import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/telemetry',
})
@Injectable()
export class TelemetryGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TelemetryGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to telemetry: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from telemetry: ${client.id}`);
  }

  @SubscribeMessage('subscribe:vehicle')
  handleSubscribe(client: Socket, payload: { vehicleId: string }) {
    const room = `uav_${payload.vehicleId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room}`);
    return { status: 'subscribed', room };
  }

  @SubscribeMessage('unsubscribe:vehicle')
  handleUnsubscribe(client: Socket, payload: { vehicleId: string }) {
    const room = `uav_${payload.vehicleId}`;
    client.leave(room);
    return { status: 'unsubscribed', room };
  }

  broadcastTelemetry(vehicleId: string, data: any) {
    if (this.server) {
      this.server.to(`uav_${vehicleId}`).emit('vehicle:telemetry:update', data);
    }
  }

  broadcastAlert(vehicleId: string, alert: any) {
    if (this.server) {
      this.server.emit('vehicle:alert', { vehicleId, ...alert });
    }
  }
}
