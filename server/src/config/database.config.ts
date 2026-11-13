import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgres://fireblade_admin:fireblade_secure_pwd_2026@localhost:5432/fireblade',
  autoLoadEntities: true,
  synchronize: process.env.NODE_ENV !== 'production', // Use migrations in production
  logging: process.env.NODE_ENV === 'development',
});
