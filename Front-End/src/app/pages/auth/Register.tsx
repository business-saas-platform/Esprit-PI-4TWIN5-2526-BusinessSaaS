import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import {
  Building2,
  Loader2,
  Mail,
  User,
  BriefcaseBusiness,
  Sparkles,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";

import { RegistrationRequestsApi } from "@/shared/lib/services/registrationRequests";

type RegisterFormData = {
  ownerName: string;
  ownerEmail: string;
  companyName: string;
  companyCategory: string;
};

const COMPANY_CATEGORIES = [
  "Retail",
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Manufacturing",
  "Hospitality",
  "Consulting",
  "Construction",
  "Logistics",
  "Marketing",
  "Other",
];

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getErrorMessage(err: any): string {
  const message = err?.response?.data?.message || err?.message;

  if (Array.isArray(message)) return message.join(", ");
  if (typeof message === "string") return message;

  return "Could not send request";
}

export function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<RegisterFormData>({
    ownerName: "",
    ownerEmail: "",
    companyName: "",
    companyCategory: "",
  });

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [touched, setTouched] = useState({
    ownerName: false,
    ownerEmail: false,
    companyName: false,
    companyCategory: false,
  });

  const cleanData = useMemo(
    () => ({
      ownerName: formData.ownerName.trim(),
      ownerEmail: formData.ownerEmail.trim().toLowerCase(),
      companyName: formData.companyName.trim(),
      companyCategory: formData.companyCategory.trim(),
    }),
    [formData]
  );

  const errors = useMemo(() => {
    return {
      ownerName:
        touched.ownerName && !cleanData.ownerName
          ? "Please enter your full name."
          : "",
      ownerEmail:
        touched.ownerEmail && !cleanData.ownerEmail
          ? "Please enter your email address."
          : touched.ownerEmail && !isValidEmail(cleanData.ownerEmail)
          ? "Please enter a valid email address."
          : "",
      companyName:
        touched.companyName && !cleanData.companyName
          ? "Please enter your company name."
          : "",
      companyCategory:
        touched.companyCategory && !cleanData.companyCategory
          ? "Please select a company category."
          : "",
    };
  }, [cleanData, touched]);

  const handleChange = (field: keyof RegisterFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (formError) setFormError("");
  };

  const validateForm = () => {
    if (
      !cleanData.ownerName ||
      !cleanData.ownerEmail ||
      !cleanData.companyName ||
      !cleanData.companyCategory
    ) {
      return "Please fill all required fields.";
    }

    if (!isValidEmail(cleanData.ownerEmail)) {
      return "Please enter a valid email address.";
    }

    if (cleanData.ownerName.length < 3) {
      return "Full name must contain at least 3 characters.";
    }

    if (cleanData.companyName.length < 2) {
      return "Company name must contain at least 2 characters.";
    }

    return "";
  };

  const markAllTouched = () => {
    setTouched({
      ownerName: true,
      ownerEmail: true,
      companyName: true,
      companyCategory: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    markAllTouched();
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

      await RegistrationRequestsApi.create({
        ownerName: cleanData.ownerName,
        ownerEmail: cleanData.ownerEmail,
        companyName: cleanData.companyName,
        companyCategory: cleanData.companyCategory,
      });

      toast.success("Request sent successfully", {
        description:
          "Your request has been submitted for review. You will receive an email once the admin approves it.",
      });

      navigate("/auth/login", { replace: true });
    } catch (err: any) {
      const msg = getErrorMessage(err);

      toast.error("Request failed", {
        description: msg,
      });

      setFormError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full rounded-3xl border border-slate-200/80 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm">
      <CardHeader className="space-y-4 pb-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
          <Building2 className="h-7 w-7 text-primary" />
        </div>

        <div className="text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            <Sparkles className="h-3.5 w-3.5" />
            Business onboarding request
          </div>

          <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">
            Request Business Account
          </CardTitle>

          <CardDescription className="mt-2 text-sm leading-6 text-slate-500">
            Submit your business request to join the platform. Your application
            will be reviewed by the platform administrator before activation.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Approval required
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Once your request is reviewed, you will receive an email with the
                next steps to access your business workspace.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Owner information
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Information about the main business owner account.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerName" className="text-sm font-medium text-slate-700">
                Full name
              </Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="ownerName"
                  value={formData.ownerName}
                  onChange={(e) => handleChange("ownerName", e.target.value)}
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, ownerName: true }))
                  }
                  placeholder="Enter the owner full name"
                  disabled={loading}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/60 pl-10 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white"
                  required
                />
              </div>
              {errors.ownerName && (
                <p className="text-xs font-medium text-red-500">
                  {errors.ownerName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerEmail" className="text-sm font-medium text-slate-700">
                Email address
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="ownerEmail"
                  type="email"
                  value={formData.ownerEmail}
                  onChange={(e) => handleChange("ownerEmail", e.target.value)}
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, ownerEmail: true }))
                  }
                  placeholder="you@company.com"
                  disabled={loading}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/60 pl-10 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white"
                  required
                />
              </div>
              {errors.ownerEmail && (
                <p className="text-xs font-medium text-red-500">
                  {errors.ownerEmail}
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-1" />

          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Company information
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Basic business information required for account review.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-sm font-medium text-slate-700">
                Company name
              </Label>
              <div className="relative">
                <BriefcaseBusiness className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => handleChange("companyName", e.target.value)}
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, companyName: true }))
                  }
                  placeholder="Enter your company name"
                  disabled={loading}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/60 pl-10 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white"
                  required
                />
              </div>
              {errors.companyName && (
                <p className="text-xs font-medium text-red-500">
                  {errors.companyName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="companyCategory"
                className="text-sm font-medium text-slate-700"
              >
                Company category
              </Label>

              <div className="relative">
                <select
                  id="companyCategory"
                  value={formData.companyCategory}
                  onChange={(e) =>
                    handleChange("companyCategory", e.target.value)
                  }
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, companyCategory: true }))
                  }
                  disabled={loading}
                  className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/60 px-4 pr-10 text-sm text-slate-900 outline-none transition focus:border-primary focus:bg-white"
                  required
                >
                  <option value="">Select a category</option>
                  {COMPANY_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              {errors.companyCategory && (
                <p className="text-xs font-medium text-red-500">
                  {errors.companyCategory}
                </p>
              )}
            </div>
          </div>

          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {formError}
            </div>
          )}

          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-slate-950 text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending request...
              </>
            ) : (
              "Send Request"
            )}
          </Button>

          <div className="text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              to="/auth/login"
              className="font-semibold text-primary transition hover:underline"
            >
              Sign in
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}