import { Entity, Column, Index } from 'typeorm';
import { SoftDeletableEntity } from './base.entity';

/**
 * User role enum for role-based access control.
 */
export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
}

/**
 * User entity for admin and operator accounts.
 * Provides authenticated access to the system.
 */
@Entity('users')
@Index('idx_users_username', ['username'], { where: '"deleted_at" IS NULL' })
@Index('idx_users_role', ['role'], { where: '"deleted_at" IS NULL' })
export class User extends SoftDeletableEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  username: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20 })
  role: UserRole;
}
