import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SupportChatController } from "./support-chat.controller";
import { SupportChatService } from "./support-chat.service";
import { SupportTicketEntity } from "./entities/support-ticket.entity";
import { SupportMessageEntity } from "./entities/support-message.entity";
import { BusinessEntity } from "../businesses/entities/business.entity";
import { InvoiceEntity } from "../invoices/entities/invoice.entity";
import { ExpenseEntity } from "../expenses/entities/expense.entity";
import { ClientEntity } from "../clients/entities/client.entity";
import { UserEntity } from "../users/entities/user.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SupportTicketEntity,
      SupportMessageEntity,
      BusinessEntity,
      InvoiceEntity,
      ExpenseEntity,
      ClientEntity,
      UserEntity,
    ]),
  ],
  controllers: [SupportChatController],
  providers: [SupportChatService],
  exports: [SupportChatService],
})
export class SupportChatModule {}
