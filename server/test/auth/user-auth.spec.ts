import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../../src/auth/auth.service';
import { AuthController } from '../../src/auth/auth.controller';
import { User, UserRole, entities } from '../../src/entities';

/**
 * Test DataSource for user auth tests.
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

describe('User JWT Authentication', () => {
  let authService: AuthService;
  let authController: AuthController;
  let jwtService: JwtService;
  let userRepo: Repository<User>;
  let testUser: User;

  beforeAll(async () => {
    await testDataSource.initialize();
    userRepo = testDataSource.getRepository(User);

    jwtService = new JwtService({
      secret: 'test-secret-key',
      signOptions: { expiresIn: '24h' },
    });

    // Create AuthService with manual injection (without optional table/seat repos)
    authService = new AuthService(userRepo, jwtService);
    authController = new AuthController(authService);
  });

  afterAll(async () => {
    if (testDataSource.isInitialized) {
      await testDataSource.destroy();
    }
  });

  beforeEach(async () => {
    await testDataSource.synchronize(true);

    // Create test user with hashed password
    const passwordHash = await bcrypt.hash('testpassword123', 10);
    testUser = await userRepo.save({
      username: 'testadmin',
      passwordHash,
      role: UserRole.ADMIN,
    });
  });

  describe('AuthService', () => {
    it('validates user with correct credentials', async () => {
      const user = await authService.validateUser('testadmin', 'testpassword123');

      expect(user).toBeDefined();
      expect(user?.id).toBe(testUser.id);
      expect(user?.username).toBe('testadmin');
      expect(user?.role).toBe(UserRole.ADMIN);
    });

    it('returns null for invalid credentials', async () => {
      const user = await authService.validateUser('testadmin', 'wrongpassword');
      expect(user).toBeNull();
    });

    it('returns null for non-existent user', async () => {
      const user = await authService.validateUser('nonexistent', 'testpassword123');
      expect(user).toBeNull();
    });
  });

  describe('AuthController', () => {
    it('successful login returns JWT token', async () => {
      const result = await authController.login({
        username: 'testadmin',
        password: 'testpassword123',
      });

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.expiresIn).toBe(86400); // 24 hours in seconds
      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(testUser.id);
      expect(result.user.username).toBe('testadmin');
      expect(result.user.role).toBe(UserRole.ADMIN);
    });

    it('invalid credentials returns 401', async () => {
      await expect(
        authController.login({
          username: 'testadmin',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('JWT token contains correct payload', async () => {
      const result = await authController.login({
        username: 'testadmin',
        password: 'testpassword123',
      });

      const decoded = jwtService.decode(result.accessToken) as any;

      expect(decoded.sub).toBe(testUser.id);
      expect(decoded.role).toBe(UserRole.ADMIN);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('refresh endpoint returns valid new token', async () => {
      // Mock request with user from token
      const mockRequest = {
        user: {
          sub: testUser.id,
          role: testUser.role,
        },
      } as any;

      const refreshResult = await authController.refresh(mockRequest);

      expect(refreshResult).toBeDefined();
      expect(refreshResult.accessToken).toBeDefined();
      expect(refreshResult.expiresIn).toBe(86400);
      expect(refreshResult.user.id).toBe(testUser.id);

      // Verify new token is valid
      const decoded = jwtService.decode(refreshResult.accessToken) as any;
      expect(decoded.sub).toBe(testUser.id);
      expect(decoded.role).toBe(UserRole.ADMIN);
    });

    it('me endpoint returns current user info', async () => {
      const mockRequest = {
        user: {
          sub: testUser.id,
          role: testUser.role,
        },
      } as any;

      const meResult = await authController.me(mockRequest);

      expect(meResult).toBeDefined();
      expect(meResult.id).toBe(testUser.id);
      expect(meResult.username).toBe('testadmin');
      expect(meResult.role).toBe(UserRole.ADMIN);
    });
  });
});
