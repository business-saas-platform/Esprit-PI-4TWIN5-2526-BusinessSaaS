import { api } from "../apiClient";
import type { User } from "@/shared/lib/mockData";

export type AuthResponse = {
  access_token: string;
  user: User;
  // ✅ new: backend يرجّعها كي يكون mdp temporaire
  mustChangePassword?: boolean;
  // ✅ optional: useful if you want to show lock info
  lockedUntil?: string | null;
};

export const AuthApi = {
  // ✅ Login avec captcha optionnel
  login: (email: string, password: string, captchaToken?: string) =>
    api<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        captchaToken, // 🔥 important pour backend verify (si تعمل verify)
      }),
    }),

  // ✅ Register
  register: (payload: {
    name: string;
    email: string;
    password: string;
    role?: User["role"];
    businessId?: string;
  }) =>
    api<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // ✅ Get current user
  me: () => api<User>("/auth/me"),

  // ✅ Accept invite
  acceptInvite: (payload: { token: string; password: string }) =>
    api<AuthResponse>("/auth/accept-invite", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // ✅ OAuth start (Google / GitHub)
  // NOTE: your backend route should match this.
  // If your backend uses /auth/google and /auth/github, change it accordingly.
  oauth: (provider: "google" | "github") => {
    window.location.href = `/api/auth/${provider}`;
  },

  // ✅ Force change password on first login
changePasswordFirst: (data: { newPassword: string }) =>
  api<{ ok: boolean; access_token: string; user: User }>(
    "/auth/change-password-first",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  ),
};
