import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Database module that configures TypeORM with async configuration.
 * Uses ConfigService to load database settings from environment.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const sslConfig = configService.get<boolean>('database.ssl');

        return {
          type: 'postgres',
          host: configService.get<string>('database.host') || 'localhost',
          port: configService.get<number>('database.port') || 5432,
          username: configService.get<string>('database.username') || 'postgres',
          password: configService.get<string>('database.password') || 'postgres',
          database: configService.get<string>('database.database') || 'cba',
          entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
          migrations: [__dirname + '/../migrations/*{.ts,.js}'],
          synchronize: configService.get<boolean>('database.synchronize') ?? false,
          logging: configService.get<boolean>('database.logging') ?? false,
          extra: configService.get('database.extra'),
          ssl: sslConfig ? { rejectUnauthorized: false } : false,
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
