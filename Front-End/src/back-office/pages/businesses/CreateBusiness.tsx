import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

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
  phone: string;
  email: string;
  website: string;

  currency: string;
  fiscalYearStart: string;
  taxRate: number | string;
};

type Errors = Partial<Record<keyof FormState, string>>;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[0-9+\s()-]{6,20}$/; // بسيط ومناسب لتونس
const urlRegex =
  /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i;

function normalizeWebsite(v: string) {
  const s = v.trim();
  if (!s) return "";
  // إذا المستخدم كتب domain فقط نزيدو https://
  if (!/^https?:\/\//i.test(s)) return `https://${s}`;
  return s;
}

function validate(form: FormState): Errors {
  const e: Errors = {};

  const name = form.name.trim();
  if (!name || name.length < 2) e.name = "Nom obligatoire (min 2 caractères).";

  const type = form.type.trim();
  if (!type) e.type = "Type obligatoire (ex: SARL).";

  const industry = form.industry.trim();
  if (!industry) e.industry = "Industry obligatoire.";

  const address = form.address.trim();
  if (!address || address.length < 4) e.address = "Adresse obligatoire (min 4 caractères).";

  const city = form.city.trim();
  if (!city) e.city = "Ville obligatoire.";

  const country = form.country.trim();
  if (!country) e.country = "Pays obligatoire.";

  const taxId = form.taxId.trim();
  if (!taxId || taxId.length < 4) e.taxId = "Tax ID obligatoire (min 4 caractères).";

  const phone = form.phone.trim();
  if (!phone) e.phone = "Téléphone obligatoire.";
  else if (!phoneRegex.test(phone)) e.phone = "Téléphone invalide.";

  const email = form.email.trim().toLowerCase();
  if (!email) e.email = "Email obligatoire.";
  else if (!emailRegex.test(email)) e.email = "Email invalide.";

  const website = form.website.trim();
  if (website && !urlRegex.test(website)) e.website = "Website invalide (ex: https://site.com).";

  const currency = form.currency.trim();
  if (!currency) e.currency = "Devise obligatoire (ex: TND).";

  if (!form.fiscalYearStart) e.fiscalYearStart = "Date obligatoire.";

  const taxRateNum = Number(form.taxRate);
  if (!Number.isFinite(taxRateNum)) e.taxRate = "Tax rate invalide.";
  else if (taxRateNum < 0 || taxRateNum > 100) e.taxRate = "Tax rate doit être entre 0 et 100.";

  return e;
}

export default function CreateBusiness() {
  const navigate = useNavigate();
  const { refreshBusinesses } = useBusinessContext();

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<FormState>({
    name: "",
    type: "SARL",
    industry: "",

    address: "",
    city: "",
    country: "Tunisia",

    taxId: "",
    phone: "",
    email: "",
    website: "",

    currency: "TND",
    fiscalYearStart: "2024-01-01",
    taxRate: 19,
  });

  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});

  const errors = useMemo(() => validate(form), [form]);
  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const onChange = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
  };

  const onBlur = (k: keyof FormState) => setTouched((p) => ({ ...p, [k]: true }));

  const showError = (k: keyof FormState) => touched[k] && errors[k];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // mark all touched to show errors
    setTouched({
      name: true,
      type: true,
      industry: true,
      address: true,
      city: true,
      country: true,
      taxId: true,
      phone: true,
      email: true,
      website: true,
      currency: true,
      fiscalYearStart: true,
      taxRate: true,
    });

    if (!isValid) {
      toast.error("Formulaire invalide", { description: "Vérifie les champs en rouge." });
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...form,
        name: form.name.trim(),
        type: form.type.trim(),
        industry: form.industry.trim(),

        address: form.address.trim(),
        city: form.city.trim(),
        country: form.country.trim(),

        taxId: form.taxId.trim(),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        website: form.website.trim() ? normalizeWebsite(form.website) : undefined,

        currency: form.currency.trim(),
        fiscalYearStart: form.fiscalYearStart,
        taxRate: Number(form.taxRate),
      };

      const created: any = await BusinessesApi.create(payload as any);

      if (created?.id) {
        localStorage.setItem("current_business_id", String(created.id));
        window.dispatchEvent(new Event("business-changed"));
      }

      toast.success("Entreprise créée ✅");
      await refreshBusinesses();

      if (created?.isProfileComplete === false) {
        navigate("/dashboard/company/setup", { replace: true });
        return;
      }

      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast.error("Erreur", { description: err?.message || "Création impossible" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Créer une entreprise</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Remplis les informations de base. Tu pourras compléter le profil après.
          </p>
        </div>

        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Annuler
        </Button>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Section 1 */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Nom *</Label>
              <Input
                placeholder="Ex: BizManager SARL"
                value={form.name}
                onChange={(e) => onChange("name", e.target.value)}
                onBlur={() => onBlur("name")}
              />
              {showError("name") ? (
                <p className="text-xs text-red-600">{errors.name}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Nom légal affiché dans l’application.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Type *</Label>
              <Input
                placeholder="SARL / SA / ..."
                value={form.type}
                onChange={(e) => onChange("type", e.target.value)}
                onBlur={() => onBlur("type")}
              />
              {showError("type") && <p className="text-xs text-red-600">{errors.type}</p>}
            </div>

            <div className="space-y-2">
              <Label>Industry *</Label>
              <Input
                placeholder="Ex: IT Services"
                value={form.industry}
                onChange={(e) => onChange("industry", e.target.value)}
                onBlur={() => onBlur("industry")}
              />
              {showError("industry") && (
                <p className="text-xs text-red-600">{errors.industry}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 2 */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Adresse</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Adresse *</Label>
              <Input
                placeholder="Ex: Rue Habib Bourguiba"
                value={form.address}
                onChange={(e) => onChange("address", e.target.value)}
                onBlur={() => onBlur("address")}
              />
              {showError("address") && (
                <p className="text-xs text-red-600">{errors.address}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Ville *</Label>
              <Input
                placeholder="Tunis"
                value={form.city}
                onChange={(e) => onChange("city", e.target.value)}
                onBlur={() => onBlur("city")}
              />
              {showError("city") && <p className="text-xs text-red-600">{errors.city}</p>}
            </div>

            <div className="space-y-2">
              <Label>Pays *</Label>
              <Input
                placeholder="Tunisia"
                value={form.country}
                onChange={(e) => onChange("country", e.target.value)}
                onBlur={() => onBlur("country")}
              />
              {showError("country") && (
                <p className="text-xs text-red-600">{errors.country}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 3 */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Fiscal & Contact</CardTitle>
          </CardHeader>

          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tax ID *</Label>
              <Input
                placeholder="Matricule fiscal"
                value={form.taxId}
                onChange={(e) => onChange("taxId", e.target.value)}
                onBlur={() => onBlur("taxId")}
              />
              {showError("taxId") && <p className="text-xs text-red-600">{errors.taxId}</p>}
            </div>

            <div className="space-y-2">
              <Label>Tax rate (%) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="19"
                value={form.taxRate}
                onChange={(e) => onChange("taxRate", e.target.value)}
                onBlur={() => onBlur("taxRate")}
              />
              {showError("taxRate") ? (
                <p className="text-xs text-red-600">{errors.taxRate}</p>
              ) : (
                <p className="text-xs text-muted-foreground">TVA par défaut pour les factures.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input
                placeholder="+216 22 222 222"
                value={form.phone}
                onChange={(e) => onChange("phone", e.target.value)}
                onBlur={() => onBlur("phone")}
              />
              {showError("phone") && <p className="text-xs text-red-600">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="company@email.com"
                value={form.email}
                onChange={(e) => onChange("email", e.target.value)}
                onBlur={() => onBlur("email")}
              />
              {showError("email") && <p className="text-xs text-red-600">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                placeholder="site.com (optionnel)"
                value={form.website}
                onChange={(e) => onChange("website", e.target.value)}
                onBlur={() => onBlur("website")}
              />
              {showError("website") ? (
                <p className="text-xs text-red-600">{errors.website}</p>
              ) : (
                <p className="text-xs text-muted-foreground">On ajoutera https:// automatiquement si besoin.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Currency *</Label>
              <Input
                placeholder="TND"
                value={form.currency}
                onChange={(e) => onChange("currency", e.target.value)}
                onBlur={() => onBlur("currency")}
              />
              {showError("currency") && (
                <p className="text-xs text-red-600">{errors.currency}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Fiscal year start *</Label>
              <Input
                type="date"
                value={form.fiscalYearStart}
                onChange={(e) => onChange("fiscalYearStart", e.target.value)}
                onBlur={() => onBlur("fiscalYearStart")}
              />
              {showError("fiscalYearStart") && (
                <p className="text-xs text-red-600">{errors.fiscalYearStart}</p>
              )}
            </div>

            {/* Actions */}
            <div className="md:col-span-2 pt-2 flex flex-col sm:flex-row gap-3">
              <Button type="submit" className="w-full sm:w-auto" disabled={loading || !isValid}>
                {loading ? "Création..." : "Créer l’entreprise"}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setForm({
                    name: "",
                    type: "SARL",
                    industry: "",
                    address: "",
                    city: "",
                    country: "Tunisia",
                    taxId: "",
                    phone: "",
                    email: "",
                    website: "",
                    currency: "TND",
                    fiscalYearStart: "2024-01-01",
                    taxRate: 19,
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
          </CardContent>
        </Card>
      </form>
    </div>
  );
}