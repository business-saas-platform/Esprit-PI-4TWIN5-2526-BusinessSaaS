import { api } from "@/shared/lib/apiClient";

export type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  amount: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  businessId: string;
  clientId: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  notes?: string;
  items: InvoiceItem[];
};

export const InvoicesApi = {
  list: async (businessId: string) => {
    return api<Invoice[]>(`/invoices?businessId=${businessId}`);
  },

  get: async (id: string) => {
    return api<Invoice>(`/invoices/${id}`);
  },

  create: async (payload: any) => {
    return api<Invoice>(`/invoices`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  markSent: async (id: string) => {
    return api<Invoice>(`/invoices/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "sent" }),
    });
  },

  markPaid: async (id: string) => {
    return api<Invoice>(`/invoices/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "paid" }),
    });
  },
    updateStatus: async (
    id: string,
    status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
  ) => {
    return api<Invoice>(`/invoices/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
};