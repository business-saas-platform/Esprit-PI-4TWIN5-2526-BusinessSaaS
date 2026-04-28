import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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

import { BusinessesApi } from "@/shared/lib/services/businesses";
import { useBusinessContext } from "@/shared/contexts/BusinessContext";

type FormState = {
  name: string;
  type: string;
  industry: string;

  address: string;
  city: string;
  country: string;

  taxId: string;
  taxRate: string;

  currency: string;
  fiscalYearStart: string;

  phone: string;
  email: string;
  website: string;
  logoUrl: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[0-9+\s()-]{6,20}$/;
const urlRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i;

function num(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeWebsite(v: string) {
  const s = v.trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) return `https://${s}`;
  return s;
}

function validate(form: FormState): Errors {
  const e: Errors = {};

  if (!form.name.trim() || form.name.trim().length < 2) e.name = "Nom obligatoire (min 2).";
  if (!form.type.trim()) e.type = "Type obligatoire.";
  if (!form.industry.trim()) e.industry = "Industry obligatoire.";

  if (!form.address.trim() || form.address.trim().length < 4) e.address = "Adresse obligatoire (min 4).";
  if (!form.city.trim()) e.city = "Ville obligatoire.";
  if (!form.country.trim()) e.country = "Pays obligatoire.";

  if (!form.taxId.trim() || form.taxId.trim().length < 4) e.taxId = "Tax ID obligatoire (min 4).";

  const taxRate = num(form.taxRate, NaN);
  if (!Number.isFinite(taxRate)) e.taxRate = "Tax rate invalide.";
  else if (taxRate < 0 || taxRate > 100) e.taxRate = "Tax rate entre 0 et 100.";

  if (!form.currency.trim()) e.currency = "Currency obligatoire.";
  if (!form.fiscalYearStart) e.fiscalYearStart = "Date obligatoire.";

  if (!form.phone.trim()) e.phone = "Téléphone obligatoire.";
  else if (!phoneRegex.test(form.phone.trim())) e.phone = "Téléphone invalide.";

  const email = form.email.trim().toLowerCase();
  if (!email) e.email = "Email obligatoire.";
  else if (!emailRegex.test(email)) e.email = "Email invalide.";

  if (form.website.trim() && !urlRegex.test(form.website.trim())) e.website = "Website invalide.";
  if (form.logoUrl.trim() && !urlRegex.test(form.logoUrl.trim())) e.logoUrl = "Logo URL invalide.";

  return e;
}

export default function CompanySetup() {
  const navigate = useNavigate();

  const { businesses, refreshBusinesses, currentBusinessId, setCurrentBusinessId } =
    useBusinessContext();

  const businessId = useMemo(() => {
    const stored = localStorage.getItem("current_business_id");
    return stored || currentBusinessId;
  }, [currentBusinessId]);

  const currentBusiness = useMemo(() => {
    if (!businessId) return null;
    return businesses.find((b: any) => String(b.id) === String(businessId)) || null;
  }, [businesses, businessId]);

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<FormState>({
    name: "",
    type: "SARL",
    industry: "",

    address: "",
    city: "",
    country: "Tunisia",

    taxId: "",
    taxRate: "19",

    currency: "TND",
    fiscalYearStart: "2024-01-01",

    phone: "",
    email: "",
    website: "",
    logoUrl: "",
  });

  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});

  const errors = useMemo(() => validate(form), [form]);
  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const onBlur = (k: keyof FormState) => setTouched((p) => ({ ...p, [k]: true }));
  const showError = (k: keyof FormState) => touched[k] && errors[k];

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    const b: any = currentBusiness;
    if (!b) return;

    setForm({
      name: b.name || "",
      type: b.type || "SARL",
      industry: b.industry || "",

      address: b.address || "",
      city: b.city || "",
      country: b.country || "Tunisia",

      taxId: b.taxId || "",
      taxRate: String(b.taxRate ?? 19),

      currency: b.currency || "TND",
      fiscalYearStart: b.fiscalYearStart || "2024-01-01",

      phone: b.phone || "",
      email: b.email || "",
      website: b.website || "",
      logoUrl: b.logoUrl || "",
    });

    setTouched({});
  }, [currentBusiness]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessId) {
      toast.error("No business found for setup.");
      return;
    }

    setTouched({
      name: true,
      type: true,
      industry: true,
      address: true,
      city: true,
      country: true,
      taxId: true,
      taxRate: true,
      currency: true,
      fiscalYearStart: true,
      phone: true,
      email: true,
      website: true,
      logoUrl: true,
    });

    if (!isValid) {
      toast.error("Formulaire invalide", { description: "Vérifie les champs en rouge." });
      return;
    }

    const taxRate = num(form.taxRate, NaN);

    const payload = {
      name: form.name.trim(),
      type: form.type.trim(),
      industry: form.industry.trim(),

      address: form.address.trim(),
      city: form.city.trim(),
      country: form.country.trim(),

      taxId: form.taxId.trim(),
      taxRate,

      currency: form.currency.trim(),
      fiscalYearStart: form.fiscalYearStart,

      phone: form.phone.trim(),
      email: form.email.trim().toLowerCase(),

      website: form.website.trim() ? normalizeWebsite(form.website) : undefined,
      logoUrl: form.logoUrl.trim() ? normalizeWebsite(form.logoUrl) : undefined,
    };

    try {
      setLoading(true);

      await BusinessesApi.completeProfile(String(businessId), payload as any);

      localStorage.setItem("current_business_id", String(businessId));
      setCurrentBusinessId(String(businessId));

      await refreshBusinesses();
      window.dispatchEvent(new Event("business-changed"));

      toast.success("Company profile saved!");
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast.error("Failed", { description: err?.message || "Error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Complete Company Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete the company details to unlock all features.
          </p>
        </div>

        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Back
        </Button>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Company Setup</CardTitle>
          <CardDescription>
            These fields will be stored in the database for the selected business.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={submit} className="space-y-6" noValidate>
            {/* Section: General */}
            <div className="rounded-lg border border-border p-4">
              <h3 className="font-semibold text-foreground mb-4">General</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Company Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    onBlur={() => onBlur("name")}
                    placeholder="Ex: BizManager SARL"
                  />
                  {showError("name") && <p className="text-xs text-red-600">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Input
                    value={form.type}
                    onChange={(e) => set("type", e.target.value)}
                    onBlur={() => onBlur("type")}
                    placeholder="SARL / SA / ..."
                  />
                  {showError("type") && <p className="text-xs text-red-600">{errors.type}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Industry *</Label>
                  <Input
                    value={form.industry}
                    onChange={(e) => set("industry", e.target.value)}
                    onBlur={() => onBlur("industry")}
                    placeholder="Ex: IT Services"
                  />
                  {showError("industry") && <p className="text-xs text-red-600">{errors.industry}</p>}
                </div>
              </div>
            </div>

            {/* Section: Address */}
            <div className="rounded-lg border border-border p-4">
              <h3 className="font-semibold text-foreground mb-4">Address</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Address *</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    onBlur={() => onBlur("address")}
                    placeholder="Rue Habib Bourguiba..."
                  />
                  {showError("address") && <p className="text-xs text-red-600">{errors.address}</p>}
                </div>

                <div className="space-y-2">
                  <Label>City *</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                    onBlur={() => onBlur("city")}
                    placeholder="Tunis"
                  />
                  {showError("city") && <p className="text-xs text-red-600">{errors.city}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Country *</Label>
                  <Input
                    value={form.country}
                    onChange={(e) => set("country", e.target.value)}
                    onBlur={() => onBlur("country")}
                    placeholder="Tunisia"
                  />
                  {showError("country") && <p className="text-xs text-red-600">{errors.country}</p>}
                </div>
              </div>
            </div>

            {/* Section: Fiscal */}
            <div className="rounded-lg border border-border p-4">
              <h3 className="font-semibold text-foreground mb-4">Fiscal</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tax ID *</Label>
                  <Input
                    value={form.taxId}
                    onChange={(e) => set("taxId", e.target.value)}
                    onBlur={() => onBlur("taxId")}
                    placeholder="Matricule fiscal"
                  />
                  {showError("taxId") && <p className="text-xs text-red-600">{errors.taxId}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Tax Rate (%) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.taxRate}
                    onChange={(e) => set("taxRate", e.target.value)}
                    onBlur={() => onBlur("taxRate")}
                    placeholder="19"
                  />
                  {showError("taxRate") ? (
                    <p className="text-xs text-red-600">{errors.taxRate}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Default VAT for invoices.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Currency *</Label>
                  <Input
                    value={form.currency}
                    onChange={(e) => set("currency", e.target.value)}
                    onBlur={() => onBlur("currency")}
                    placeholder="TND"
                  />
                  {showError("currency") && <p className="text-xs text-red-600">{errors.currency}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Fiscal Year Start *</Label>
                  <Input
                    type="date"
                    value={form.fiscalYearStart}
                    onChange={(e) => set("fiscalYearStart", e.target.value)}
                    onBlur={() => onBlur("fiscalYearStart")}
                  />
                  {showError("fiscalYearStart") && (
                    <p className="text-xs text-red-600">{errors.fiscalYearStart}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section: Contact */}
            <div className="rounded-lg border border-border p-4">
              <h3 className="font-semibold text-foreground mb-4">Contact</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    onBlur={() => onBlur("phone")}
                    placeholder="+216 22 222 222"
                  />
                  {showError("phone") && <p className="text-xs text-red-600">{errors.phone}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    onBlur={() => onBlur("email")}
                    placeholder="company@email.com"
                  />
                  {showError("email") && <p className="text-xs text-red-600">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input
                    value={form.website}
                    onChange={(e) => set("website", e.target.value)}
                    onBlur={() => onBlur("website")}
                    placeholder="site.com (optional)"
                  />
                  {showError("website") ? (
                    <p className="text-xs text-red-600">{errors.website}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">We’ll auto-add https:// if missing.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Logo URL</Label>
                  <Input
                    value={form.logoUrl}
                    onChange={(e) => set("logoUrl", e.target.value)}
                    onBlur={() => onBlur("logoUrl")}
                    placeholder="https://... (optional)"
                  />
                  {showError("logoUrl") && <p className="text-xs text-red-600">{errors.logoUrl}</p>}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button type="submit" className="w-full sm:w-auto" disabled={loading || !isValid}>
                {loading ? "Saving..." : "Save & Continue"}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  if (!currentBusiness) return;
                  const b: any = currentBusiness;
                  setForm({
                    name: b.name || "",
                    type: b.type || "SARL",
                    industry: b.industry || "",
                    address: b.address || "",
                    city: b.city || "",
                    country: b.country || "Tunisia",
                    taxId: b.taxId || "",
                    taxRate: String(b.taxRate ?? 19),
                    currency: b.currency || "TND",
                    fiscalYearStart: b.fiscalYearStart || "2024-01-01",
                    phone: b.phone || "",
                    email: b.email || "",
                    website: b.website || "",
                    logoUrl: b.logoUrl || "",
                  });
                  setTouched({});
                }}
                disabled={loading}
              >
                Reset
              </Button>

              {!isValid && (
                <div className="text-xs text-muted-foreground sm:ml-auto self-center">
                  ⚠️ Corrige les champs en rouge
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}