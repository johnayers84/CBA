import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { SeatTokenStrategy } from './strategies/seat-token.strategy';
import { User } from '../entities/user.entity';
import { Table } from '../entities/table.entity';
import { Seat } from '../entities/seat.entity';

/**
 * Authentication module providing JWT-based authentication for users
 * and seat-token authentication for judges.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN') || '24h';
        return {
          secret: configService.get<string>('JWT_SECRET') || 'default-secret-change-in-production',
          signOptions: {
            expiresIn: expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
          },
        };
      },
    }),
    TypeOrmModule.forFeature([User, Table, Seat]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, SeatTokenStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
