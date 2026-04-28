import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceEntity } from '../invoices/entities/invoice.entity';
import { ExpenseEntity } from '../expenses/entities/expense.entity';
import { AIInsightEntity } from './entities/ai-insight.entity';
import { WhatIfScenarioEntity } from './entities/what-if-scenario.entity';

type NetPoint = {
  date: string;
  netCashFlow: number;
  inflowPaid: number;
  outflowApproved: number;
  paidInvoiceCount: number;
  approvedExpenseCount: number;
  unpaidDue7d: number;
  unpaidDue30d: number;
  avgInvoiceAmount30d: number;
  avgExpenseAmount30d: number;
  isMonthEnd: number;
  isQuarterEnd: number;
};
type PredictedPoint = { date: string; predictedNet: number };
type MlForecastResult = {
  predictions: PredictedPoint[] | null;
  attempted: boolean;
  used: boolean;
  error?: string;
};

type HistorySignal = {
  nonZeroDays: number;
  totalAbsFlow: number;
  totalPaidInvoices: number;
  totalApprovedExpenses: number;
};

@Injectable()
export class CashFlowForecastService {
  constructor(
    @InjectRepository(InvoiceEntity)
    private readonly invoicesRepo: Repository<InvoiceEntity>,
    @InjectRepository(ExpenseEntity)
    private readonly expensesRepo: Repository<ExpenseEntity>,
    @InjectRepository(AIInsightEntity)
    private readonly aiInsightsRepo: Repository<AIInsightEntity>,
    @InjectRepository(WhatIfScenarioEntity)
    private readonly whatIfRepo: Repository<WhatIfScenarioEntity>
  ) {}

  async forecast(businessId: string, horizonInput: number) {
    const horizon = [30, 60, 90].includes(horizonInput) ? horizonInput : 30;
    const history = await this.buildDailyNetSeries(businessId, 365);
    const historySignal = this.computeHistorySignal(history);

    if (this.isInsufficientHistory(historySignal)) {
      return {
        horizon,
        generatedAt: new Date().toISOString(),
        modelSource: 'insufficient-data',
        summary: {
          expectedInflow: 0,
          expectedOutflow: 0,
          expectedNet: 0,
          risk: 'low' as const,
          confidence: 0,
        },
        debug: {
          mlConfigured: this.hasMlService(),
          mlAttempted: false,
          mlUsed: false,
          fallbackUsed: false,
          mlError: 'Insufficient tenant history for forecasting',
          insufficientData: true,
          historyPoints: history.length,
          historyStart: history[0]?.date ?? null,
          historyEnd: history[history.length - 1]?.date ?? null,
          nonZeroDays: historySignal.nonZeroDays,
          totalAbsFlow: this.round2(historySignal.totalAbsFlow),
          totalPaidInvoices: historySignal.totalPaidInvoices,
          totalApprovedExpenses: historySignal.totalApprovedExpenses,
        },
        points: [],
      };
    }

    const mlResult = await this.tryMlForecast(history, horizon);

    const predictedNetSeries = mlResult.predictions ?? this.baselineForecast(history, horizon);

    const historicalWindow = history.slice(-60);
    const historicalInflow = historicalWindow.reduce(
      (sum, p) => sum + Math.max(0, p.inflowPaid || 0),
      0
    );
    const historicalOutflow = historicalWindow.reduce(
      (sum, p) => sum + Math.max(0, p.outflowApproved || 0),
      0
    );
    const dailyBaseInflow = historicalWindow.length
      ? historicalInflow / historicalWindow.length
      : 0;
    const dailyBaseOutflow = historicalWindow.length
      ? historicalOutflow / historicalWindow.length
      : 0;

    // suppress unused variable warning
    void dailyBaseInflow;

    let projectedBalance = 0;
    const points = predictedNetSeries.map((p) => {
      const net = this.round2(p.predictedNet);

      // Keep accounting identities coherent: predictedNet = predictedInflow - predictedOutflow.
      // Use historical daily baseline to anchor magnitudes, then enforce exact net balance.
      let predictedOutflow = this.round2(Math.max(0, dailyBaseOutflow));
      let predictedInflow = this.round2(predictedOutflow + net);

      if (predictedInflow < 0) {
        predictedInflow = 0;
        predictedOutflow = this.round2(Math.max(0, -net));
      }

      projectedBalance = this.round2(projectedBalance + net);
      return {
        date: p.date,
        predictedInflow,
        predictedOutflow,
        predictedNet: net,
        projectedBalance,
      };
    });

    const expectedInflow = this.round2(points.reduce((sum, p) => sum + p.predictedInflow, 0));
    const expectedOutflow = this.round2(points.reduce((sum, p) => sum + p.predictedOutflow, 0));
    const expectedNet = this.round2(points.reduce((sum, p) => sum + p.predictedNet, 0));
    const negativeDays = points.filter((p) => p.predictedNet < 0).length;

    const risk: 'low' | 'medium' | 'high' =
      negativeDays > horizon * 0.6 ? 'high' : negativeDays > horizon * 0.35 ? 'medium' : 'low';
    const confidence = this.round2(
      Math.max(0.4, Math.min(0.95, history.length / 365 + (this.hasMlService() ? 0.05 : 0)))
    );

    await this.persistForecastInsight(businessId, horizon, expectedNet, risk, confidence);

    return {
      horizon,
      generatedAt: new Date().toISOString(),
      modelSource: mlResult.used
        ? 'ml-inference'
        : this.hasMlService()
          ? 'baseline-fallback'
          : 'baseline-only',
      summary: {
        expectedInflow,
        expectedOutflow,
        expectedNet,
        risk,
        confidence,
      },
      debug: {
        mlConfigured: this.hasMlService(),
        mlAttempted: mlResult.attempted,
        mlUsed: mlResult.used,
        fallbackUsed: !mlResult.used,
        mlError: mlResult.error ?? null,
        insufficientData: false,
        historyPoints: history.length,
        historyStart: history[0]?.date ?? null,
        historyEnd: history[history.length - 1]?.date ?? null,
        nonZeroDays: historySignal.nonZeroDays,
        totalAbsFlow: this.round2(historySignal.totalAbsFlow),
        totalPaidInvoices: historySignal.totalPaidInvoices,
        totalApprovedExpenses: historySignal.totalApprovedExpenses,
      },
      points,
    };
  }

