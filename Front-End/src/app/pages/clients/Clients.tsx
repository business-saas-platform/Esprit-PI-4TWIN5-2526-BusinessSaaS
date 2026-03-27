import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Badge } from "@/app/components/ui/badge";
import { Separator } from "@/app/components/ui/separator";

import {
  Plus,
  Search,
  Mail,
  Phone,
  Loader2,
  FileText,
  RefreshCw,
  Download,
  Building2,
  Wallet,
  CircleDollarSign,
  AlertCircle,
  ChevronRight,
  Users,
  Sparkles,
  UserRound,
  MapPin,
  ShieldCheck,
  Briefcase,
  Globe,
} from "lucide-react";

import { toast } from "sonner";

import type { Client } from "@/shared/lib/mockData";
import { useBusinessContext } from "@/shared/contexts/BusinessContext";
import { ClientsApi } from "@/shared/lib/services/clients";

type ClientStatusFilter = "all" | "with-balance" | "clear";
type SortOption = "recent" | "name" | "revenue" | "outstanding";
type ClientType = "company" | "individual";

type ClientForm = {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  contactPerson: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  taxId: string;
  notes: string;
  type: ClientType;
};

type ClientFormErrors = Partial<Record<keyof ClientForm, string>>;

const initialClientForm: ClientForm = {
  name: "",
  email: "",
  phone: "",
  companyName: "",
  contactPerson: "",
  address: "",
  city: "",
  postalCode: "",
  country: "Tunisia",
  taxId: "",
  notes: "",
  type: "company",
};

