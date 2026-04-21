import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { SupportTicketStatus } from "../../../common/enums-support";
import { SupportMessageEntity } from "./support-message.entity";

@Entity("support_tickets")
export class SupportTicketEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  businessId!: string;

  @Index()
  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({
    type: "enum",
    enum: ["open", "in_progress", "resolved", "closed"],
    default: "open",
  })
  status!: SupportTicketStatus;

  @Column({ type: "boolean", default: false })
  escalatedToAdmin!: boolean;

  @Column({ type: "integer", default: 0 })
  failedAIResponseCount!: number;

  @OneToMany(() => SupportMessageEntity, (msg) => msg.ticket, {
    cascade: true,
    eager: true,
  })
  messages!: SupportMessageEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: "timestamp", nullable: true })
  resolvedAt?: Date;
}