  async runWhatIfSimulation(
    businessId: string,
    input: {
      horizon?: number;
      collectionAccelerationPct?: number;
      collectionDelayPct?: number;
      expenseReductionPct?: number;
      expenseIncreasePct?: number;
    }
  ) {
    const horizon = [30, 60, 90].includes(Number(input.horizon)) ? Number(input.horizon) : 30;
    const baseline = await this.forecast(businessId, horizon);

    const collectionAccelerationPct = this.clampPct(input.collectionAccelerationPct);
    const collectionDelayPct = this.clampPct(input.collectionDelayPct);
    const expenseReductionPct = this.clampPct(input.expenseReductionPct);
    const expenseIncreasePct = this.clampPct(input.expenseIncreasePct);

    const inflowMultiplier = 1 + collectionAccelerationPct / 100 - collectionDelayPct / 100;
    const outflowMultiplier = 1 - expenseReductionPct / 100 + expenseIncreasePct / 100;

    let projectedBalance = 0;
    const points = baseline.points.map((p) => {
      const simulatedInflow = this.round2(Math.max(0, p.predictedInflow * inflowMultiplier));
      const simulatedOutflow = this.round2(Math.max(0, p.predictedOutflow * outflowMultiplier));
      const simulatedNet = this.round2(simulatedInflow - simulatedOutflow);
      projectedBalance = this.round2(projectedBalance + simulatedNet);
      return {
        date: p.date,
        baselineInflow: p.predictedInflow,
        baselineOutflow: p.predictedOutflow,
        baselineNet: p.predictedNet,
        simulatedInflow,
        simulatedOutflow,
        simulatedNet,
        deltaNet: this.round2(simulatedNet - p.predictedNet),
        projectedBalance,
      };
    });

    const baselineExpectedNet = this.round2(
      baseline.points.reduce((sum, p) => sum + Number(p.predictedNet || 0), 0)
    );
    const simulatedExpectedNet = this.round2(points.reduce((sum, p) => sum + p.simulatedNet, 0));

    const baselineRisk = (baseline.summary?.risk ?? 'low') as 'low' | 'medium' | 'high';
    const simulatedRisk = this.simulateRisk(
      points.length,
      points.filter((p) => p.simulatedNet < 0).length
    );

    return {
      horizon,
      generatedAt: new Date().toISOString(),
      scenario: {
        collectionAccelerationPct,
        collectionDelayPct,
        expenseReductionPct,
        expenseIncreasePct,
      },
      baseline: {
        modelSource: baseline.modelSource,
        expectedInflow: baseline.summary?.expectedInflow ?? 0,
        expectedOutflow: baseline.summary?.expectedOutflow ?? 0,
        expectedNet: baselineExpectedNet,
        risk: baselineRisk,
        confidence: baseline.summary?.confidence ?? 0,
      },
      simulated: {
        expectedInflow: this.round2(points.reduce((sum, p) => sum + p.simulatedInflow, 0)),
        expectedOutflow: this.round2(points.reduce((sum, p) => sum + p.simulatedOutflow, 0)),
        expectedNet: simulatedExpectedNet,
        risk: simulatedRisk,
      },
      impact: {
        deltaExpectedNet: this.round2(simulatedExpectedNet - baselineExpectedNet),
        improvementPct:
          baselineExpectedNet === 0
            ? 0
            : this.round2(
                ((simulatedExpectedNet - baselineExpectedNet) / Math.abs(baselineExpectedNet)) * 100
              ),
      },
      points,
    };
  }

