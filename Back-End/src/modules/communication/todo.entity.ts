import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('todos')
export class TodoEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  businessId!: string;

  @Column()
  userId!: string; // The user this task belongs to

  @Column()
  description!: string;

  @Column({ nullable: true })
  deadline!: string;

  @Column({ default: false })
  isCompleted!: boolean;

  @Column({ nullable: true })
  sourceChannelId!: string; // Channel where this was extracted from

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
