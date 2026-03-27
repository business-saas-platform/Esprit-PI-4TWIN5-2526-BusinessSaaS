import { api } from "@/shared/lib/apiClient";

export type OwnerBusiness = {
  id: string;
  name: string;
  email?: string;
  status?: string;
  plan?: string;
  city?: string;
  country?: string;
  createdAt?: string;
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  daysRemaining?: number | null;
};

export type BusinessOwnerRow = {
  id: string;
  name: string;
  email: string;
  role?: string;
  status: "active" | "trial" | "suspended" | string;
  joinedAt: string;
  businessCount: number;
  businesses?: OwnerBusiness[];
  subscriptionPlan?: string | null;
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  daysRemaining?: number | null;
};

export type BusinessOwnerDetails = BusinessOwnerRow & {
  businesses: OwnerBusiness[];
};

export const BusinessOwnersApi = {
  // ✅ GET /users/admin/business-owners/all
  listAll: () =>
    api<BusinessOwnerRow[]>("/users/admin/business-owners/all"),

  // ✅ GET /users/admin/business-owners/:id
  getById: (id: string) =>
    api<BusinessOwnerDetails>(`/users/admin/business-owners/${id}`),

  // ✅ PATCH /users/admin/business-owners/:id/status
  updateStatus: (id: string, status: "active" | "suspended") =>
    api<BusinessOwnerRow>(`/users/admin/business-owners/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  // ✅ POST /users/admin/business-owners/create-with-business
  createWithBusiness: (payload: {
    user: {
      name: string;
      email: string;
      status?: string;
    };
    business: {
      name: string;
      type: string;
      address: string;
      city: string;
      country: string;
      taxId: string;
      phone: string;
      email: string;
      website?: string;
      currency: string;
      fiscalYearStart: string;
      industry: string;
      taxRate: number;
      status?: string;
      plan?: string;
      subscriptionStartDate?: string;
      subscriptionEndDate?: string;
    };
  }) =>
    api("/users/admin/business-owners/create-with-business", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};