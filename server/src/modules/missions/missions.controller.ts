import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { MissionsService } from './missions.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/v1/missions')
@UseGuards(AuthGuard('jwt'))
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @Get()
  async findAll() {
    return this.missionsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.missionsService.findOne(id);
  }

  @Post()
  async create(@Body() body: { mission: any; items: any[] }, @Request() req: any) {
    return this.missionsService.create(
      { ...body.mission, authorId: req.user.id },
      body.items,
    );
  }
}
