import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Seat } from '../entities/seat.entity';
import { Table } from '../entities/table.entity';
import { SeatsService } from './seats.service';
import { SeatsController } from './seats.controller';

/**
 * Module for seat management.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Seat, Table])],
  controllers: [SeatsController],
  providers: [SeatsService],
  exports: [SeatsService],
})
export class SeatsModule {}
