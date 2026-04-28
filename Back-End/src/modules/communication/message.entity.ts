import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('messages')
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  businessId!: string;

  @Index()
  @Column()
  channelId!: string;

  @Column()
  senderId!: string;

  @Column()
  senderName!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ default: 'text' })
  type!: 'text' | 'file' | 'system' | 'voice';

  @Column({ nullable: true })
  fileUrl?: string;

  // --- Reactions: { "👍": ["userId1","userId2"], "🎉": ["userId3"] } ---
  @Column({ type: 'jsonb', default: {} })
  reactions!: Record<string, string[]>;

  // --- Reply / Thread ---
  @Column({ nullable: true })
  replyToId?: string;

  @Column({ nullable: true })
  replyToContent?: string;

  @Column({ nullable: true })
  replyToSender?: string;

  // --- Pinned ---
  @Column({ default: false })
  isPinned!: boolean;

  // --- Read receipts ---
  @Column({ type: 'text', array: true, default: () => "ARRAY[]::text[]" })
  readBy!: string[];

  @CreateDateColumn()
  createdAt!: Date;
}
