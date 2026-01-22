import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

/**
 * Base entity class providing common fields for all entities.
 * Includes UUID primary key and timestamp tracking.
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

/**
 * Soft deletable entity extending BaseEntity with soft delete capability.
 * Uses TypeORM's @DeleteDateColumn for automatic soft delete filtering.
 */
export abstract class SoftDeletableEntity extends BaseEntity {
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
