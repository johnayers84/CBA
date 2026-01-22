import { IsString, IsNotEmpty, MinLength, MaxLength, IsEnum } from 'class-validator';
import { UserRole } from '../../entities/user.entity';

/**
 * DTO for creating a new user.
 */
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  password: string;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;
}
