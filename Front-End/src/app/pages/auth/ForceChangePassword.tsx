import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

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

import { AuthApi } from "@/shared/lib/services/auth";

function hasMinLength(password: string) {
  return password.length >= 8;
}

function hasUppercase(password: string) {
  return /[A-Z]/.test(password);
}

function hasLowercase(password: string) {
  return /[a-z]/.test(password);
}

function hasNumber(password: string) {
  return /[0-9]/.test(password);
}

function isValidPassword(password: string) {
  return (
    hasMinLength(password) &&
    hasUppercase(password) &&
    hasLowercase(password) &&
    hasNumber(password)
  );
}

function RuleItem({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs sm:text-sm ${
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-500"
      }`}
    >
      {ok ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      <span>{text}</span>
    </div>
  );
}

export default function ForceChangePassword() {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);

  const passwordChecks = useMemo(
    () => ({
      minLength: hasMinLength(newPassword),
      uppercase: hasUppercase(newPassword),
      lowercase: hasLowercase(newPassword),
      number: hasNumber(newPassword),
    }),
    [newPassword]
  );

  const passwordValid = isValidPassword(newPassword);
  const confirmValid =
    confirmPassword.length > 0 && newPassword === confirmPassword;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword.trim()) {
      toast.error("Current password is required.");
      return;
    }

    if (!passwordValid) {
      toast.error(
        "Password must be at least 8 characters and include 1 uppercase, 1 lowercase and 1 number."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await AuthApi.changePasswordFirst({
        currentPassword,
        newPassword,
      });

      toast.success("Password updated!");
      navigate("/auth/setup-security-questions", { replace: true });
    } catch (err: any) {
      const msg = err?.message || "Error";

      if (String(msg).toLowerCase().includes("not required")) {
        toast.info("Password already updated. Continuing...");
        navigate("/auth/setup-security-questions", { replace: true });
        return;
      }

      toast.error("Failed", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6 sm:px-0">
      <Card className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-6 sm:px-8">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Lock className="h-6 w-6" />
          </div>

          <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Change Password
          </CardTitle>

          <CardDescription className="max-w-lg text-sm leading-6 text-slate-500">
            Pour continuer, change d’abord ton mot de passe temporaire par un mot
            de passe sécurisé.
          </CardDescription>

          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Après cette étape, tu seras redirigé vers la configuration des
              questions de sécurité.
            </p>
          </div>
        </CardHeader>

        <CardContent className="px-6 py-6 sm:px-8">
          <form onSubmit={submit} className="space-y-6" noValidate>
            <div className="space-y-2">
              <Label
                htmlFor="currentPassword"
                className="text-sm font-medium text-slate-700"
              >
                Current password
              </Label>

              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  placeholder="Enter your current password"
                  className="h-12 rounded-2xl border-slate-200 pr-12 shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-200"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                >
                  {showCurrent ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="newPassword"
                className="text-sm font-medium text-slate-700"
              >
                New password
              </Label>

              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  placeholder="Create a strong password"
                  className="h-12 rounded-2xl border-slate-200 pr-12 shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-200"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                >
                  {showNew ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <RuleItem ok={passwordChecks.minLength} text="At least 8 characters" />
              <RuleItem ok={passwordChecks.uppercase} text="1 uppercase letter" />
              <RuleItem ok={passwordChecks.lowercase} text="1 lowercase letter" />
              <RuleItem ok={passwordChecks.number} text="1 number" />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-slate-700"
              >
                Confirm new password
              </Label>

              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  placeholder="Confirm your new password"
                  className={`h-12 rounded-2xl pr-12 shadow-sm focus-visible:ring-2 ${
                    confirmPassword.length === 0
                      ? "border-slate-200 focus-visible:ring-indigo-200"
                      : confirmValid
                      ? "border-emerald-300 focus-visible:ring-emerald-200"
                      : "border-red-300 focus-visible:ring-red-200"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {confirmPassword.length > 0 && !confirmValid && (
                <p className="text-sm text-red-500">Passwords do not match.</p>
              )}

              {confirmValid && (
                <p className="text-sm text-emerald-600">
                  Password confirmation is correct.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">Note :</span> choisi
              un mot de passe fort, parce que c’est la base de sécurité de ton compte.
            </div>

            <Button
              type="submit"
              className="h-12 w-full rounded-2xl bg-slate-900 text-base font-medium text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800"
              disabled={loading}
            >
              {loading ? "Saving..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}