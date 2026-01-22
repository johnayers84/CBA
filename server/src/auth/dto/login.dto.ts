import { IsString, MinLength, MaxLength } from 'class-validator';

/**
 * Login request DTO for user authentication.
 */
export class LoginRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  username: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  password: string;
}

/**
 * User info returned in login response.
 */
export interface LoginUserInfo {
  id: string;
  username: string;
  role: string;
}

/**
 * Login response DTO with JWT token and user info.
 */
export interface LoginResponseDto {
  accessToken: string;
  expiresIn: number;
  user: LoginUserInfo;
}