  async saveWhatIfScenario(
    businessId: string,
    input: {
      name: string;
      horizon: number;
      collectionAccelerationPct: number;
      collectionDelayPct: number;
      expenseReductionPct: number;
      expenseIncreasePct: number;
    }
  ) {
    const sim = await this.runWhatIfSimulation(businessId, input);
    const entity = this.whatIfRepo.create({
      businessId,
      name: String(input.name || '').trim(),
      horizon: sim.horizon,
      collectionAccelerationPct: sim.scenario.collectionAccelerationPct,
      collectionDelayPct: sim.scenario.collectionDelayPct,
      expenseReductionPct: sim.scenario.expenseReductionPct,
      expenseIncreasePct: sim.scenario.expenseIncreasePct,
      baselineExpectedNet: sim.baseline.expectedNet,
      simulatedExpectedNet: sim.simulated.expectedNet,
      deltaExpectedNet: sim.impact.deltaExpectedNet,
      improvementPct: sim.impact.improvementPct,
      baselineRisk: sim.baseline.risk as 'low' | 'medium' | 'high',
      simulatedRisk: sim.simulated.risk as 'low' | 'medium' | 'high',
    } as any);

    // FIX 1: save() on a single entity returns a single entity, but TS infers
    // the overload as returning an array. Cast explicitly to resolve the mismatch.
    const saved = (await this.whatIfRepo.save(entity)) as unknown as WhatIfScenarioEntity;
    return this.mapScenario(saved);
  }

  async listWhatIfScenarios(businessId: string) {
    const rows = await this.whatIfRepo.find({
      where: { businessId } as any,
      order: { createdAt: 'DESC' } as any,
    });
    return rows.map((x) => this.mapScenario(x));
  }

  async updateWhatIfScenario(
    businessId: string,
    scenarioId: string,
    input: {
      name?: string;
      horizon: number;
      collectionAccelerationPct: number;
      collectionDelayPct: number;
      expenseReductionPct: number;
      expenseIncreasePct: number;
    }
  ) {
    const existing = await this.whatIfRepo.findOne({
      where: { id: scenarioId, businessId } as any,
    });
    if (!existing) {
      throw new NotFoundException('Scenario not found');
    }

    const sim = await this.runWhatIfSimulation(businessId, input);
    existing.name = String(input.name || existing.name || '').trim();
    existing.horizon = sim.horizon;
    existing.collectionAccelerationPct = sim.scenario.collectionAccelerationPct;
    existing.collectionDelayPct = sim.scenario.collectionDelayPct;
    existing.expenseReductionPct = sim.scenario.expenseReductionPct;
    existing.expenseIncreasePct = sim.scenario.expenseIncreasePct;
    existing.baselineExpectedNet = sim.baseline.expectedNet;
    existing.simulatedExpectedNet = sim.simulated.expectedNet;
    existing.deltaExpectedNet = sim.impact.deltaExpectedNet;
    existing.improvementPct = sim.impact.improvementPct;
    // FIX 2: cast risk strings to the required literal union type
    existing.baselineRisk = sim.baseline.risk as 'low' | 'medium' | 'high';
    existing.simulatedRisk = sim.simulated.risk as 'low' | 'medium' | 'high';

    const saved = await this.whatIfRepo.save(existing);
    return this.mapScenario(saved);
  }

