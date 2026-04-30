"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashFlowForecastService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const invoice_entity_1 = require("../invoices/entities/invoice.entity");
const expense_entity_1 = require("../expenses/entities/expense.entity");
const ai_insight_entity_1 = require("./entities/ai-insight.entity");
let CashFlowForecastService = class CashFlowForecastService {
    constructor(invoicesRepo, expensesRepo, aiInsightsRepo) {
        this.invoicesRepo = invoicesRepo;
        this.expensesRepo = expensesRepo;
        this.aiInsightsRepo = aiInsightsRepo;
    }
    async forecast(businessId, horizonInput) {
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
                    risk: 'low',
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
        const historicalInflow = historicalWindow.reduce((sum, p) => sum + Math.max(0, p.inflowPaid || 0), 0);
        const historicalOutflow = historicalWindow.reduce((sum, p) => sum + Math.max(0, p.outflowApproved || 0), 0);
        const dailyBaseInflow = historicalWindow.length
            ? historicalInflow / historicalWindow.length
            : 0;
        const dailyBaseOutflow = historicalWindow.length
            ? historicalOutflow / historicalWindow.length
            : 0;
        let projectedBalance = 0;
        const points = predictedNetSeries.map((p) => {
            const net = this.round2(p.predictedNet);
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
        const risk = negativeDays > horizon * 0.6 ? 'high' : negativeDays > horizon * 0.35 ? 'medium' : 'low';
        const confidence = this.round2(Math.max(0.4, Math.min(0.95, history.length / 365 + (this.hasMlService() ? 0.05 : 0))));
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
    computeHistorySignal(history) {
        let nonZeroDays = 0;
        let totalAbsFlow = 0;
        let totalPaidInvoices = 0;
        let totalApprovedExpenses = 0;
        for (const p of history) {
            const absDayFlow = Math.abs(Number(p.inflowPaid || 0)) + Math.abs(Number(p.outflowApproved || 0));
            totalAbsFlow += absDayFlow;
            totalPaidInvoices += Number(p.paidInvoiceCount || 0);
            totalApprovedExpenses += Number(p.approvedExpenseCount || 0);
            if (absDayFlow > 0)
                nonZeroDays += 1;
        }
        return {
            nonZeroDays,
            totalAbsFlow,
            totalPaidInvoices,
            totalApprovedExpenses,
        };
    }
    isInsufficientHistory(signal) {
        return (signal.nonZeroDays === 0 &&
            signal.totalAbsFlow === 0 &&
            signal.totalPaidInvoices === 0 &&
            signal.totalApprovedExpenses === 0);
    }
    async buildDailyNetSeries(businessId, lookbackDays) {
        const [invoices, expenses] = await Promise.all([
            this.invoicesRepo.find({ where: { businessId }, order: { dueDate: 'ASC' } }),
            this.expensesRepo.find({ where: { businessId }, order: { date: 'ASC' } }),
        ]);
        const inflowByDay = new Map();
        const outflowByDay = new Map();
        const paidCountByDay = new Map();
        const expenseCountByDay = new Map();
        let latestTxDate = null;
        for (const invoice of invoices) {
            if (invoice.status !== 'paid')
                continue;
            const parsedDate = this.parseDate(invoice.dueDate || invoice.issueDate);
            const date = parsedDate ? this.toDateKey(parsedDate) : null;
            if (!date)
                continue;
            const amount = Number(invoice.paidAmount || invoice.totalAmount || 0);
            inflowByDay.set(date, this.round2((inflowByDay.get(date) ?? 0) + amount));
            paidCountByDay.set(date, (paidCountByDay.get(date) ?? 0) + 1);
            if (!latestTxDate || parsedDate > latestTxDate)
                latestTxDate = parsedDate;
        }
        for (const expense of expenses) {
            if (expense.status === 'rejected')
                continue;
            const parsedDate = this.parseDate(expense.date);
            const date = parsedDate ? this.toDateKey(parsedDate) : null;
            if (!date)
                continue;
            const amount = Number(expense.amount || 0);
            outflowByDay.set(date, this.round2((outflowByDay.get(date) ?? 0) + amount));
            expenseCountByDay.set(date, (expenseCountByDay.get(date) ?? 0) + 1);
            if (!latestTxDate || parsedDate > latestTxDate)
                latestTxDate = parsedDate;
        }
        const today = this.startOfDay(new Date());
        let end = new Date(today);
        const recentStart = new Date(today);
        recentStart.setDate(recentStart.getDate() - (lookbackDays - 1));
        const dayKeys = new Set([...inflowByDay.keys(), ...outflowByDay.keys()]);
        const hasRecentActivity = Array.from(dayKeys).some((k) => {
            const d = this.parseDate(k);
            return d ? d >= recentStart && d <= today : false;
        });
        if (!hasRecentActivity && latestTxDate) {
            end = this.startOfDay(latestTxDate);
        }
        const start = new Date(end);
        start.setDate(start.getDate() - (lookbackDays - 1));
        const points = [];
        const inflowWindow = [];
        const outflowWindow = [];
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
            if (inflowWindow.length > 30)
                inflowWindow.shift();
            if (outflowWindow.length > 30)
                outflowWindow.shift();
            const avgInvoiceAmount30d = paidInvoiceCount > 0
                ? this.round2(this.avg(inflowWindow) / paidInvoiceCount)
                : this.round2(this.avg(inflowWindow));
            const avgExpenseAmount30d = approvedExpenseCount > 0
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
    baselineForecast(history, horizon) {
        const series = history.map((p) => p.netCashFlow);
        const preds = [];
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
    async tryMlForecast(history, horizon) {
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
            const payload = (await response.json());
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
        }
        catch (error) {
            return {
                predictions: null,
                attempted: true,
                used: false,
                error: error instanceof Error ? error.message : 'Unknown ML call error',
            };
        }
    }
    async persistForecastInsight(businessId, horizon, expectedNet, risk, confidence) {
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
            action: risk === 'high'
                ? 'Review upcoming due invoices and reduce discretionary expenses'
                : 'Monitor weekly and keep collection cadence',
            impact: risk,
        });
        await this.aiInsightsRepo.save(entity);
    }
    hasMlService() {
        return Boolean(process.env.ML_SERVICE_URL);
    }
    normalizeDate(input) {
        const dt = this.parseDate(input);
        return dt ? this.toDateKey(dt) : null;
    }
    parseDate(input) {
        if (!input)
            return null;
        const raw = String(input).trim();
        if (!raw)
            return null;
        const direct = new Date(raw);
        if (!Number.isNaN(direct.getTime()))
            return this.startOfDay(direct);
        const m = raw.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
        if (m) {
            const day = Number(m[1]);
            const month = Number(m[2]);
            const year = Number(m[3]);
            const dt = new Date(year, month - 1, day);
            if (!Number.isNaN(dt.getTime()))
                return this.startOfDay(dt);
        }
        return null;
    }
    startOfDay(d) {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        return x;
    }
    toDateKey(d) {
        return d.toISOString().slice(0, 10);
    }
    round2(n) {
        return Math.round((n + Number.EPSILON) * 100) / 100;
    }
    avg(arr) {
        if (!arr.length)
            return 0;
        return arr.reduce((s, x) => s + x, 0) / arr.length;
    }
    isMonthEnd(d) {
        const next = new Date(d);
        next.setDate(d.getDate() + 1);
        return next.getMonth() !== d.getMonth();
    }
    isQuarterEnd(d) {
        return this.isMonthEnd(d) && [3, 6, 9, 12].includes(d.getMonth() + 1);
    }
};
exports.CashFlowForecastService = CashFlowForecastService;
exports.CashFlowForecastService = CashFlowForecastService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(invoice_entity_1.InvoiceEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(expense_entity_1.ExpenseEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(ai_insight_entity_1.AIInsightEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], CashFlowForecastService);
//# sourceMappingURL=cash-flow-forecast.service.js.map