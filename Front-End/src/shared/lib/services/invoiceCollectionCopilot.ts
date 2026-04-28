import { apiGet, apiPatch } from '@/shared/lib/apiClient';

export type CopilotRiskLevel = 'low' | 'medium' | 'high';
export type CopilotUrgency = 'low' | 'medium' | 'high';
export type CopilotChannel = 'email' | 'call' | 'whatsapp';

export type InvoiceCollectionAction = {
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  dueDate: string;
  status: string;
  totalAmount: number;
  riskScore: number;
  riskLevel: CopilotRiskLevel;
  priorityRank: number;
  urgency: CopilotUrgency;
  recommendedChannel: CopilotChannel;
  followUpInHours: number;
  subject: string;
  message: string;
  callScript: string;
  rationale: string[];
  workflow: {
    status: 'pending' | 'snoozed' | 'done';
    snoozedUntil: string | null;
    doneAt: string | null;
    outcomeNote: string | null;
    outcomeAmountCollected: number | null;
    nextStep: string | null;
    updatedAt: string | null;
  };
};

export type InvoiceCollectionCopilotResponse = {
  generatedAt: string;
  modelSource: string;
  summary: {
    consideredInvoices: number;
    plannedActions: number;
    highUrgency: number;
    mediumUrgency: number;
    lowUrgency: number;
  };
  debug?: {
    mlConfigured: boolean;
    mlAttempted: boolean;
    mlUsed: boolean;
    fallbackUsed: boolean;
    mlError: string | null;
    totalInvoices: number;
    openInvoices: number;
  } | null;
  actions: InvoiceCollectionAction[];
};

export const InvoiceCollectionCopilotApi = {
  get: (limit = 10) =>
    apiGet<InvoiceCollectionCopilotResponse>('/ai-insights/invoices/collection-copilot', { limit }),
  updateAction: (
    invoiceId: string,
    payload: {
      status: 'pending' | 'snoozed' | 'done';
      snoozedUntil?: string;
      outcomeNote?: string;
      outcomeAmountCollected?: number;
      nextStep?: string;
    }
  ) =>
    apiPatch<{
      invoiceId: string;
      status: 'pending' | 'snoozed' | 'done';
      snoozedUntil: string | null;
      doneAt: string | null;
      outcomeNote: string | null;
      outcomeAmountCollected: number | null;
      nextStep: string | null;
      updatedAt: string | null;
    }>(`/ai-insights/invoices/collection-copilot/${invoiceId}`, payload),
};