  async deleteWhatIfScenario(businessId: string, scenarioId: string) {
    const existing = await this.whatIfRepo.findOne({
      where: { id: scenarioId, businessId } as any,
    });
    if (!existing) {
      throw new NotFoundException('Scenario not found');
    }
    await this.whatIfRepo.remove(existing);
    return { deleted: true, id: scenarioId };
  }

  private computeHistorySignal(history: NetPoint[]): HistorySignal {
    let nonZeroDays = 0;
    let totalAbsFlow = 0;
    let totalPaidInvoices = 0;
    let totalApprovedExpenses = 0;

    for (const p of history) {
      const absDayFlow =
        Math.abs(Number(p.inflowPaid || 0)) + Math.abs(Number(p.outflowApproved || 0));
      totalAbsFlow += absDayFlow;
      totalPaidInvoices += Number(p.paidInvoiceCount || 0);
      totalApprovedExpenses += Number(p.approvedExpenseCount || 0);
      if (absDayFlow > 0) nonZeroDays += 1;
    }

    return {
      nonZeroDays,
      totalAbsFlow,
      totalPaidInvoices,
      totalApprovedExpenses,
    };
  }

  private isInsufficientHistory(signal: HistorySignal) {
    return (
      signal.nonZeroDays === 0 &&
      signal.totalAbsFlow === 0 &&
      signal.totalPaidInvoices === 0 &&
      signal.totalApprovedExpenses === 0
    );
  }

