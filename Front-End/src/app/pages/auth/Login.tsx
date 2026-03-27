import React, { useMemo, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { toast } from "sonner";
import { Turnstile } from "@marsidev/react-turnstile";
import {
  Github,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { useAuth } from "@/shared/contexts/AuthContext";

type Role =
  | "platform_admin"
  | "business_owner"
  | "business_admin"
  | "accountant"
  | "team_member"
  | "client"
  | string;

type LocationState = {
  from?: { pathname?: string } | string;
};

type LoginResult = {
  user?: {
    role?: Role;
    [key: string]: any;
  };
  mustChangePassword?: boolean;
};

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.74 1.22 9.25 3.6l6.9-6.9C35.64 2.1 30.2 0 24 0 14.62 0 6.51 5.36 2.7 13.22l8.05 6.25C12.74 13.32 17.94 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.5 24.5c0-1.64-.15-3.22-.43-4.75H24v9h12.7c-.55 2.95-2.22 5.45-4.74 7.13l7.3 5.67C43.94 37.66 46.5 31.64 46.5 24.5z"
    />
    <path
      fill="#FBBC05"
      d="M10.75 28.47c-1.05-3.13-1.05-6.51 0-9.64L2.7 12.58C.96 15.92 0 19.86 0 24s.96 8.08 2.7 11.42l8.05-6.25z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.2 0 11.64-2.05 15.52-5.6l-7.3-5.67c-2.03 1.36-4.63 2.17-8.22 2.17-6.06 0-11.26-3.82-13.25-9.97l-8.05 6.25C6.51 42.64 14.62 48 24 48z"
    />
  </svg>
);

function getErrorMessage(err: any): string {
  const message = err?.response?.data?.message || err?.message;

  if (Array.isArray(message)) return message.join(", ");
  if (typeof message === "string") return message;

  return "Invalid credentials";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getRedirectPath(role?: Role, from?: string) {
  if (role === "platform_admin") return "/admin";
  return from || "/dashboard";
}

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState | null) ?? null;

  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(
    null
  );

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const siteKey = useMemo(
    () => import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined,
    []
  );

  const backendUrl = useMemo(
    () => import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api",
    []
  );

  const isSubmitting = loading || oauthLoading !== null;
  const cleanEmail = email.trim().toLowerCase();

  const from = state?.from;
  const fromPath = typeof from === "string" ? from : from?.pathname;

  const emailError =
    emailTouched && cleanEmail && !isValidEmail(cleanEmail)
      ? "Please enter a valid email address."
      : "";

  const passwordError =
    passwordTouched && password && password.length < 6
      ? "Password must contain at least 6 characters."
      : "";

  const startOAuth = (provider: "google" | "github") => {
    try {
      setFormError("");
      setOauthLoading(provider);
      window.location.href = `${backendUrl}/auth/${provider}`;
    } catch {
      setOauthLoading(null);
      toast.error("OAuth error", {
        description: `Unable to start ${provider} authentication.`,
      });
    }
  };

  const validateForm = () => {
    if (!cleanEmail || !password) {
      return "Please enter your email and password.";
    }

    if (!isValidEmail(cleanEmail)) {
      return "Please enter a valid email address.";
    }

    if (password.length < 6) {
      return "Password must contain at least 6 characters.";
    }

    if (!captchaToken) {
      return "Please verify that you are human.";
    }

    return "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setEmailTouched(true);
    setPasswordTouched(true);
    setFormError("");

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      toast.error("Validation error", {
        description: validationError,
      });
      return;
    }

    try {
      setLoading(true);

      if (rememberMe) {
        localStorage.setItem("remembered_email", cleanEmail);
      } else {
        localStorage.removeItem("remembered_email");
      }

      const result = (await login(
        cleanEmail,
        password,
        captchaToken as string
      )) as LoginResult;

      const user = result?.user;
      const mustChangePassword = !!result?.mustChangePassword;

      if (!user) {
        toast.error("Login failed", {
          description: "User information was not returned by the server.",
        });
        return;
      }

      if (mustChangePassword) {
        toast.info("First login detected", {
          description: "Please change your password before continuing.",
        });

        navigate("/auth/force-change-password", {
          replace: true,
          state: { from: fromPath || "/dashboard" },
        });
        return;
      }

      toast.success("Login successful", {
        description: "Welcome back to your workspace.",
      });

      navigate(getRedirectPath(user.role, fromPath), { replace: true });
    } catch (err: any) {
      const msg = getErrorMessage(err);
      const normalized = String(msg).toLowerCase();

      if (normalized.includes("locked")) {
        toast.error("Account locked", {
          description:
            "Too many failed attempts. Your account is locked for 1 hour.",
        });
        setFormError("Your account is temporarily locked for 1 hour.");
      } else if (
        normalized.includes("invalid credentials") ||
        normalized.includes("unauthorized") ||
        normalized.includes("wrong password")
      ) {
        toast.error("Login failed", {
          description: "Incorrect email or password.",
        });
        setFormError("Incorrect email or password.");
      } else {
        toast.error("Login failed", {
          description: msg,
        });
        setFormError(msg);
      }

      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const savedEmail = localStorage.getItem("remembered_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  return (
    <Card className="w-full rounded-3xl border border-slate-200/80 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm">
      <CardHeader className="space-y-4 pb-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </div>

        <div className="text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            <Sparkles className="h-3.5 w-3.5" />
            Secure business access
          </div>

          <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">
            Welcome back
          </CardTitle>

          <CardDescription className="mt-2 text-sm leading-6 text-slate-500">
            Sign in to access your business workspace and manage your operations
            securely.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
            onClick={() => startOAuth("google")}
            disabled={isSubmitting}
          >
            {oauthLoading === "google" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <span className="mr-2">
                <GoogleIcon />
              </span>
            )}
            Continue with Google
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
            onClick={() => startOAuth("github")}
            disabled={isSubmitting}
          >
            {oauthLoading === "github" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Github className="mr-2 h-4 w-4" />
            )}
            Continue with GitHub
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase tracking-[0.2em]">
            <span className="bg-white px-3 text-slate-400">
              Or continue with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email address
            </Label>

            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (formError) setFormError("");
                }}
                onBlur={() => setEmailTouched(true)}
                placeholder="you@company.com"
                required
                autoComplete="username"
                disabled={isSubmitting}
                className="h-12 rounded-xl border-slate-200 bg-slate-50/60 pl-10 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white"
              />
            </div>

            {emailError && (
              <p className="text-xs font-medium text-red-500">{emailError}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-slate-700"
              >
                Password
              </Label>

              <Link
                to="/auth/forgot-password"
                className="text-sm font-medium text-primary transition hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (formError) setFormError("");
                }}
                onBlur={() => setPasswordTouched(true)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                disabled={isSubmitting}
                className="h-12 rounded-xl border-slate-200 bg-slate-50/60 pl-10 pr-12 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white"
              />

              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {passwordError && (
              <p className="text-xs font-medium text-red-500">{passwordError}</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isSubmitting}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              Remember me
            </label>

            <span className="text-xs text-slate-400">
              Protected by Turnstile
            </span>
          </div>

          {siteKey ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <Turnstile
                siteKey={siteKey}
                onSuccess={(token) => setCaptchaToken(token)}
                onError={() => setCaptchaToken(null)}
                onExpire={() => setCaptchaToken(null)}
                options={{ theme: "light" }}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-700">
              CAPTCHA is not configured. Add{" "}
              <span className="font-semibold">VITE_TURNSTILE_SITE_KEY</span> in
              your environment variables.
            </div>
          )}

          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {formError}
            </div>
          )}

          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-slate-950 text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting || !siteKey}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>

          <div className="text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link
              to="/auth/register"
              className="font-semibold text-primary transition hover:underline"
            >
              Sign up
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}