import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService, SafeUser } from './auth.service';
import { LoginRequestDto, LoginResponseDto, SeatTokenRequestDto, SeatTokenResponseDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * Authentication controller handling user login, token refresh, and judge seat authentication.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   * Authenticates user with username/password and returns JWT token.
   * Public endpoint - no authentication required.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginRequestDto): Promise<LoginResponseDto> {
    return this.authService.login(loginDto.username, loginDto.password);
  }

  /**
   * POST /auth/refresh
   * Refreshes JWT token for authenticated user.
   * Requires valid JWT token.
   */
  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(@Request() req: any): Promise<LoginResponseDto> {
    return this.authService.refresh(req.user);
  }

  /**
   * POST /auth/logout
   * Logout endpoint - client-side token discard.
   * Stateless operation - no server-side action needed.
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(): Promise<{ message: string }> {
    return { message: 'Logout successful' };
  }

  /**
   * GET /auth/me
   * Returns current authenticated user information.
   * Requires valid JWT token.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Request() req: any): Promise<SafeUser> {
    return this.authService.getUserInfo(req.user.sub);
  }

  /**
   * POST /auth/seat-token
   * Authenticates judge via QR token and returns seat JWT.
   * Public endpoint - validates QR token from table.
   */
  @Post('seat-token')
  @HttpCode(HttpStatus.OK)
  async seatToken(@Body() seatTokenDto: SeatTokenRequestDto): Promise<SeatTokenResponseDto> {
    return this.authService.validateSeatToken(seatTokenDto.qrToken, seatTokenDto.seatNumber);
  }
}
