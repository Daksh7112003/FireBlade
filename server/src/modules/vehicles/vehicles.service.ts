import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../../database/entities/Vehicle.entity';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
  ) {}

  async findAll(): Promise<Vehicle[]> {
    return this.vehicleRepository.find({ order: { sysId: 'ASC' } });
  }

  async findOne(id: string): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findOne({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }
    return vehicle;
  }

  async registerDiscovered(sysId: number, name?: string): Promise<Vehicle> {
    let vehicle = await this.vehicleRepository.findOne({ where: { sysId } });
    if (!vehicle) {
      vehicle = this.vehicleRepository.create({
        id: `uav_${sysId}`,
        sysId,
        name: name || `UAV-${sysId}`,
        isActive: true,
      });
      return this.vehicleRepository.save(vehicle);
    }
    return vehicle;
  }
}
