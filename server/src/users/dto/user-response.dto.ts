import { User } from '../../entities/user.entity';

/**
 * DTO for user responses.
 * Excludes sensitive fields like passwordHash.
 */
export class UserResponseDto {
  id: string;
  username: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Transform a User entity to UserResponseDto.
   */
  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.username = user.username;
    dto.role = user.role;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }

  /**
   * Transform multiple User entities to UserResponseDtos.
   */
  static fromEntities(users: User[]): UserResponseDto[] {
    return users.map((user) => UserResponseDto.fromEntity(user));
  }
}
