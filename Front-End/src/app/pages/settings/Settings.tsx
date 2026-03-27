import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/shared/contexts/AuthContext";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  User,
  Shield,
  Lock,
  Info,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  KeyRound,
  Mail,
  BadgeCheck,
  Building2,
} from "lucide-react";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:3000/api";

function authHeaders() {
  const token = localStorage.getItem("access_token") ?? "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function apiPatch(path: string, body: object) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

async function apiPost(path: string, body: object) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

async function apiGet(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

function getInitials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function formatRole(role?: string) {
  if (!role) return "User";
  return role.replace(/_/g, " ");
}

function fieldClass(hasError?: boolean) {
  return `h-11 rounded-2xl border ${
    hasError
      ? "border-red-300 focus-visible:ring-red-200"
      : "border-slate-200 focus-visible:ring-indigo-200"
  } bg-white`;
}

// ─────────────────────────────────────────────────────────
// PASSWORD RULES
// ─────────────────────────────────────────────────────────
function PasswordRules({ password }: { password: string }) {
  const rules = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "One uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "One lowercase letter", ok: /[a-z]/.test(password) },
    { label: "One number", ok: /[0-9]/.test(password) },
  ];

  return (
    <div className="grid gap-2 pt-1 sm:grid-cols-2">
      {rules.map((r) => (
        <div
          key={r.label}
          className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs ${
            r.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-50 text-slate-500"
          }`}
        >
          {r.ok ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <div className="h-3.5 w-3.5 rounded-full border border-current opacity-60" />
          )}
          <span>{r.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// PRESET SECURITY QUESTIONS
// ─────────────────────────────────────────────────────────
const PRESET_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your elementary school?",
  "What was the make of your first car?",
  "What is the middle name of your oldest sibling?",
  "What street did you grow up on?",
  "What was your childhood nickname?",
];

type Tab = "profile" | "password" | "security" | "account";

// ─────────────────────────────────────────────────────────
// MAIN SETTINGS PAGE
// ─────────────────────────────────────────────────────────
export function Settings() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("profile");

  const tabs: {
    id: Tab;
    label: string;
    icon: React.ReactNode;
    description: string;
  }[] = [
    {
      id: "profile",
      label: "Personal Info",
      icon: <User className="h-4 w-4" />,
      description: "Manage your identity details",
    },
    {
      id: "password",
      label: "Password",
      icon: <Lock className="h-4 w-4" />,
      description: "Update and secure your password",
    },
    {
      id: "security",
      label: "Security Questions",
      icon: <Shield className="h-4 w-4" />,
      description: "Recovery and verification setup",
    },
    {
      id: "account",
      label: "Account Status",
      icon: <Info className="h-4 w-4" />,
      description: "Read-only account information",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 md:px-6 lg:px-8">
      {/* HERO */}
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-sm">
        <div className="relative p-6 md:p-8 xl:p-10">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80">
                <Sparkles className="h-3.5 w-3.5" />
                Personal account workspace
              </div>

              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl xl:text-5xl">
                  Settings
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                  Gère ton profil, ton mot de passe, tes questions de sécurité
                  et l’état de ton compte dans une interface plus propre et plus
                  professionnelle.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85">
                  <BadgeCheck className="h-4 w-4" />
                  {user?.name || "User"}
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85">
                  <Mail className="h-4 w-4" />
                  {user?.email || "No email"}
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85">
                  <Building2 className="h-4 w-4" />
                  {formatRole(user?.role)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-[28px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-xl font-bold text-white">
                {getInitials(user?.name)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {user?.name || "Unknown user"}
                </p>
                <p className="truncate text-xs text-white/70">
                  {user?.email || "No email"}
                </p>
                <p className="mt-1 text-xs text-white/70 capitalize">
                  {formatRole(user?.role)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TABS */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {tabs.map((t) => {
            const active = tab === t.id;

            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`group rounded-[24px] border p-4 text-left transition-all ${
                  active
                    ? "border-indigo-200 bg-indigo-50 shadow-sm"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                      active
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {t.icon}
                  </div>

                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${
                      active
                        ? "text-indigo-500"
                        : "text-slate-400 group-hover:translate-x-0.5"
                    }`}
                  />
                </div>

                <div className="mt-4">
                  <h3
                    className={`font-semibold ${
                      active ? "text-indigo-700" : "text-slate-900"
                    }`}
                  >
                    {t.label}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{t.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* CONTENT */}
      <section>
        {tab === "profile" && <ProfileSection />}
        {tab === "password" && <PasswordSection />}
        {tab === "security" && <SecurityQuestionsSection />}
        {tab === "account" && <AccountStatusSection user={user} />}
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SECTION 1: Personal Info
// ─────────────────────────────────────────────────────────
function ProfileSection() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name cannot be empty.");
    setLoading(true);
    try {
      await apiPatch(`/users/${user?.id}`, { name: name.trim() });
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="rounded-[30px] border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-5">
          <CardTitle className="text-xl text-slate-900">
            Personal Information
          </CardTitle>
          <CardDescription>
            Update your displayed name and review your account identity.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="flex items-center gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 text-xl font-bold text-white shadow-sm">
                {getInitials(name)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{name || "Unnamed user"}</p>
                <p className="text-sm text-slate-500 capitalize">
                  {formatRole(user?.role)}
                </p>
                <p className="truncate text-xs text-slate-400">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
                className={fieldClass()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                value={email}
                disabled
                className="h-11 cursor-not-allowed rounded-2xl border-slate-200 bg-slate-100 text-slate-500"
              />
              <p className="text-xs text-slate-500">
                Email cannot be changed. Contact an admin if needed.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="h-11 rounded-2xl px-5"
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-[30px] border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-5">
          <CardTitle className="text-xl text-slate-900">Profile Overview</CardTitle>
          <CardDescription>
            Vue rapide sur ton identité et ton rôle dans la plateforme.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 p-6">
          <InfoRow label="Display Name" value={name || "—"} />
          <InfoRow label="Email" value={email || "—"} />
          <InfoRow label="Role" value={formatRole(user?.role)} />
          <InfoRow label="User ID" value={user?.id || "—"} mono />
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SECTION 2: Change Password
// ─────────────────────────────────────────────────────────
function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const mismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!currentPassword)
      return toast.error("Please enter your current password.");
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) {
      return toast.error("New password does not meet requirements.");
    }
    if (newPassword !== confirmPassword)
      return toast.error("Passwords do not match.");

    setLoading(true);
    try {
      await apiPost("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card className="rounded-[30px] border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-5">
          <CardTitle className="text-xl text-slate-900">
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password securely using your current password.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
                className={fieldClass()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
                className={fieldClass()}
              />
              <PasswordRules password={newPassword} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                className={fieldClass(mismatch)}
              />
              {mismatch && (
                <p className="text-xs text-red-500">Passwords do not match.</p>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="h-11 rounded-2xl px-5"
              >
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-[30px] border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-5">
          <CardTitle className="text-xl text-slate-900">Security Tips</CardTitle>
          <CardDescription>
            Quelques règles simples pour un mot de passe plus fort.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 p-6">
          <TipBox
            icon={<KeyRound className="h-4 w-4" />}
            title="Use a unique password"
            text="Ma تستعملش نفس mot de passe dans plusieurs comptes."
          />
          <TipBox
            icon={<Shield className="h-4 w-4" />}
            title="Mix characters"
            text="A7سن mot de passe فيه majuscule, minuscule, chiffres w longueur correcte."
          />
          <TipBox
            icon={<AlertTriangle className="h-4 w-4" />}
            title="Avoid weak patterns"
            text="B3id 3la 123456, azerty, date de naissance ou prénom."
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SECTION 3: Security Questions
// ─────────────────────────────────────────────────────────
function SecurityQuestionsSection() {
  const [selected, setSelected] = useState(["", "", ""]);
  const [answers, setAnswers] = useState(["", "", ""]);
  const [loading, setLoading] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    apiGet("/security-questions/status")
      .then((data) => setHasExisting(data.hasQuestions))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  function availableFor(index: number) {
    return PRESET_QUESTIONS.filter(
      (q) => q === selected[index] || !selected.includes(q)
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selected.some((q) => !q))
      return toast.error("Please select all 3 questions.");
    if (answers.some((a) => !a.trim()))
      return toast.error("Please answer all 3 questions.");
    if (new Set(selected).size < 3)
      return toast.error("Please choose 3 different questions.");

    setLoading(true);
    try {
      await apiPost("/security-questions/setup", {
        questions: selected.map((q, i) => ({ question: q, answer: answers[i] })),
      });
      toast.success(
        hasExisting
          ? "Security questions updated!"
          : "Security questions saved!"
      );
      setHasExisting(true);
      setAnswers(["", "", ""]);
    } catch (err: any) {
      toast.error(err.message || "Failed to save questions.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <Card className="rounded-[30px] border-slate-200 shadow-sm">
        <CardContent className="py-12 text-center text-sm text-slate-500">
          Loading...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="rounded-[30px] border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-5">
          <CardTitle className="text-xl text-slate-900">
            Security Questions
          </CardTitle>
          <CardDescription>
            {hasExisting
              ? "Your security questions are already configured. You can update them below."
              : "Set up 3 security questions to help recover your account."}
          </CardDescription>

          {hasExisting && (
            <div className="mt-2 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Security questions are active
            </div>
          )}
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4"
              >
                <div className="mb-3">
                  <Label className="text-sm font-semibold text-slate-900">
                    Question {i + 1}
                  </Label>
                </div>

                <div className="space-y-3">
                  <Select
                    value={selected[i]}
                    onValueChange={(val) => {
                      const arr = [...selected];
                      arr[i] = val;
                      setSelected(arr);
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white">
                      <SelectValue placeholder="Select a question..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFor(i).map((q) => (
                        <SelectItem key={q} value={q}>
                          {q}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="text"
                    placeholder="Your answer"
                    value={answers[i]}
                    onChange={(e) => {
                      const arr = [...answers];
                      arr[i] = e.target.value;
                      setAnswers(arr);
                    }}
                    disabled={!selected[i]}
                    required
                    className="h-11 rounded-2xl border-slate-200 bg-white"
                  />
                </div>
              </div>
            ))}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="h-11 rounded-2xl px-5"
              >
                {loading
                  ? "Saving..."
                  : hasExisting
                  ? "Update Questions"
                  : "Save Questions"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-[30px] border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-5">
          <CardTitle className="text-xl text-slate-900">Recovery Notes</CardTitle>
          <CardDescription>
            Best practices pour garder des questions utiles et sûres.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 p-6">
          <TipBox
            icon={<Shield className="h-4 w-4" />}
            title="Choose memorable answers"
            text="Choisis des réponses que toi seul peux retenir facilement."
          />
          <TipBox
            icon={<AlertTriangle className="h-4 w-4" />}
            title="Avoid obvious public info"
            text="Ma t7ottch réponse facile à trouver sur réseaux sociaux."
          />
          <TipBox
            icon={<CheckCircle2 className="h-4 w-4" />}
            title="Keep them updated"
            text="Ken تبدّل المعطيات ou تحب تزيد sécurité, mets-les à jour."
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SECTION 4: Account Status
// ─────────────────────────────────────────────────────────
function AccountStatusSection({ user }: { user: any }) {
  const statusItems = [
    { label: "User ID", value: user?.id ?? "—", mono: true },
    { label: "Role", value: formatRole(user?.role) ?? "—" },
    { label: "Business ID", value: user?.businessId ?? "No business linked", mono: true },
    {
      label: "Account Status",
      value:
        user?.lockedUntil && new Date(user.lockedUntil) > new Date()
          ? `Locked until ${new Date(user.lockedUntil).toLocaleTimeString()}`
          : "Active",
      highlight:
        user?.lockedUntil && new Date(user.lockedUntil) > new Date()
          ? "warning"
          : "success",
    },
    {
      label: "Password Change Required",
      value: user?.mustChangePassword ? "Yes" : "No",
      highlight: user?.mustChangePassword ? "warning" : "success",
    },
    {
      label: "Member Since",
      value: user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString()
        : "—",
    },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card className="rounded-[30px] border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-5">
          <CardTitle className="text-xl text-slate-900">Account Status</CardTitle>
          <CardDescription>
            Read-only overview of your account metadata.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 p-6">
          {statusItems.map((item) => (
            <div
              key={item.label}
              className="flex flex-col gap-2 rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-sm font-medium text-slate-500">
                {item.label}
              </span>

              <span
                className={`max-w-full break-all text-sm sm:max-w-[60%] sm:text-right ${
                  item.mono ? "font-mono text-xs" : "font-medium"
                } ${
                  item.highlight === "success"
                    ? "text-emerald-600"
                    : item.highlight === "warning"
                    ? "text-amber-600"
                    : "text-slate-900"
                }`}
              >
                {item.highlight === "success" && (
                  <CheckCircle2 className="mr-1 inline h-4 w-4" />
                )}
                {item.highlight === "warning" && (
                  <AlertTriangle className="mr-1 inline h-4 w-4" />
                )}
                {item.value}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[30px] border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-5">
          <CardTitle className="text-xl text-slate-900">Account Summary</CardTitle>
          <CardDescription>
            Petit résumé visuel de ton état actuel.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 p-6">
          <TipBox
            icon={<BadgeCheck className="h-4 w-4" />}
            title="Current Role"
            text={formatRole(user?.role)}
          />
          <TipBox
            icon={<Info className="h-4 w-4" />}
            title="Business Link"
            text={user?.businessId || "No business linked"}
            mono
          />
          <TipBox
            icon={<User className="h-4 w-4" />}
            title="Account Identifier"
            text={user?.id || "—"}
            mono
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SMALL UI HELPERS
// ─────────────────────────────────────────────────────────
function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <span
        className={`max-w-full break-all text-sm text-slate-900 sm:max-w-[60%] sm:text-right ${
          mono ? "font-mono text-xs" : "font-medium"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function TipBox({
  icon,
  title,
  text,
  mono = false,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-slate-900">{title}</p>
          <p
            className={`mt-1 text-sm text-slate-500 ${
              mono ? "break-all font-mono text-xs" : ""
            }`}
          >
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}