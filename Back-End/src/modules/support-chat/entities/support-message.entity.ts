import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { SupportMessageSender } from "../../../common/enums-support";
import { SupportTicketEntity } from "./support-ticket.entity";

@Entity("support_messages")
export class SupportMessageEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  ticketId!: string;

  @Column({
    type: "enum",
    enum: ["user", "ai", "admin"],
    default: "user",
  })
  sender!: SupportMessageSender;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "boolean", default: false })
  isAIResponse!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => SupportTicketEntity, (ticket) => ticket.messages, {
    onDelete: "CASCADE",
  })
  ticket!: SupportTicketEntity;
}
