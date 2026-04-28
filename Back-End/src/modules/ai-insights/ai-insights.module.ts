import { Module } from '@nestjs/common';
import { TenantModule } from '../../common/tenant/tenant.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIInsightEntity } from './entities/ai-insight.entity';
import { AIInsightsController } from './ai-insights.controller';
import { AIInsightsService } from './ai-insights.service';
import { InvoiceEntity } from '../invoices/entities/invoice.entity';
import { ExpenseEntity } from '../expenses/entities/expense.entity';
import { CashFlowForecastService } from './cash-flow-forecast.service';
import { InvoiceLateRiskService } from './invoice-late-risk.service';

@Module({
  imports: [
    TenantModule,
    TypeOrmModule.forFeature([AIInsightEntity, InvoiceEntity, ExpenseEntity]),
  ],
  controllers: [AIInsightsController],
  providers: [AIInsightsService, CashFlowForecastService, InvoiceLateRiskService],
})
export class AIInsightsModule {}
