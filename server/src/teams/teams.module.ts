import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Team } from '../entities/team.entity';
import { Event } from '../entities/event.entity';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';

/**
 * Module for team management.
 */
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Team, Event])],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
