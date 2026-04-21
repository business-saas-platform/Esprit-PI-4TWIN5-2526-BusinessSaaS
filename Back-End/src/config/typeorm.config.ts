import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { BusinessEntity } from "../modules/businesses/entities/business.entity";
import { UserEntity } from "../modules/users/entities/user.entity";
import { ClientEntity } from "../modules/clients/entities/client.entity";
import { InvoiceEntity } from "../modules/invoices/entities/invoice.entity";
import { InvoiceItemEntity } from "../modules/invoices/entities/invoice-item.entity";
import { ExpenseEntity } from "../modules/expenses/entities/expense.entity";
import { TeamMemberEntity } from "../modules/team-members/entities/team-member.entity";
import { AIInsightEntity } from "../modules/ai-insights/entities/ai-insight.entity";
import { SupportTicketEntity } from "../modules/support-chat/entities/support-ticket.entity";
import { SupportMessageEntity } from "../modules/support-chat/entities/support-message.entity";

export const typeOrmConfig = (): TypeOrmModuleOptions => ({
  type: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  entities: [
    BusinessEntity,
    UserEntity,
    ClientEntity,
    InvoiceEntity,
    InvoiceItemEntity,
    ExpenseEntity,
    TeamMemberEntity,
    AIInsightEntity,
    SupportTicketEntity,
    SupportMessageEntity,
  ],
  autoLoadEntities: true,

  synchronize: true
});