function getInitials(name?: string) {
  if (!name) return "CL";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function Clients() {
  const navigate = useNavigate();
  const { currentBusiness } = useBusinessContext();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [newClient, setNewClient] = useState<ClientForm>(initialClientForm);
  const [formErrors, setFormErrors] = useState<ClientFormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof ClientForm, boolean>>>({});

  const currency = currentBusiness?.currency ?? "TND";

  const formatMoney = (value?: number | string | null) => {
    const amount = Number(value ?? 0);
    return `${amount.toFixed(2)} ${currency}`;
  };

  const loadClients = async () => {
    const bid = currentBusiness?.id;
    if (!bid) {
      setClients([]);
      return;
    }

    try {
      setIsLoading(true);
      const list = await ClientsApi.list(bid);
      setClients(list ?? []);
    } catch {
      setClients([]);
      toast.error("Erreur", {
        description: "Impossible de charger les clients",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusiness?.id]);

  const filteredClients = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    const filtered = clients.filter((c) => {
      const matchesSearch =
        !q ||
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        (c.taxId ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.city ?? "").toLowerCase().includes(q);

      const outstanding = Number(c.outstandingBalance ?? 0);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "with-balance" && outstanding > 0) ||
        (statusFilter === "clear" && outstanding <= 0);

      return matchesSearch && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "name") {
        return (a.name ?? "").localeCompare(b.name ?? "");
      }

      if (sortBy === "revenue") {
        return Number(b.totalRevenue ?? 0) - Number(a.totalRevenue ?? 0);
      }

      if (sortBy === "outstanding") {
        return Number(b.outstandingBalance ?? 0) - Number(a.outstandingBalance ?? 0);
      }

      return 0;
    });
  }, [clients, searchTerm, statusFilter, sortBy]);

  const summary = useMemo(() => {
    const totalClients = clients.length;

    const totalRevenue = clients.reduce(
      (sum, c) => sum + Number(c.totalRevenue ?? 0),
      0
    );

    const outstanding = clients.reduce(
      (sum, c) => sum + Number(c.outstandingBalance ?? 0),
      0
    );

    const paid = Math.max(totalRevenue - outstanding, 0);

    const clientsWithOutstanding = clients.filter(
      (c) => Number(c.outstandingBalance ?? 0) > 0
    ).length;

    return {
      totalClients,
      totalRevenue,
      outstanding,
      paid,
      clientsWithOutstanding,
    };
  }, [clients]);

  const resetClientForm = () => {
    setNewClient(initialClientForm);
    setFormErrors({});
    setTouched({});
  };

  const validateClientForm = (form: ClientForm): ClientFormErrors => {
    const errors: ClientFormErrors = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[+0-9()\-\s]{8,20}$/;
    const postalRegex = /^[A-Za-z0-9\s-]{3,12}$/;
    const taxRegex = /^[A-Za-z0-9\-\/\s]{4,30}$/;

    if (!currentBusiness?.id) {
      errors.name = "Veuillez sélectionner une entreprise";
      return errors;
    }

    if (!form.name.trim()) {
      errors.name = "Le nom du client est obligatoire";
    } else if (form.name.trim().length < 2) {
      errors.name = "Le nom doit contenir au moins 2 caractères";
    } else if (form.name.trim().length > 100) {
      errors.name = "Le nom est trop long";
    }

    if (!form.email.trim()) {
      errors.email = "L'email est obligatoire";
    } else if (!emailRegex.test(form.email.trim())) {
      errors.email = "Veuillez saisir une adresse email valide";
    }

    if (form.phone.trim() && !phoneRegex.test(form.phone.trim())) {
      errors.phone = "Numéro de téléphone invalide";
    }

    if (!form.country.trim()) {
      errors.country = "Le pays est obligatoire";
    }

    if (form.postalCode.trim() && !postalRegex.test(form.postalCode.trim())) {
      errors.postalCode = "Code postal invalide";
    }

    if (form.taxId.trim() && !taxRegex.test(form.taxId.trim())) {
      errors.taxId = "Identifiant fiscal invalide";
    }

    if (form.contactPerson.trim().length > 80) {
      errors.contactPerson = "Le nom du contact est trop long";
    }

    if (form.companyName.trim().length > 120) {
      errors.companyName = "Le nom de société est trop long";
    }

    if (form.address.trim().length > 180) {
      errors.address = "L'adresse est trop longue";
    }

    if (form.city.trim().length > 80) {
      errors.city = "Le nom de la ville est trop long";
    }

    if (form.notes.trim().length > 500) {
      errors.notes = "Les notes ne doivent pas dépasser 500 caractères";
    }

    return errors;
  };

  const handleFieldChange = <K extends keyof ClientForm>(field: K, value: ClientForm[K]) => {
    setNewClient((prev) => {
      const next = { ...prev, [field]: value };
      setFormErrors(validateClientForm(next));
      return next;
    });
  };

  const handleBlur = (field: keyof ClientForm) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFormErrors(validateClientForm(newClient));
  };

  const handleAddClient = async () => {
    const errors = validateClientForm(newClient);
    setFormErrors(errors);
    setTouched({
      name: true,
      email: true,
      phone: true,
      companyName: true,
      contactPerson: true,
      address: true,
      city: true,
      postalCode: true,
      country: true,
      taxId: true,
      notes: true,
      type: true,
    });

    if (Object.keys(errors).length > 0) {
      toast.error("Veuillez corriger les champs invalides");
      return;
    }

    try {
      setIsCreating(true);

      const displayName =
        newClient.type === "company"
          ? newClient.name.trim()
          : newClient.name.trim();

      const created = await ClientsApi.create({
        businessId: currentBusiness!.id,
        name: displayName,
        email: newClient.email.trim().toLowerCase(),
        phone: newClient.phone.trim(),
        address: newClient.address.trim(),
        city: newClient.city.trim(),
        postalCode: newClient.postalCode.trim(),
        country: newClient.country.trim() || "Tunisia",
        taxId: newClient.taxId.trim() || undefined,
        type: newClient.type,
        status: "active",
        contactPerson: newClient.contactPerson.trim() || undefined,
        companyName: newClient.companyName.trim() || undefined,
        notes: newClient.notes.trim() || undefined,
      });

      setClients((prev) => [created, ...prev]);

      toast.success("Client ajouté", {
        description: `${created.name} a été créé avec succès.`,
      });

      setIsDialogOpen(false);
      resetClientForm();
    } catch (e: any) {
      toast.error("Erreur", {
        description: e?.message || "Création impossible",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSortBy("recent");
  };

  const exportCSV = () => {
    if (!filteredClients.length) {
      toast.error("Aucun client à exporter");
      return;
    }

    const headers = [
      "Name",
      "Email",
      "Phone",
      "City",
      "Country",
      "Tax ID",
      "Total Revenue",
      "Outstanding",
    ];

    const rows = filteredClients.map((client) => [
      `"${client.name ?? ""}"`,
      `"${client.email ?? ""}"`,
      `"${client.phone ?? ""}"`,
      `"${client.city ?? ""}"`,
      `"${client.country ?? ""}"`,
      `"${client.taxId ?? ""}"`,
      `"${Number(client.totalRevenue ?? 0).toFixed(2)}"`,
      `"${Number(client.outstandingBalance ?? 0).toFixed(2)}"`,
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "clients-export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Export CSV effectué");
  };

  const visibleError = (field: keyof ClientForm) => {
    return touched[field] ? formErrors[field] : undefined;
  };

  const isFormValid = useMemo(() => {
    return Object.keys(validateClientForm(newClient)).length === 0;
  }, [newClient, currentBusiness?.id]);

  if (!currentBusiness) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <Building2 className="h-6 w-6 text-slate-600" />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            No business selected
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Sélectionne ou crée une entreprise avant de gérer tes clients.
          </p>

          <Button
            className="mt-6 h-11 rounded-xl px-5"
            onClick={() => navigate("/dashboard/businesses/new")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Créer une entreprise
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top header */}
      <section className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Customer management
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                Clients
              </h1>
              <p className="mt-2 text-sm text-slate-500 md:text-base">
                Gère les relations clients, les revenus et les soldes impayés pour{" "}
                <span className="font-semibold text-slate-700">
                  {currentBusiness.name}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="h-11 rounded-xl border-slate-200 px-4"
              onClick={loadClients}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>

            <Button
              variant="outline"
              className="h-11 rounded-xl border-slate-200 px-4"
              onClick={exportCSV}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>

            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetClientForm();
              }}
            >
              <DialogTrigger asChild>
                <Button className="h-11 rounded-xl px-5 shadow-sm">
                  <Plus className="mr-2 h-4 w-4" />
                  New Client
                </Button>
              </DialogTrigger>

              <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[28px] border-slate-200 p-0 sm:max-w-4xl">
                <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-slate-900">
                      Create new client
                    </DialogTitle>
                    <DialogDescription className="text-slate-500">
                      Add a new customer with structured business information and professional validation.
                    </DialogDescription>
                  </DialogHeader>
                </div>

                <div className="space-y-6 px-6 py-6">
                  <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-slate-500" />
                        <h3 className="text-sm font-semibold text-slate-900">
                          Identity & contact
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Client type *</Label>
                          <Select
                            value={newClient.type}
                            onValueChange={(value) =>
                              handleFieldChange("type", value as ClientType)
                            }
                          >
                            <SelectTrigger className="h-11 rounded-xl">
                              <SelectValue placeholder="Choose type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="company">Company</SelectItem>
                              <SelectItem value="individual">Individual</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="name">Display name *</Label>
                          <Input
                            id="name"
                            className={`h-11 rounded-xl ${visibleError("name") ? "border-red-300 focus-visible:ring-red-200" : "border-slate-200"}`}
                            placeholder={
                              newClient.type === "company"
                                ? "Acme SARL"
                                : "Mohamed Ben Ali"
                            }
                            value={newClient.name}
                            onChange={(e) => handleFieldChange("name", e.target.value)}
                            onBlur={() => handleBlur("name")}
                          />
                          {visibleError("name") && (
                            <p className="text-xs text-red-600">{visibleError("name")}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            className={`h-11 rounded-xl ${visibleError("email") ? "border-red-300 focus-visible:ring-red-200" : "border-slate-200"}`}
                            placeholder="client@example.com"
                            value={newClient.email}
                            onChange={(e) => handleFieldChange("email", e.target.value)}
                            onBlur={() => handleBlur("email")}
                          />
                          {visibleError("email") && (
                            <p className="text-xs text-red-600">{visibleError("email")}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            className={`h-11 rounded-xl ${visibleError("phone") ? "border-red-300 focus-visible:ring-red-200" : "border-slate-200"}`}
                            placeholder="+216 12 345 678"
                            value={newClient.phone}
                            onChange={(e) => handleFieldChange("phone", e.target.value)}
                            onBlur={() => handleBlur("phone")}
                          />
                          {visibleError("phone") && (
                            <p className="text-xs text-red-600">{visibleError("phone")}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="companyName">Legal company name</Label>
                          <Input
                            id="companyName"
                            className={`h-11 rounded-xl ${visibleError("companyName") ? "border-red-300 focus-visible:ring-red-200" : "border-slate-200"}`}
                            placeholder="Acme Trading LLC"
                            value={newClient.companyName}
                            onChange={(e) => handleFieldChange("companyName", e.target.value)}
                            onBlur={() => handleBlur("companyName")}
                          />
                          {visibleError("companyName") && (
                            <p className="text-xs text-red-600">
                              {visibleError("companyName")}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="contactPerson">Primary contact</Label>
                          <Input
                            id="contactPerson"
                            className={`h-11 rounded-xl ${visibleError("contactPerson") ? "border-red-300 focus-visible:ring-red-200" : "border-slate-200"}`}
                            placeholder="Salah Trabelsi"
                            value={newClient.contactPerson}
                            onChange={(e) => handleFieldChange("contactPerson", e.target.value)}
                            onBlur={() => handleBlur("contactPerson")}
                          />
                          {visibleError("contactPerson") && (
                            <p className="text-xs text-red-600">
                              {visibleError("contactPerson")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-slate-500" />
                        <h3 className="text-sm font-semibold text-slate-900">
                          Form quality
                        </h3>
                      </div>

                      <div className="space-y-3 text-sm text-slate-600">
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="font-medium text-slate-900">Required fields</p>
                          <p className="mt-1 text-slate-500">
                            Display name, email and country must be valid before saving.
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="font-medium text-slate-900">Validation</p>
                          <p className="mt-1 text-slate-500">
                            Email, phone, postal code and tax ID are checked for clean business data.
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="font-medium text-slate-900">Business ready</p>
                          <p className="mt-1 text-slate-500">
                            Ideal for invoicing, CRM follow-up and multi-tenant SaaS workflows.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-500" />
                      <h3 className="text-sm font-semibold text-slate-900">
                        Address & compliance
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          className={`h-11 rounded-xl ${visibleError("address") ? "border-red-300 focus-visible:ring-red-200" : "border-slate-200"}`}
                          placeholder="Street, avenue, building..."
                          value={newClient.address}
                          onChange={(e) => handleFieldChange("address", e.target.value)}
                          onBlur={() => handleBlur("address")}
                        />
                        {visibleError("address") && (
                          <p className="text-xs text-red-600">{visibleError("address")}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          className={`h-11 rounded-xl ${visibleError("city") ? "border-red-300 focus-visible:ring-red-200" : "border-slate-200"}`}
                          placeholder="Tunis"
                          value={newClient.city}
                          onChange={(e) => handleFieldChange("city", e.target.value)}
                          onBlur={() => handleBlur("city")}
                        />
                        {visibleError("city") && (
                          <p className="text-xs text-red-600">{visibleError("city")}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="postalCode">Postal code</Label>
                        <Input
                          id="postalCode"
                          className={`h-11 rounded-xl ${visibleError("postalCode") ? "border-red-300 focus-visible:ring-red-200" : "border-slate-200"}`}
                          placeholder="1000"
                          value={newClient.postalCode}
                          onChange={(e) => handleFieldChange("postalCode", e.target.value)}
                          onBlur={() => handleBlur("postalCode")}
                        />
                        {visibleError("postalCode") && (
                          <p className="text-xs text-red-600">{visibleError("postalCode")}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="country">Country *</Label>
                        <Input
                          id="country"
                          className={`h-11 rounded-xl ${visibleError("country") ? "border-red-300 focus-visible:ring-red-200" : "border-slate-200"}`}
                          placeholder="Tunisia"
                          value={newClient.country}
                          onChange={(e) => handleFieldChange("country", e.target.value)}
                          onBlur={() => handleBlur("country")}
                        />
                        {visibleError("country") && (
                          <p className="text-xs text-red-600">{visibleError("country")}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="taxId">Tax ID / VAT / MF</Label>
                        <Input
                          id="taxId"
                          className={`h-11 rounded-xl ${visibleError("taxId") ? "border-red-300 focus-visible:ring-red-200" : "border-slate-200"}`}
                          placeholder="TN123456 / MF..."
                          value={newClient.taxId}
                          onChange={(e) => handleFieldChange("taxId", e.target.value)}
                          onBlur={() => handleBlur("taxId")}
                        />
                        {visibleError("taxId") && (
                          <p className="text-xs text-red-600">{visibleError("taxId")}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-slate-500" />
                      <h3 className="text-sm font-semibold text-slate-900">
                        Internal notes
                      </h3>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        className={`min-h-[110px] rounded-2xl ${visibleError("notes") ? "border-red-300 focus-visible:ring-red-200" : "border-slate-200"}`}
                        placeholder="Payment preferences, contact details, internal reminders..."
                        value={newClient.notes}
                        onChange={(e) => handleFieldChange("notes", e.target.value)}
                        onBlur={() => handleBlur("notes")}
                      />
                      <div className="flex items-center justify-between">
                        {visibleError("notes") ? (
                          <p className="text-xs text-red-600">{visibleError("notes")}</p>
                        ) : (
                          <p className="text-xs text-slate-500">
                            Optional internal information for your team.
                          </p>
                        )}
                        <p className="text-xs text-slate-400">
                          {newClient.notes.length}/500
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-slate-500">
                    {isFormValid ? (
                      <span className="text-emerald-600">Form ready to submit</span>
                    ) : (
                      <span>Complete the required fields to continue</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="rounded-xl"
                      onClick={handleAddClient}
                      disabled={isCreating || !isFormValid}
                    >
                      {isCreating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" />
                      )}
                      Create Client
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      {/* Stats cards */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[24px] border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-500">Total clients</p>
                <p className="text-3xl font-semibold tracking-tight text-slate-950">
                  {summary.totalClients}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-3">
                <Users className="h-5 w-5 text-slate-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-500">Total revenue</p>
                <p className="text-3xl font-semibold tracking-tight text-slate-950">
                  {formatMoney(summary.totalRevenue)}
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3">
                <CircleDollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-500">Collected</p>
                <p className="text-3xl font-semibold tracking-tight text-emerald-600">
                  {formatMoney(summary.paid)}
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3">
                <Wallet className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-500">Outstanding</p>
                <p className="text-3xl font-semibold tracking-tight text-amber-600">
                  {formatMoney(summary.outstanding)}
                </p>
                <p className="text-xs text-slate-500">
                  {summary.clientsWithOutstanding} client(s) concerné(s)
                </p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Filters */}
      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search clients by name, email, phone, city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 rounded-xl border-slate-200 pl-11"
            />
          </div>

          <div className="w-full xl:w-[220px]">
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as ClientStatusFilter)}
            >
              <SelectTrigger className="h-12 rounded-xl border-slate-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clients</SelectItem>
                <SelectItem value="with-balance">With outstanding</SelectItem>
                <SelectItem value="clear">No outstanding</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full xl:w-[220px]">
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as SortOption)}
            >
              <SelectTrigger className="h-12 rounded-xl border-slate-200">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most recent</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="outstanding">Outstanding</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            className="h-12 rounded-xl border-slate-200"
            onClick={clearFilters}
          >
            Clear
          </Button>
        </div>
      </section>

      {/* Data table */}
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Client directory</h2>
            <p className="mt-1 text-sm text-slate-500">
              {isLoading
                ? "Loading clients..."
                : `${filteredClients.length} client(s) affiché(s)`}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100 bg-slate-50/70 hover:bg-slate-50/70">
                <TableHead className="h-14 min-w-[260px] text-slate-500">Client</TableHead>
                <TableHead className="min-w-[220px] text-slate-500">Contact</TableHead>
                <TableHead className="min-w-[150px] text-slate-500">Revenue</TableHead>
                <TableHead className="min-w-[150px] text-slate-500">Outstanding</TableHead>
                <TableHead className="min-w-[130px] text-slate-500">Status</TableHead>
                <TableHead className="min-w-[180px] text-right text-slate-500">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading clients...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                        <Users className="h-6 w-6 text-slate-500" />
                      </div>

                      <h3 className="text-lg font-semibold text-slate-900">
                        No clients found
                      </h3>

                      <p className="mt-2 max-w-md text-sm text-slate-500">
                        Ma fama hata client ymatchi el recherche wela les filtres. Zid client jdid
                        wela clear les filtres.
                      </p>

                      <div className="mt-5 flex gap-3">
                        <Button onClick={() => setIsDialogOpen(true)} className="rounded-xl">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Client
                        </Button>

                        <Button
                          variant="outline"
                          className="rounded-xl"
                          onClick={clearFilters}
                        >
                          Clear filters
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => {
                  const outstanding = Number(client.outstandingBalance ?? 0);
                  const totalRevenue = Number(client.totalRevenue ?? 0);
                  const clear = outstanding <= 0;

                  return (
                    <TableRow
                      key={client.id}
                      className="border-slate-100 transition-colors hover:bg-slate-50/60"
                    >
                      <TableCell className="py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700">
                            {getInitials(client.name)}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {client.name}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {client.taxId || "No Tax ID"}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            <span className="truncate">{client.email}</span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <span>{client.phone || "-"}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <span className="font-semibold text-slate-900">
                          {formatMoney(totalRevenue)}
                        </span>
                      </TableCell>

                      <TableCell className="py-4">
                        <span
                          className={
                            clear
                              ? "font-semibold text-emerald-600"
                              : "font-semibold text-amber-600"
                          }
                        >
                          {formatMoney(outstanding)}
                        </span>
                      </TableCell>

                      <TableCell className="py-4">
                        <Badge
                          variant="outline"
                          className={
                            clear
                              ? "rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700"
                              : "rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-amber-700"
                          }
                        >
                          {clear ? "Clear" : "Outstanding"}
                        </Badge>
                      </TableCell>

                      <TableCell className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-slate-200"
                            onClick={() =>
                              navigate(`/dashboard/invoices/create?clientId=${client.id}`)
                            }
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Invoice
                          </Button>

                          <Button
                            size="sm"
                            className="rounded-xl"
                            onClick={() => navigate(`/dashboard/clients/${client.id}`)}
                          >
                            View
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}