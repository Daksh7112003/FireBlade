import { Controller, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { CommandsService } from './commands.service';
import { LeaseService } from './lease.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/v1/vehicles')
@UseGuards(AuthGuard('jwt'))
export class CommandsController {
  constructor(
    private readonly commandsService: CommandsService,
    private readonly leaseService: LeaseService,
  ) {}

  @Post(':id/lease')
  async acquireLease(@Param('id') vehicleId: string, @Request() req: any) {
    const granted = await this.leaseService.acquireLease(vehicleId, req.user.id);
    return { granted, vehicleId, operatorId: req.user.id };
  }

  @Post(':id/release-lease')
  async releaseLease(@Param('id') vehicleId: string, @Request() req: any) {
    await this.leaseService.releaseLease(vehicleId, req.user.id);
    return { status: 'RELEASED', vehicleId };
  }

  @Post(':id/arm')
  async armVehicle(@Param('id') vehicleId: string, @Body() body: { arm: boolean }, @Request() req: any) {
    return this.commandsService.executeCommand(vehicleId, req.user.id, 'MAV_CMD_ARM', body);
  }

  @Post(':id/mode')
  async setMode(@Param('id') vehicleId: string, @Body() body: { mode: string }, @Request() req: any) {
    return this.commandsService.executeCommand(vehicleId, req.user.id, 'SET_FLIGHT_MODE', body);
  }

  @Post(':id/takeoff')
  async takeoff(@Param('id') vehicleId: string, @Body() body: { altitude: number }, @Request() req: any) {
    return this.commandsService.executeCommand(vehicleId, req.user.id, 'MAV_CMD_TAKEOFF', body);
  }

  @Post(':id/rtl')
  async rtl(@Param('id') vehicleId: string, @Request() req: any) {
    return this.commandsService.executeCommand(vehicleId, req.user.id, 'MAV_CMD_NAV_RTL', {});
  }
}

