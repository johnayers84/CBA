import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

/**
 * Service for managing user entities.
 * Handles CRUD operations with bcrypt password hashing.
 */
@Injectable()
export class UsersService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Create a new user with hashed password.
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { username: createUserDto.username },
    });

    if (existingUser) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Username already exists',
      });
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, this.SALT_ROUNDS);

    const user = this.userRepository.create({
      username: createUserDto.username,
      passwordHash,
      role: createUserDto.role,
    });

    return this.userRepository.save(user);
  }

  /**
   * Find all users, optionally including soft-deleted ones.
   */
  async findAll(includeDeleted = false): Promise<User[]> {
    if (includeDeleted) {
      return this.userRepository.find({ withDeleted: true });
    }
    return this.userRepository.find();
  }

  /**
   * Find a user by ID.
   */
  async findOne(id: string, includeDeleted = false): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      withDeleted: includeDeleted,
    });

    if (!user) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return user;
  }

  /**
   * Find a user by username (for authentication).
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  /**
   * Update a user by ID.
   * Hashes the password if provided.
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username: updateUserDto.username },
      });

      if (existingUser) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Username already exists',
        });
      }

      user.username = updateUserDto.username;
    }

    if (updateUserDto.password) {
      user.passwordHash = await bcrypt.hash(updateUserDto.password, this.SALT_ROUNDS);
    }

    if (updateUserDto.role) {
      user.role = updateUserDto.role;
    }

    return this.userRepository.save(user);
  }

  /**
   * Soft delete a user by ID.
   */
  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.softDelete(user.id);
  }

  /**
   * Validate a user's password.
   */
  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }
}
