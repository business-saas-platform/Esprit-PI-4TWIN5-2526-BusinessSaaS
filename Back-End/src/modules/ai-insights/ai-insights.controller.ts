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
import { InvoiceCollectionCopilotService } from './invoice-collection-copilot.service';
import { UpdateInvoiceCollectionActionDto } from './dto/update-invoice-collection-action.dto';
import { RunWhatIfSimulationDto } from './dto/run-what-if-simulation.dto';
import { SaveWhatIfScenarioDto } from './dto/save-what-if-scenario.dto';
import { UpdateWhatIfScenarioDto } from './dto/update-what-if-scenario.dto';

@Controller('ai-insights')
@UseGuards(JwtAuthGuard, BusinessAccessGuard)
export class AIInsightsController {
  constructor(
    private readonly s: AIInsightsService,
    private readonly cashFlowForecast: CashFlowForecastService,
    private readonly invoiceLateRisk: InvoiceLateRiskService,
    private readonly invoiceCollectionCopilot: InvoiceCollectionCopilotService
  ) {}

  @Get('cash-flow/forecast')
  forecastCashFlow(@BusinessId() businessId: string, @Query('horizon') horizon?: string) {
    return this.cashFlowForecast.forecast(businessId, Number(horizon || 30));
  }

  @Post('cash-flow/what-if')
  runCashFlowWhatIf(@BusinessId() businessId: string, @Body() dto: RunWhatIfSimulationDto) {
    return this.cashFlowForecast.runWhatIfSimulation(businessId, dto);
  }

  @Post('cash-flow/what-if/scenarios')
  saveCashFlowWhatIfScenario(@BusinessId() businessId: string, @Body() dto: SaveWhatIfScenarioDto) {
    return this.cashFlowForecast.saveWhatIfScenario(businessId, dto);
  }

  @Get('cash-flow/what-if/scenarios')
  listCashFlowWhatIfScenarios(@BusinessId() businessId: string) {
    return this.cashFlowForecast.listWhatIfScenarios(businessId);
  }

  @Patch('cash-flow/what-if/scenarios/:scenarioId')
  updateCashFlowWhatIfScenario(
    @BusinessId() businessId: string,
    @Param('scenarioId') scenarioId: string,
    @Body() dto: UpdateWhatIfScenarioDto
  ) {
    return this.cashFlowForecast.updateWhatIfScenario(businessId, scenarioId, dto);
  }

  @Delete('cash-flow/what-if/scenarios/:scenarioId')
  deleteCashFlowWhatIfScenario(
    @BusinessId() businessId: string,
    @Param('scenarioId') scenarioId: string
  ) {
    return this.cashFlowForecast.deleteWhatIfScenario(businessId, scenarioId);
  }

  @Get('invoices/late-payment-risk')
  getInvoiceLatePaymentRisk(@BusinessId() businessId: string) {
    return this.invoiceLateRisk.scoreLatePaymentRisk(businessId);
  }

  @Get('invoices/collection-copilot')
  getInvoiceCollectionCopilot(
    @BusinessId() businessId: string,
    @Query('limit') limit?: string
  ) {
    return this.invoiceCollectionCopilot.generateCollectionPlan(businessId, Number(limit || 10));
  }

  @Patch('invoices/collection-copilot/:invoiceId')
  updateInvoiceCollectionCopilotAction(
    @BusinessId() businessId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: UpdateInvoiceCollectionActionDto
  ) {
    return this.invoiceCollectionCopilot.updateActionWorkflow(businessId, invoiceId, dto);
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
