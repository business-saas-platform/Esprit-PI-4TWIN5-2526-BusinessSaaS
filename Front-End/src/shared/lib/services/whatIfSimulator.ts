import { apiDelete, apiGet, apiPatch, apiPost } from '@/shared/lib/apiClient';

export type WhatIfRisk = 'low' | 'medium' | 'high';

export type WhatIfPoint = {
  date: string;
  baselineInflow: number;
  baselineOutflow: number;
  baselineNet: number;
  simulatedInflow: number;
  simulatedOutflow: number;
  simulatedNet: number;
  deltaNet: number;
  projectedBalance: number;
};

export type WhatIfSimulationResponse = {
  horizon: 30 | 60 | 90;
  generatedAt: string;
  scenario: {
    collectionAccelerationPct: number;
    collectionDelayPct: number;
    expenseReductionPct: number;
    expenseIncreasePct: number;
  };
  baseline: {
    modelSource: string;
    expectedInflow: number;
    expectedOutflow: number;
    expectedNet: number;
    risk: WhatIfRisk;
    confidence: number;
  };
  simulated: {
    expectedInflow: number;
    expectedOutflow: number;
    expectedNet: number;
    risk: WhatIfRisk;
  };
  impact: {
    deltaExpectedNet: number;
    improvementPct: number;
  };
  points: WhatIfPoint[];
};

export type SavedWhatIfScenario = {
  id: string;
  name: string;
  horizon: 30 | 60 | 90;
  scenario: {
    collectionAccelerationPct: number;
    collectionDelayPct: number;
    expenseReductionPct: number;
    expenseIncreasePct: number;
  };
  baseline: {
    expectedNet: number;
    risk: WhatIfRisk;
  };
  simulated: {
    expectedNet: number;
    risk: WhatIfRisk;
  };
  impact: {
    deltaExpectedNet: number;
    improvementPct: number;
  };
  createdAt: string | null;
  updatedAt: string | null;
};

export const WhatIfSimulatorApi = {
  run: (payload: {
    horizon: 30 | 60 | 90;
    collectionAccelerationPct: number;
    collectionDelayPct: number;
    expenseReductionPct: number;
    expenseIncreasePct: number;
  }) => apiPost<WhatIfSimulationResponse>('/ai-insights/cash-flow/what-if', payload),
  saveScenario: (payload: {
    name: string;
    horizon: 30 | 60 | 90;
    collectionAccelerationPct: number;
    collectionDelayPct: number;
    expenseReductionPct: number;
    expenseIncreasePct: number;
  }) => apiPost<SavedWhatIfScenario>('/ai-insights/cash-flow/what-if/scenarios', payload),
  listScenarios: () => apiGet<SavedWhatIfScenario[]>('/ai-insights/cash-flow/what-if/scenarios'),
  updateScenario: (
    scenarioId: string,
    payload: {
      name?: string;
      horizon: 30 | 60 | 90;
      collectionAccelerationPct: number;
      collectionDelayPct: number;
      expenseReductionPct: number;
      expenseIncreasePct: number;
    }
  ) => apiPatch<SavedWhatIfScenario>(`/ai-insights/cash-flow/what-if/scenarios/${scenarioId}`, payload),
  deleteScenario: (scenarioId: string) =>
    apiDelete<{ deleted: boolean; id: string }>(`/ai-insights/cash-flow/what-if/scenarios/${scenarioId}`),
};
