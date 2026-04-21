import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AIInsightsService } from './ai-insights.service';
import { CreateAIInsightDto } from './dto/create-ai-insight.dto';
import { UpdateAIInsightDto } from './dto/update-ai-insight.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BusinessAccessGuard } from '../../common/guards/business-access.guard';
import { BusinessId } from '../../common/decorators/business-id.decorator';
import { CashFlowForecastService } from './cash-flow-forecast.service';
import { InvoiceLateRiskService } from './invoice-late-risk.service';

@Controller('ai-insights')
@UseGuards(JwtAuthGuard, BusinessAccessGuard)
export class AIInsightsController {
  constructor(
    private readonly s: AIInsightsService,
    private readonly cashFlowForecast: CashFlowForecastService,
    private readonly invoiceLateRisk: InvoiceLateRiskService
  ) {}

  @Get('cash-flow/forecast')
  forecastCashFlow(@BusinessId() businessId: string, @Query('horizon') horizon?: string) {
    return this.cashFlowForecast.forecast(businessId, Number(horizon || 30));
  }

  @Get('invoices/late-payment-risk')
  getInvoiceLatePaymentRisk(@BusinessId() businessId: string) {
    return this.invoiceLateRisk.scoreLatePaymentRisk(businessId);
  }

  @Post()
  create(@BusinessId() businessId: string, @Body() dto: CreateAIInsightDto) {
    return this.s.create(businessId, dto);
  }

  @Get()
  findAll(@BusinessId() businessId: string) {
    return this.s.findAll(businessId);
  }

  @Get(':id')
  findOne(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.s.findOne(businessId, id);
  }

  @Patch(':id')
  update(
    @BusinessId() businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAIInsightDto
  ) {
    return this.s.update(businessId, id, dto);
  }

  @Delete(':id')
  remove(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.s.remove(businessId, id);
  }
}
