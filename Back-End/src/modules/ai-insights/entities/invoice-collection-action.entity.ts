import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('invoice_collection_actions')
@Index(['businessId', 'invoiceId'], { unique: true })
export class InvoiceCollectionActionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  businessId!: string;

  @Index()
  @Column({ type: 'uuid' })
  invoiceId!: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: 'pending' | 'snoozed' | 'done';

  @Column({ type: 'varchar', length: 255, nullable: true })
  outcomeNote?: string | null;

  @Column({ type: 'double precision', nullable: true })
  outcomeAmountCollected?: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nextStep?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  snoozedUntil?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  doneAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
