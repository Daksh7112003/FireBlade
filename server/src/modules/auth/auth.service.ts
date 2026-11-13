import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../database/entities/User.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { username },
      select: ['id', 'username', 'passwordHash', 'displayName', 'role', 'isActive'],
    });

    if (user && user.isActive && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { sub: user.id, username: user.username, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    };
  }

  async seedAdminIfEmpty() {
    const count = await this.userRepository.count();
    if (count === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      const admin = this.userRepository.create({
        username: 'admin',
        passwordHash: hash,
        displayName: 'System Administrator',
        role: UserRole.ADMIN,
      });
      await this.userRepository.save(admin);
    }
  }
}

