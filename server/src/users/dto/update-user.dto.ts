import { IsString, IsOptional, MinLength, MaxLength, IsEnum } from 'class-validator';
import { UserRole } from '../../entities/user.entity';

/**
 * DTO for updating an existing user.
 * All fields are optional.
 */
export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(100)
  username?: string;

  @IsString()
  @IsOptional()
  @MinLength(8)
  @MaxLength(255)
  password?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
