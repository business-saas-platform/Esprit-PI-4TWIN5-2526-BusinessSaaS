import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('channels')
export class ChannelEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  businessId!: string; // tenant isolation

  @Column()
  name!: string; // e.g. "general", "accounting"

  @Column({ nullable: true })
  description?: string;

  @Column({ default: 'public' })
  type!: 'public' | 'private' | 'dm';

  @Column({ type: 'simple-array', nullable: true })
  memberIds!: string[]; // for private/dm channels

  @Column({ default: false })
  isDefault!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
