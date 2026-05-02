import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { TenantMiddleware } from "./common/middleware/tenant.middleware";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { typeOrmConfig } from "./config/typeorm.config";
import { CommunicationModule } from './modules/communication/communication.module';

import { BusinessesModule } from "./modules/businesses/businesses.module";
import { UsersModule } from "./modules/users/users.module";
import { ClientsModule } from "./modules/clients/clients.module";
import { InvoicesModule } from "./modules/invoices/invoices.module";
import { ExpensesModule } from "./modules/expenses/expenses.module";
import { TeamMembersModule } from "./modules/team-members/team-members.module";
import { AIInsightsModule } from "./modules/ai-insights/ai-insights.module";
import { FinanceAiModule } from "../finance-rag/finance-rag/nestjs/src/finance-ai/finance-ai.module";
import { AuthModule } from "./modules/auth/auth.module";
import { MailModule } from "./modules/mail/mail.module";
import { RegistrationRequestsModule } from "./modules/registration-requests/registration-requests.module";
import { TenantModule } from "./common/tenant/tenant.module";
import { SecurityQuestionsModule } from "./modules/security-questions/security-questions.module";
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ useFactory: typeOrmConfig }),
    BusinessesModule,
    UsersModule,
    ClientsModule,
    InvoicesModule,
    CommunicationModule,

    TenantModule,
    MailModule,
    ExpensesModule,
    TeamMembersModule,
    AIInsightsModule,
    FinanceAiModule,
    RegistrationRequestsModule,
    AuthModule,
    SecurityQuestionsModule
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}

