import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SupportChatController } from "./support-chat.controller";
import { SupportChatService } from "./support-chat.service";
import { SupportTicketEntity } from "./entities/support-ticket.entity";
import { SupportMessageEntity } from "./entities/support-message.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([SupportTicketEntity, SupportMessageEntity]),
  ],
  controllers: [SupportChatController],
  providers: [SupportChatService],
  exports: [SupportChatService],
})
export class SupportChatModule {}
