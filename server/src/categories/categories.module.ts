import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../entities/category.entity';
import { Event } from '../entities/event.entity';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';

/**
 * Module for category management.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Category, Event])],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
