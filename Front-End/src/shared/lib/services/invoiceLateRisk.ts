import { apiGet } from '@/shared/lib/apiClient';

export type InvoiceRiskLevel = 'low' | 'medium' | 'high';

export type InvoiceLateRiskItem = {
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  dueDate: string;
  status: string;
  totalAmount: number;
  riskScore: number;
  riskLevel: InvoiceRiskLevel;
  reasons: string[];
};

export type InvoiceLateRiskResponse = {
  generatedAt: string;
  modelSource: string;
  summary: {
    scoredInvoices: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    averageRisk: number;
  };
  debug?: {
    mlConfigured: boolean;
    mlAttempted: boolean;
    mlUsed: boolean;
    fallbackUsed: boolean;
    mlError: string | null;
    totalInvoices: number;
    openInvoices: number;
  };
  items: InvoiceLateRiskItem[];
};

export const InvoiceLateRiskApi = {
  get: () => apiGet<InvoiceLateRiskResponse>('/ai-insights/invoices/late-payment-risk'),
};
