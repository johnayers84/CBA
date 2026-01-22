import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Table } from '../entities/table.entity';
import { Event } from '../entities/event.entity';
import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';

/**
 * Module for table management.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Table, Event])],
  controllers: [TablesController],
  providers: [TablesService],
  exports: [TablesService],
})
export class TablesModule {}
