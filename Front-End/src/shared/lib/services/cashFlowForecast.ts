import { apiGet } from '@/shared/lib/apiClient';

export type ForecastRisk = 'low' | 'medium' | 'high';

export type CashFlowForecastPoint = {
  date: string;
  predictedInflow: number;
  predictedOutflow: number;
  predictedNet: number;
  projectedBalance: number;
};

export type CashFlowForecastResponse = {
  horizon: 30 | 60 | 90;
  generatedAt: string;
  modelSource: string;
  summary: {
    expectedInflow: number;
    expectedOutflow: number;
    expectedNet: number;
    risk: ForecastRisk;
    confidence: number;
  };
  debug?: {
    mlConfigured: boolean;
    mlAttempted: boolean;
    mlUsed: boolean;
    fallbackUsed: boolean;
    mlError: string | null;
    insufficientData?: boolean;
    historyPoints: number;
    historyStart: string | null;
    historyEnd: string | null;
    nonZeroDays?: number;
    totalAbsFlow?: number;
    totalPaidInvoices?: number;
    totalApprovedExpenses?: number;
  };
  points: CashFlowForecastPoint[];
};

export const CashFlowForecastApi = {
  get: (horizon: 30 | 60 | 90) =>
    apiGet<CashFlowForecastResponse>('/ai-insights/cash-flow/forecast', {
      horizon,
    }),
};
