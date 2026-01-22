import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { TablesModule } from './tables/tables.module';
import { SeatsModule } from './seats/seats.module';
import { CategoriesModule } from './categories/categories.module';
import { CriteriaModule } from './criteria/criteria.module';
import { TeamsModule } from './teams/teams.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { ScoresModule } from './scores/scores.module';
import { ResultsModule } from './results/results.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    EventsModule,
    TablesModule,
    SeatsModule,
    CategoriesModule,
    CriteriaModule,
    TeamsModule,
    SubmissionsModule,
    ScoresModule,
    ResultsModule,
    AuditLogsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseEnvelopeInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
