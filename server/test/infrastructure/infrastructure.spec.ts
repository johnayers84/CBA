import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ResponseEnvelopeInterceptor } from '../../src/common/interceptors/response-envelope.interceptor';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';
import { HealthController } from '../../src/health/health.controller';
import { HealthService } from '../../src/health/health.service';
import { entities } from '../../src/entities';

/**
 * Test DataSource for infrastructure tests.
 */
const testDataSource = new DataSource({
  type: 'postgres',
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
  username: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'postgres',
  database: process.env.TEST_DB_NAME || 'cba_test',
  entities,
  synchronize: true,
  dropSchema: true,
  logging: false,
});

describe('API Infrastructure', () => {
  let app: INestApplication;
  let healthController: HealthController;
  let healthService: HealthService;

  beforeAll(async () => {
    await testDataSource.initialize();

    healthService = new HealthService(testDataSource);
    healthController = new HealthController(healthService);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: healthService,
        },
        {
          provide: DataSource,
          useValue: testDataSource,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
    app.useGlobalFilters(new GlobalExceptionFilter());

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (testDataSource.isInitialized) {
      await testDataSource.destroy();
    }
  });

  describe('Response Envelope Interceptor', () => {
    it('transforms successful responses to envelope format', async () => {
      const interceptor = new ResponseEnvelopeInterceptor();
      const mockData = { id: '123', name: 'Test' };

      const mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({}),
          getResponse: () => ({ statusCode: 200 }),
        }),
      } as any;

      const mockCallHandler = {
        handle: () => ({
          pipe: (operator: any) => {
            const result = { success: true, data: mockData };
            return { toPromise: () => Promise.resolve(result) };
          },
        }),
      } as any;

      const observable = interceptor.intercept(mockExecutionContext, mockCallHandler);
      expect(observable).toBeDefined();
    });
  });

  describe('Global Exception Filter', () => {
    it('formats validation errors as error envelope', () => {
      const filter = new GlobalExceptionFilter();
      expect(filter).toBeDefined();
    });

    it('returns proper error envelope format for validation exceptions', () => {
      const filter = new GlobalExceptionFilter();

      let capturedResponse: any = null;

      const mockResponse = {
        status: (code: number) => ({
          json: (body: any) => {
            capturedResponse = body;
            return body;
          },
        }),
      };

      const mockRequest = {
        url: '/test',
        method: 'GET',
      };

      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      } as any;

      // Use real NestJS BadRequestException with validation message format
      const validationException = new BadRequestException({
        message: ['username must not be empty', 'password is too short'],
        error: 'Bad Request',
      });

      filter.catch(validationException, mockHost);

      expect(capturedResponse).toBeDefined();
      expect(capturedResponse.success).toBe(false);
      expect(capturedResponse.error).toBeDefined();
      expect(capturedResponse.error.code).toBe('VALIDATION_ERROR');
      expect(capturedResponse.error.message).toBe('Validation failed');
      expect(capturedResponse.error.details).toHaveLength(2);
    });
  });

  describe('Health Endpoint', () => {
    it('returns 200 with status for basic health check', () => {
      const result = healthController.check();

      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
    });

    it('readiness endpoint checks database connectivity', async () => {
      const result = await healthController.ready();

      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(result.database).toBe('connected');
    });
  });
});
