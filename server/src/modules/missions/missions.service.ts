import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mission } from '../../database/entities/Mission.entity';
import { MissionItem } from '../../database/entities/MissionItem.entity';

@Injectable()
export class MissionsService {
  constructor(
    @InjectRepository(Mission)
    private readonly missionRepository: Repository<Mission>,
    @InjectRepository(MissionItem)
    private readonly itemRepository: Repository<MissionItem>,
  ) {}

  async findAll(): Promise<Mission[]> {
    return this.missionRepository.find({ relations: ['items'], order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Mission> {
    const mission = await this.missionRepository.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!mission) {
      throw new NotFoundException(`Mission ${id} not found`);
    }
    return mission;
  }

  async create(data: Partial<Mission>, items: Partial<MissionItem>[]): Promise<Mission> {
    const mission = this.missionRepository.create(data);
    const saved = await this.missionRepository.save(mission);

    if (items && items.length > 0) {
      const missionItems = items.map((it, idx) =>
        this.itemRepository.create({
          ...it,
          seq: idx,
          mission: saved,
        }),
      );
      await this.itemRepository.save(missionItems);
    }

    return this.findOne(saved.id);
  }
}