  private async buildDailyNetSeries(businessId: string, lookbackDays: number): Promise<NetPoint[]> {
    const [invoices, expenses] = await Promise.all([
      this.invoicesRepo.find({ where: { businessId } as any, order: { dueDate: 'ASC' } as any }),
      this.expensesRepo.find({ where: { businessId } as any, order: { date: 'ASC' } as any }),
    ]);

    const inflowByDay = new Map<string, number>();
    const outflowByDay = new Map<string, number>();
    const paidCountByDay = new Map<string, number>();
    const expenseCountByDay = new Map<string, number>();
    let latestTxDate: Date | null = null;

    for (const invoice of invoices) {
      if (invoice.status !== 'paid') continue;
      const parsedDate = this.parseDate(invoice.dueDate || invoice.issueDate);
      const date = parsedDate ? this.toDateKey(parsedDate) : null;
      if (!date) continue;
      const amount = Number(invoice.paidAmount || invoice.totalAmount || 0);
      inflowByDay.set(date, this.round2((inflowByDay.get(date) ?? 0) + amount));
      paidCountByDay.set(date, (paidCountByDay.get(date) ?? 0) + 1);
      if (!latestTxDate || parsedDate! > latestTxDate) latestTxDate = parsedDate!;
    }

    for (const expense of expenses) {
      if (expense.status === 'rejected') continue;
      const parsedDate = this.parseDate(expense.date);
      const date = parsedDate ? this.toDateKey(parsedDate) : null;
      if (!date) continue;
      const amount = Number(expense.amount || 0);
      outflowByDay.set(date, this.round2((outflowByDay.get(date) ?? 0) + amount));
      expenseCountByDay.set(date, (expenseCountByDay.get(date) ?? 0) + 1);
      if (!latestTxDate || parsedDate! > latestTxDate) latestTxDate = parsedDate!;
    }

    const today = this.startOfDay(new Date());
    let end = new Date(today);

    // If there is no activity in the recent lookback window, shift the window to the latest known transaction date.
    const recentStart = new Date(today);
    recentStart.setDate(recentStart.getDate() - (lookbackDays - 1));
    const dayKeys = new Set<string>([...inflowByDay.keys(), ...outflowByDay.keys()]);
    const hasRecentActivity = Array.from(dayKeys).some((k) => {
      const d = this.parseDate(k);
      return d ? d >= recentStart && d <= today : false;
    });

    if (!hasRecentActivity && latestTxDate) {
      end = this.startOfDay(latestTxDate);
    }

    const start = new Date(end);
    start.setDate(start.getDate() - (lookbackDays - 1));

    const points: NetPoint[] = [];
    const inflowWindow: number[] = [];
    const outflowWindow: number[] = [];
    for (let i = 0; i < lookbackDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = this.toDateKey(d);

      const inflow = this.round2(inflowByDay.get(key) ?? 0);
      const outflow = this.round2(outflowByDay.get(key) ?? 0);
      const paidInvoiceCount = paidCountByDay.get(key) ?? 0;
      const approvedExpenseCount = expenseCountByDay.get(key) ?? 0;

      inflowWindow.push(inflow);
      outflowWindow.push(outflow);
      if (inflowWindow.length > 30) inflowWindow.shift();
      if (outflowWindow.length > 30) outflowWindow.shift();

      const avgInvoiceAmount30d =
        paidInvoiceCount > 0
          ? this.round2(this.avg(inflowWindow) / paidInvoiceCount)
          : this.round2(this.avg(inflowWindow));
      const avgExpenseAmount30d =
        approvedExpenseCount > 0
          ? this.round2(this.avg(outflowWindow) / approvedExpenseCount)
          : this.round2(this.avg(outflowWindow));

      points.push({
        date: key,
        netCashFlow: this.round2(inflow - outflow),
        inflowPaid: inflow,
        outflowApproved: outflow,
        paidInvoiceCount,
        approvedExpenseCount,
        unpaidDue7d: 0,
        unpaidDue30d: 0,
        avgInvoiceAmount30d,
        avgExpenseAmount30d,
        isMonthEnd: this.isMonthEnd(d) ? 1 : 0,
        isQuarterEnd: this.isQuarterEnd(d) ? 1 : 0,
      });
    }

    return points;
  }

  private baselineForecast(history: NetPoint[], horizon: number): PredictedPoint[] {
    const series = history.map((p) => p.netCashFlow);
    const preds: PredictedPoint[] = [];

    const startDate = this.startOfDay(new Date());
    const movingWindow = 14;

    for (let i = 0; i < horizon; i++) {
      const windowValues = series.slice(Math.max(0, series.length - movingWindow));
      const base = windowValues.length
        ? windowValues.reduce((sum, x) => sum + x, 0) / windowValues.length
        : 0;

      const weekAgo = series.length >= 7 ? series[series.length - 7] : base;
      const prediction = this.round2(0.7 * base + 0.3 * weekAgo);

      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i + 1);
      const date = this.toDateKey(d);

      preds.push({ date, predictedNet: prediction });
      series.push(prediction);
    }

