import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "../../../app/components/ui/button";
import { Input } from "../../../app/components/ui/input";
import { Label } from "../../../app/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../app/components/ui/card";
import { toast } from "sonner";

const API_BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:3000/api";

async function apiPost(path: string, body: object) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

type Step = "email" | "questions" | "password" | "done";

function PasswordRules({ password }: { password: string }) {
  const rules = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "One uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "One lowercase letter", ok: /[a-z]/.test(password) },
    { label: "One number", ok: /[0-9]/.test(password) },
  ];
  return (
    <ul className="mt-1 space-y-1">
      {rules.map((r) => (
        <li
          key={r.label}
          className={`text-xs flex items-center gap-1.5 ${
            r.ok ? "text-green-500" : "text-muted-foreground"
          }`}
        >
          <span>{r.ok ? "✓" : "○"}</span>
          {r.label}
        </li>
      ))}
    </ul>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps: Step[] = ["email", "questions", "password", "done"];
  const labels = ["Email", "Questions", "New Password", "Done"];
  const current = steps.indexOf(step);
  return (
    <div className="flex items-center justify-center gap-0 mb-2">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex flex-col items-center">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                i < current
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : i === current
                  ? "border-indigo-600 text-indigo-600 bg-card"
                  : "border-muted text-muted-foreground bg-card"
              }`}
            >
              {i < current ? "✓" : i + 1}
            </div>
            <span
              className={`text-[10px] mt-0.5 ${
                i <= current ? "text-indigo-600" : "text-muted-foreground"
              }`}
            >
              {labels[i]}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`h-0.5 w-8 mb-4 mx-1 transition-colors ${
                i < current ? "bg-indigo-600" : "bg-muted"
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState(["", "", ""]);
  const [resetToken, setResetToken] = useState("");
  const [verifiedToken, setVerifiedToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return toast.error("Please enter your email.");
    setLoading(true);
    try {
      const data = await apiPost("/auth/forgot-password/init", {
        email: email.trim().toLowerCase(),
      });
      if (!data.questions || !data.resetToken) {
        return toast.error("No security questions found. Please contact an admin.");
      }
      setQuestions(data.questions);
      setResetToken(data.resetToken);
      setStep("questions");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAnswersSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (answers.some((a) => !a.trim())) return toast.error("Please answer all 3 questions.");
    setLoading(true);
    try {
      const data = await apiPost("/auth/forgot-password/verify", {
        resetToken,
        answers: questions.map((q, i) => ({ question: q, answer: answers[i] })),
      });
      setVerifiedToken(data.verifiedToken);
      setStep("password");
    } catch (err: any) {
      toast.error(err.message || "One or more answers are incorrect.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) {
      return toast.error("Password does not meet requirements.");
    }
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match.");
    setLoading(true);
    try {
      await apiPost("/auth/forgot-password/reset", {
        resetToken: verifiedToken,
        newPassword,
      });
      setStep("done");
      toast.success("Password reset successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forgot Password</CardTitle>
        <CardDescription>
          {step === "email" && "Enter your email to begin account recovery."}
          {step === "questions" && "Answer your security questions to verify your identity."}
          {step === "password" && "Choose a new strong password."}
          {step === "done" && "Your password has been reset successfully."}
        </CardDescription>
        <StepIndicator step={step} />
      </CardHeader>

      <CardContent>
        {/* STEP 1 — Email */}
        {step === "email" && (
          <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="fp-email">Email Address</Label>
              <Input
                id="fp-email"
                type="email"
                placeholder="ahmed@business.tn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
              {loading ? "Checking..." : "Continue →"}
            </Button>
            <div className="text-center text-sm">
              <Link to="/auth/login" className="text-indigo-600 hover:text-indigo-500">
                ← Back to Login
              </Link>
            </div>
          </form>
        )}

        {/* STEP 2 — Security Questions */}
        {step === "questions" && (
          <form onSubmit={handleAnswersSubmit} className="space-y-4" noValidate>
            {questions.map((q, i) => (
              <div key={i} className="space-y-2">
                <Label htmlFor={`answer-${i}`}>{q}</Label>
                <Input
                  id={`answer-${i}`}
                  type="text"
                  placeholder="Your answer"
                  value={answers[i]}
                  onChange={(e) => {
                    const updated = [...answers];
                    updated[i] = e.target.value;
                    setAnswers(updated);
                  }}
                  required
                />
              </div>
            ))}
            <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
              {loading ? "Verifying..." : "Verify Answers →"}
            </Button>
          </form>
        )}

        {/* STEP 3 — New Password */}
        {step === "password" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <PasswordRules password={newPassword} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500">Passwords do not match.</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
              {loading ? "Resetting..." : "Reset Password →"}
            </Button>
          </form>
        )}

        {/* STEP 4 — Done */}
        {step === "done" && (
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-2xl mx-auto">
              ✓
            </div>
            <p className="text-sm text-muted-foreground">
              Your password has been updated. You can now log in with your new credentials.
            </p>
            <Button className="w-full" onClick={() => navigate("/auth/login")}>
              Go to Login →
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
