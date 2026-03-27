import type { Business } from "@/shared/lib/mockData";
import { api } from "@/shared/lib/apiClient";

export const BusinessesApi = {
  // ✅ GET /businesses (owner businesses)
  listMine: () => api<Business[]>("/businesses"),

  // ✅ GET /businesses/:id
  getById: (id: string) => api<Business>(`/businesses/${id}`),

  // ✅ POST /businesses
  create: (payload: Partial<Business>) =>
    api<Business>("/businesses", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // ✅ PATCH /businesses/:id
  update: (id: string, payload: Partial<Business>) =>
    api<Business>(`/businesses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  // ✅ DELETE /businesses/:id
  remove: (id: string) =>
    api<{ ok?: boolean; deleted?: boolean; id?: string }>(`/businesses/${id}`, {
      method: "DELETE",
    }),

  // ✅ POST /businesses/:id/logo (multipart/form-data)
  // IMPORTANT: DO NOT set Content-Type manually when sending FormData
  uploadLogo: async (businessId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);

    return api<{ businessId: string; logoUrl: string }>(
      `/businesses/${businessId}/logo`,
      {
        method: "POST",
        body: fd as any, // because api() typed body as string sometimes
      }
    );
  },

  // ✅ PATCH /businesses/:id/profile
  completeProfile: (
    id: string,
    payload: {
      name?: string;
      type?: string;
      address?: string;
      city?: string;
      country?: string;
      taxId?: string;
      phone?: string;
      email?: string;
      website?: string;
      currency?: string;
      fiscalYearStart?: string; // YYYY-MM-DD
      industry?: string;
      taxRate?: number; // 0..100
      logoUrl?: string;
      registrationNumber?: string;
      isProfileComplete?: boolean;
    }
  ) =>
    api<Business>(`/businesses/${id}/profile`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  // =========================
  // ✅ ADMIN ACTIONS
  // =========================

  // ✅ GET /businesses/all
  listAll: () => api<Business[]>("/businesses/all"),

  // ✅ POST /businesses/admin
  createAsAdmin: (payload: Partial<Business>) =>
    api<Business>("/businesses/admin", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // ✅ PATCH /businesses/admin/:id
  updateAsAdmin: (id: string, payload: Partial<Business>) =>
    api<Business>(`/businesses/admin/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  // ✅ DELETE /businesses/admin/:id
  removeAsAdmin: (id: string) =>
    api<{ ok?: boolean; deleted?: boolean; id?: string }>(
      `/businesses/admin/${id}`,
      {
        method: "DELETE",
      }
    ),

  // ✅ DELETE /businesses/admin/all
  removeAllAsAdmin: () =>
    api<{ ok?: boolean; deletedAll?: boolean }>("/businesses/admin/all", {
      method: "DELETE",
    }),
};