    return preds;
  }

  private async tryMlForecast(history: NetPoint[], horizon: number): Promise<MlForecastResult> {
    const url = process.env.ML_SERVICE_URL;
    if (!url) {
      return { predictions: null, attempted: false, used: false };
    }

    try {
      const response = await fetch(`${url.replace(/\/$/, '')}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, horizon }),
      });

      if (!response.ok) {
        return {
          predictions: null,
          attempted: true,
          used: false,
          error: `ML service responded with HTTP ${response.status}`,
        };
      }
      const payload = (await response.json()) as { predictions?: PredictedPoint[] };
      if (!Array.isArray(payload.predictions) || payload.predictions.length !== horizon) {
        return {
          predictions: null,
          attempted: true,
          used: false,
          error: 'ML response shape mismatch',
        };
      }

      return {
        predictions: payload.predictions.map((p) => ({
          date: this.normalizeDate(p.date) ?? p.date,
          predictedNet: this.round2(Number(p.predictedNet || 0)),
        })),
        attempted: true,
        used: true,
      };
    } catch (error) {
      return {
        predictions: null,
        attempted: true,
        used: false,
        error: error instanceof Error ? error.message : 'Unknown ML call error',
      };
    }
  }

  private async persistForecastInsight(
    businessId: string,
    horizon: number,
    expectedNet: number,
    risk: 'high' | 'medium' | 'low',
    confidence: number
  ) {
    const title = `Cash flow forecast (${horizon} days)`;
    const direction = expectedNet >= 0 ? 'positive' : 'negative';
    const description = `Projected net cash flow over ${horizon} days is ${expectedNet.toFixed(2)} (${direction}). Risk level: ${risk}.`;

    const entity = this.aiInsightsRepo.create({
      businessId,
      type: 'prediction',
      category: 'cash_flow',
      title,
      description,
      confidence,
      actionable: true,
      action:
        risk === 'high'
          ? 'Review upcoming due invoices and reduce discretionary expenses'
          : 'Monitor weekly and keep collection cadence',
      impact: risk,
    } as any);

    await this.aiInsightsRepo.save(entity);
  }

  private hasMlService() {
    return Boolean(process.env.ML_SERVICE_URL);
  }

  private normalizeDate(input?: string | null) {
    const dt = this.parseDate(input);
    return dt ? this.toDateKey(dt) : null;
  }

  private parseDate(input?: string | null): Date | null {
    if (!input) return null;

    const raw = String(input).trim();
    if (!raw) return null;

    // Fast path for ISO-like values.
    const direct = new Date(raw);
    if (!Number.isNaN(direct.getTime())) return this.startOfDay(direct);

    // Supports dd/mm/yyyy and dd-mm-yyyy.
    const m = raw.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
    if (m) {
      const day = Number(m[1]);
      const month = Number(m[2]);
      const year = Number(m[3]);
      const dt = new Date(year, month - 1, day);
      if (!Number.isNaN(dt.getTime())) return this.startOfDay(dt);
    }

    return null;
  }

  private startOfDay(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  private toDateKey(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  private round2(n: number) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  private avg(arr: number[]) {
    if (!arr.length) return 0;
    return arr.reduce((s, x) => s + x, 0) / arr.length;
  }

  private isMonthEnd(d: Date) {
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    return next.getMonth() !== d.getMonth();
  }

  private isQuarterEnd(d: Date) {
    return this.isMonthEnd(d) && [3, 6, 9, 12].includes(d.getMonth() + 1);
  }

  private clampPct(v?: number) {
    const n = Number.isFinite(Number(v)) ? Number(v) : 0;
    return Math.min(100, Math.max(0, this.round2(n)));
  }

  private simulateRisk(horizon: number, negativeDays: number): 'low' | 'medium' | 'high' {
    if (negativeDays > horizon * 0.6) return 'high';
    if (negativeDays > horizon * 0.35) return 'medium';
    return 'low';
  }

  private mapScenario(x: WhatIfScenarioEntity) {
    return {
      id: x.id,
      name: x.name,
      horizon: x.horizon as 30 | 60 | 90,
      scenario: {
        collectionAccelerationPct: this.round2(Number(x.collectionAccelerationPct || 0)),
        collectionDelayPct: this.round2(Number(x.collectionDelayPct || 0)),
        expenseReductionPct: this.round2(Number(x.expenseReductionPct || 0)),
        expenseIncreasePct: this.round2(Number(x.expenseIncreasePct || 0)),
      },
      baseline: {
        expectedNet: this.round2(Number(x.baselineExpectedNet || 0)),
        risk: x.baselineRisk,
      },
      simulated: {
        expectedNet: this.round2(Number(x.simulatedExpectedNet || 0)),
        risk: x.simulatedRisk,
      },
      impact: {
        deltaExpectedNet: this.round2(Number(x.deltaExpectedNet || 0)),
        improvementPct: this.round2(Number(x.improvementPct || 0)),
      },
      createdAt: x.createdAt?.toISOString?.() ?? null,
      updatedAt: x.updatedAt?.toISOString?.() ?? null,
    };
  }
}