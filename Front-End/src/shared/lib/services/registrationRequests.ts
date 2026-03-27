import { api } from "../apiClient";

export type RegistrationRequestStatus = "pending" | "approved" | "rejected";
export type PaymentStatus =
  | "unpaid"
  | "pending"
  | "pending_verification"
  | "paid"
  | "failed"
  | "waived";

export type PaymentMethod =
  | "mock_online"
  | "cash"
  | "bank_transfer"
  | "manual";

export type SelectedPlan = "starter" | "professional" | "enterprise";

export type RegistrationRequest = {
  id: string;
  ownerName: string;
  ownerEmail: string;
  companyName: string;
  companyCategory: string;
  companyPhone?: string | null;
  companyAddress?: string | null;
  companyTaxId?: string | null;
  teamSize?: string | null;
  message?: string | null;

  status: RegistrationRequestStatus;
  rejectionReason?: string | null;

  selectedPlan?: SelectedPlan | null;
  paymentMethod?: PaymentMethod | null;
  paymentStatus?: PaymentStatus | null;
  paymentProvider?: string | null;
  paymentReference?: string | null;
  paymentUrl?: string | null;
  paidAt?: string | null;

  reviewedByAdminId?: string | null;
  reviewedAt?: string | null;

  createdAt: string;
  updatedAt?: string;
};

export type CreateRegistrationRequestPayload = {
  ownerName: string;
  ownerEmail: string;
  companyName: string;
  companyCategory: string;
  companyPhone?: string;
  companyAddress?: string;
  companyTaxId?: string;
  teamSize?: string;
  message?: string;
  paymentMethod?: PaymentMethod;
  selectedPlan?: SelectedPlan;
};

export type ApproveRegistrationRequestPayload = {
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  currency?: string;
  fiscalYearStart?: string;
  industry?: string;
  taxId?: string;
};

export const RegistrationRequestsApi = {
  // =====================================================
  // Public - owner request
  // =====================================================
  create: (payload: CreateRegistrationRequestPayload) =>
    api<RegistrationRequest>("/registration-requests", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // =====================================================
  // Admin - list
  // garde ton ancienne fonction sans la casser
  // =====================================================
  list: (status: RegistrationRequestStatus = "pending") =>
    api<RegistrationRequest[]>(`/registration-requests?status=${status}`),

  // =====================================================
  // Admin - list with optional paymentStatus filter
  // nouvelle fonction, sans casser l'ancienne
  // =====================================================
  listAdvanced: (params?: {
    status?: RegistrationRequestStatus;
    paymentStatus?: PaymentStatus;
  }) => {
    const search = new URLSearchParams();

    if (params?.status) {
      search.set("status", params.status);
    }

    if (params?.paymentStatus) {
      search.set("paymentStatus", params.paymentStatus);
    }

    const query = search.toString();
    return api<RegistrationRequest[]>(
      `/registration-requests${query ? `?${query}` : ""}`
    );
  },

  // =====================================================
  // Admin - find one
  // =====================================================
  findOne: (id: string) =>
    api<RegistrationRequest>(`/registration-requests/${id}`),

  // =====================================================
  // Admin - approve
  // garde ton ancienne fonction mais supporte dto optionnel
  // =====================================================
  approve: (id: string, payload?: ApproveRegistrationRequestPayload) =>
    api<{ ok: true; ownerId?: string; businessId?: string }>(
      `/registration-requests/${id}/approve`,
      {
        method: "POST",
        body: JSON.stringify(payload ?? {}),
      }
    ),

  // =====================================================
  // Admin - reject
  // =====================================================
  reject: (id: string, reason: string) =>
    api<{ ok: true }>(`/registration-requests/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  // =====================================================
  // Admin - create mock payment session
  // =====================================================
  createMockPayment: (id: string) =>
    api<RegistrationRequest>(`/registration-requests/${id}/mock-payment/create`, {
      method: "POST",
    }),

  // =====================================================
  // Public/Admin - mock payment success
  // =====================================================
  mockPaymentSuccess: (id: string) =>
    api<RegistrationRequest>(`/registration-requests/${id}/mock-payment/success`, {
      method: "POST",
    }),

  // =====================================================
  // Public/Admin - mock payment fail
  // =====================================================
  mockPaymentFail: (id: string) =>
    api<RegistrationRequest>(`/registration-requests/${id}/mock-payment/fail`, {
      method: "POST",
    }),

  // =====================================================
  // Admin - update payment status manually
  // =====================================================
  updatePaymentStatus: (
    id: string,
    payload: {
      paymentStatus: PaymentStatus;
      paymentReference?: string;
    }
  ) =>
    api<RegistrationRequest>(`/registration-requests/${id}/payment-status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};