import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { AuthService, SeatJwtPayload } from '../../src/auth/auth.service';
import { AuthController } from '../../src/auth/auth.controller';
import { User, UserRole, Event, Table, Seat, entities } from '../../src/entities';

/**
 * Test DataSource for seat-token auth tests.
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

describe('Judge Seat-Token Authentication', () => {
  let authService: AuthService;
  let authController: AuthController;
  let jwtService: JwtService;
  let userRepo: Repository<User>;
  let eventRepo: Repository<Event>;
  let tableRepo: Repository<Table>;
  let seatRepo: Repository<Seat>;

  let testEvent: Event;
  let testTable: Table;
  let testSeat: Seat;
  let qrToken: string;

  beforeAll(async () => {
    await testDataSource.initialize();
    userRepo = testDataSource.getRepository(User);
    eventRepo = testDataSource.getRepository(Event);
    tableRepo = testDataSource.getRepository(Table);
    seatRepo = testDataSource.getRepository(Seat);

    jwtService = new JwtService({
      secret: 'test-secret-key',
      signOptions: { expiresIn: '90m' },
    });

    // Create AuthService with all repositories
    authService = new AuthService(userRepo, jwtService, tableRepo, seatRepo);
    authController = new AuthController(authService);
  });

  afterAll(async () => {
    if (testDataSource.isInitialized) {
      await testDataSource.destroy();
    }
  });

  beforeEach(async () => {
    await testDataSource.synchronize(true);

    // Create test event
    testEvent = await eventRepo.save({
      name: 'BBQ Championship 2026',
      date: new Date('2026-06-15'),
    });

    // Create test table with QR token
    qrToken = randomBytes(32).toString('hex'); // 64 character hex string
    testTable = await tableRepo.save({
      eventId: testEvent.id,
      tableNumber: 1,
      qrToken,
    });

    // Create test seat
    testSeat = await seatRepo.save({
      tableId: testTable.id,
      seatNumber: 1,
    });
  });

  describe('Seat Token Validation', () => {
    it('valid qr_token and seatNumber returns seat JWT', async () => {
      const result = await authController.seatToken({
        qrToken,
        seatNumber: 1,
      });

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.expiresIn).toBe(5400); // 90 minutes in seconds
      expect(result.seat).toBeDefined();
      expect(result.seat.eventId).toBe(testEvent.id);
      expect(result.seat.tableId).toBe(testTable.id);
      expect(result.seat.seatNumber).toBe(1);
    });

    it('invalid qr_token returns 401', async () => {
      const invalidQrToken = randomBytes(32).toString('hex');

      await expect(
        authController.seatToken({
          qrToken: invalidQrToken,
          seatNumber: 1,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('invalid seat number returns 401', async () => {
      await expect(
        authController.seatToken({
          qrToken,
          seatNumber: 999, // Non-existent seat
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('seat JWT contains correct claims (eventId, tableId, seatNumber, seatId)', async () => {
      const result = await authController.seatToken({
        qrToken,
        seatNumber: 1,
      });

      const decoded = jwtService.decode(result.accessToken) as SeatJwtPayload;

      expect(decoded.eventId).toBe(testEvent.id);
      expect(decoded.tableId).toBe(testTable.id);
      expect(decoded.seatNumber).toBe(1);
      expect(decoded.seatId).toBe(testSeat.id);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('seat JWT expires after configured time (90+ min)', async () => {
      const result = await authController.seatToken({
        qrToken,
        seatNumber: 1,
      });

      const decoded = jwtService.decode(result.accessToken) as SeatJwtPayload;

      // Verify expiry is at least 90 minutes from now
      const expiryTime = decoded.exp! - decoded.iat!;
      expect(expiryTime).toBeGreaterThanOrEqual(5400); // 90 minutes in seconds
    });

    it('multiple seats can authenticate on same table', async () => {
      // Create another seat on the same table
      const seat2 = await seatRepo.save({
        tableId: testTable.id,
        seatNumber: 2,
      });

      const result1 = await authController.seatToken({
        qrToken,
        seatNumber: 1,
      });

      const result2 = await authController.seatToken({
        qrToken,
        seatNumber: 2,
      });

      expect(result1.seat.seatNumber).toBe(1);
      expect(result2.seat.seatNumber).toBe(2);

      const decoded1 = jwtService.decode(result1.accessToken) as SeatJwtPayload;
      const decoded2 = jwtService.decode(result2.accessToken) as SeatJwtPayload;

      expect(decoded1.seatId).toBe(testSeat.id);
      expect(decoded2.seatId).toBe(seat2.id);
    });
  });
});
