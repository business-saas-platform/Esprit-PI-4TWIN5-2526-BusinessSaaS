import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './config/typeorm.config';
import { CommunicationModule } from './modules/communication/communication.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { SupportChatModule } from './modules/support-chat/support-chat.module';

import { BusinessesModule } from './modules/businesses/businesses.module';
import { UsersModule } from './modules/users/users.module';
import { ClientsModule } from './modules/clients/clients.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { TeamMembersModule } from './modules/team-members/team-members.module';
import { AIInsightsModule } from './modules/ai-insights/ai-insights.module';
import { TeamAiModule } from './modules/team-ai/team-ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { MailModule } from './modules/mail/mail.module';
import { RegistrationRequestsModule } from './modules/registration-requests/registration-requests.module';
import { TenantModule } from './common/tenant/tenant.module';
import { SecurityQuestionsModule } from './modules/security-questions/security-questions.module';

import { HealthController } from './health/health.controller';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      exclude: ['/api*'],
    }),
    TypeOrmModule.forRootAsync({ useFactory: typeOrmConfig }),
    BusinessesModule,
    UsersModule,
    ClientsModule,
    InvoicesModule,
    CommunicationModule,
    SupportChatModule,

    TenantModule,
    MailModule,
    ExpensesModule,
    TeamMembersModule,
    AIInsightsModule,
    TeamAiModule,
    RegistrationRequestsModule,
    AuthModule,
    SecurityQuestionsModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
