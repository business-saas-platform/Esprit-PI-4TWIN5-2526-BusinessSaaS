import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";

import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  FileText,
  DollarSign,
  UserRound,
  Loader2,
  CalendarDays,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Building2,
  Pencil,
  CreditCard,
  TrendingUp,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

import { toast } from "sonner";

import { useBusinessContext } from "@/shared/contexts/BusinessContext";
import { api } from "@/shared/lib/apiClient";

type Client = {
  id: string;
  businessId?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  taxId?: string;
  notes?: string;
  createdAt?: string;
  totalRevenue?: number;
  outstandingBalance?: number;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  clientId: string;
  issueDate: string;
  dueDate: string;
  status: string;
  subtotal: number;
  taxAmount: number | null;
  totalAmount: number | null;
  paidAmount: number;
  currency?: string;
  createdAt?: string;
};

type ClientForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  taxId: string;
  notes: string;
};

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const initialForm: ClientForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
  country: "Tunisia",
  taxId: "",
  notes: "",
};

function getInitials(name?: string) {
  if (!name?.trim()) return "CL";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentBusiness } = useBusinessContext();

  const businessId = currentBusiness?.id;
  const currency = currentBusiness?.currency ?? "TND";

  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<ClientForm>(initialForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ClientForm, string>>>({});

  const formatMoney = (value?: number | string | null) => {
    return `${n(value).toFixed(2)} ${currency}`;
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("fr-FR");
  };

  const formatMonthYear = (value?: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
  };

  const getDisplayInvoiceAmount = (inv: Invoice) => {
    return n(inv.totalAmount) || n(inv.subtotal) + n(inv.taxAmount);
  };

  const isPastDue = (dueDate?: string | null) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return false;
    return due.getTime() < new Date().getTime();
  };

  const getDisplayStatus = (inv: Invoice) => {
    if (inv.status === "sent" && isPastDue(inv.dueDate)) {
      return "overdue";
    }
    return inv.status || "draft";
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      paid: "border-green-200 bg-green-50 text-green-700",
      sent: "border-blue-200 bg-blue-50 text-blue-700",
      overdue: "border-red-200 bg-red-50 text-red-700",
      draft: "border-slate-200 bg-slate-50 text-slate-700",
      cancelled: "border-yellow-200 bg-yellow-50 text-yellow-700",
      viewed: "border-purple-200 bg-purple-50 text-purple-700",
    };
    return variants[status] || variants.draft;
  };

  const fillFormFromClient = (c: Client | null) => {
    if (!c) {
      setForm(initialForm);
      return;
    }

    setForm({
      name: c.name ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      address: c.address ?? "",
      city: c.city ?? "",
      postalCode: c.postalCode ?? "",
      country: c.country ?? "Tunisia",
      taxId: c.taxId ?? "",
      notes: c.notes ?? "",
    });
  };

  useEffect(() => {
    const clientId = id;
    if (!clientId) return;

    (async () => {
      try {
        setLoading(true);

        let c: Client | null = null;

        try {
          c = await api<Client>(`/clients/${clientId}`);
        } catch {
          c = null;
        }

        if (!c) {
          if (!businessId) {
            setClient(null);
            setInvoices([]);
            return;
          }

          const list = await api<Client[]>(`/clients?businessId=${businessId}`);
          c = (list ?? []).find((x) => x.id === clientId) ?? null;
        }

        setClient(c);
        fillFormFromClient(c);

        if (businessId) {
          const allInvoices = await api<Invoice[]>(`/invoices?businessId=${businessId}`);
          const invs = (allInvoices ?? [])
            .filter((inv) => inv.clientId === clientId)
            .sort((a, b) => {
              const da = new Date(a.issueDate).getTime();
              const db = new Date(b.issueDate).getTime();
              return db - da;
            });

          setInvoices(invs);
        } else {
          setInvoices([]);
        }
      } catch (e: any) {
        toast.error("Erreur", {
          description: e?.message || "Impossible de charger les données",
        });
        setClient(null);
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, businessId]);

  const totals = useMemo(() => {
    const totalInvoiced = invoices.reduce((sum, inv) => {
      return sum + getDisplayInvoiceAmount(inv);
    }, 0);

    const totalPaid = invoices.reduce((sum, inv) => sum + n(inv.paidAmount), 0);
    const outstanding = Math.max(0, totalInvoiced - totalPaid);

    const paidInvoices = invoices.filter((inv) => getDisplayStatus(inv) === "paid").length;
    const overdueInvoices = invoices.filter((inv) => getDisplayStatus(inv) === "overdue").length;
    const draftInvoices = invoices.filter((inv) => getDisplayStatus(inv) === "draft").length;

    return {
      totalInvoiced,
      totalPaid,
      outstanding,
      paidInvoices,
      overdueInvoices,
      draftInvoices,
    };
  }, [invoices]);

  const recentActivity = useMemo(() => {
    return invoices.slice(0, 6);
  }, [invoices]);

  const clientStatus = useMemo(() => {
    if (invoices.length === 0) return "new";
    if (totals.outstanding <= 0) return "clear";
    if (totals.overdueInvoices > 0) return "attention";
    return "active";
  }, [invoices.length, totals.outstanding, totals.overdueInvoices]);

  const clientStatusBadge = useMemo(() => {
    switch (clientStatus) {
      case "clear":
        return {
          label: "Healthy",
          className: "border-green-200 bg-green-50 text-green-700",
          icon: <CheckCircle2 className="h-4 w-4" />,
        };
      case "attention":
        return {
          label: "Needs Attention",
          className: "border-orange-200 bg-orange-50 text-orange-700",
          icon: <AlertCircle className="h-4 w-4" />,
        };
      case "active":
        return {
          label: "Active",
          className: "border-blue-200 bg-blue-50 text-blue-700",
          icon: <Receipt className="h-4 w-4" />,
        };
      default:
        return {
          label: "New Client",
          className: "border-slate-200 bg-slate-50 text-slate-700",
          icon: <UserRound className="h-4 w-4" />,
        };
    }
  }, [clientStatus]);

  const validateForm = () => {
    const errors: Partial<Record<keyof ClientForm, string>> = {};

    if (!form.name.trim()) {
      errors.name = "Client name is required";
    } else if (form.name.trim().length < 2) {
      errors.name = "Client name is too short";
    }

    if (!form.email.trim()) {
      errors.email = "Email is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) {
        errors.email = "Invalid email address";
      }
    }

    if (form.phone.trim() && form.phone.trim().length < 8) {
      errors.phone = "Phone number seems too short";
    }

    if (form.country.trim().length === 0) {
      errors.country = "Country is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveClient = async () => {
    if (!client?.id) return;
    if (!validateForm()) {
      toast.error("Veuillez corriger les champs invalides");
      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        postalCode: form.postalCode.trim(),
        country: form.country.trim(),
        taxId: form.taxId.trim(),
        notes: form.notes.trim(),
      };

      /**
       * Si ton backend utilise PATCH au lieu de PUT,
       * remplace juste la ligne ci-dessous selon ton apiClient.
       */
      const updated = await api<Client>(`/clients/${client.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      } as RequestInit);

      setClient(updated ?? { ...client, ...payload });
      fillFormFromClient(updated ?? { ...client, ...payload });

      toast.success("Client mis à jour ✅");
      setIsEditOpen(false);
    } catch (e: any) {
      toast.error("Erreur", {
        description: e?.message || "Impossible de sauvegarder le client",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/clients")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Loading client...
            </h1>
            <p className="mt-1 text-sm text-slate-500">Please wait</p>
          </div>
        </div>

        <Card className="rounded-[24px] border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-3 p-8 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading client details and invoice history...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="mx-auto max-w-4xl py-12">
        <Card className="rounded-[28px] border-slate-200 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <UserRound className="mb-4 h-12 w-12 text-slate-300" />
            <h2 className="text-xl font-semibold text-slate-900">Client not found</h2>
            <p className="mt-2 text-sm text-slate-500">
              The client does not exist or is not accessible in this business.
            </p>
            <Button className="mt-6 rounded-xl" onClick={() => navigate("/dashboard/clients")}>
              Back to Clients
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Hero Header */}
      <section className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-4">
            <Button
              variant="outline"
              size="icon"
              className="mt-1 rounded-xl border-slate-200"
              onClick={() => navigate("/dashboard/clients")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-lg font-semibold text-slate-700">
                {getInitials(client.name)}
              </div>

              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  Client profile
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                    {client.name}
                  </h1>
                  <Badge variant="outline" className={`rounded-full px-3 py-1 ${clientStatusBadge.className}`}>
                    <span className="mr-1 inline-flex">{clientStatusBadge.icon}</span>
                    {clientStatusBadge.label}
                  </Badge>
                </div>

                <p className="text-sm text-slate-500 md:text-base">
                  Professional client profile, payment health and billing history
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Dialog
              open={isEditOpen}
              onOpenChange={(open) => {
                setIsEditOpen(open);
                if (open) {
                  fillFormFromClient(client);
                  setFormErrors({});
                }
              }}
            >
              <DialogTrigger asChild>
                <Button variant="outline" className="h-11 rounded-xl border-slate-200 px-4">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Client
                </Button>
              </DialogTrigger>

              <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[28px] border-slate-200 p-0 sm:max-w-3xl">
                <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-slate-900">
                      Edit client profile
                    </DialogTitle>
                    <DialogDescription className="text-slate-500">
                      Update contact info and billing identity with proper input control.
                    </DialogDescription>
                  </DialogHeader>
                </div>

                <div className="space-y-6 px-6 py-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="name">Client Name *</Label>
                      <Input
                        id="name"
                        className={`h-11 rounded-xl ${formErrors.name ? "border-red-300 focus-visible:ring-red-200" : ""}`}
                        placeholder="Company or client name"
                        value={form.name}
                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                      {formErrors.name && (
                        <p className="text-xs text-red-600">{formErrors.name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        className={`h-11 rounded-xl ${formErrors.email ? "border-red-300 focus-visible:ring-red-200" : ""}`}
                        placeholder="client@example.com"
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      />
                      {formErrors.email && (
                        <p className="text-xs text-red-600">{formErrors.email}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        className={`h-11 rounded-xl ${formErrors.phone ? "border-red-300 focus-visible:ring-red-200" : ""}`}
                        placeholder="+216 ..."
                        value={form.phone}
                        onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                      />
                      {formErrors.phone && (
                        <p className="text-xs text-red-600">{formErrors.phone}</p>
                      )}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        className="h-11 rounded-xl"
                        placeholder="Street, avenue, building..."
                        value={form.address}
                        onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        className="h-11 rounded-xl"
                        placeholder="Tunis"
                        value={form.city}
                        onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input
                        id="postalCode"
                        className="h-11 rounded-xl"
                        placeholder="1000"
                        value={form.postalCode}
                        onChange={(e) => setForm((prev) => ({ ...prev, postalCode: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">Country *</Label>
                      <Input
                        id="country"
                        className={`h-11 rounded-xl ${formErrors.country ? "border-red-300 focus-visible:ring-red-200" : ""}`}
                        placeholder="Tunisia"
                        value={form.country}
                        onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                      />
                      {formErrors.country && (
                        <p className="text-xs text-red-600">{formErrors.country}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="taxId">Tax ID</Label>
                      <Input
                        id="taxId"
                        className="h-11 rounded-xl"
                        placeholder="MF / TVA / Tax number"
                        value={form.taxId}
                        onChange={(e) => setForm((prev) => ({ ...prev, taxId: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="notes">Internal Notes</Label>
                      <Textarea
                        id="notes"
                        className="min-h-[110px] rounded-2xl"
                        placeholder="Add internal notes about this client, billing behavior, payment preferences..."
                        value={form.notes}
                        onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-5">
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setIsEditOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="rounded-xl"
                    onClick={handleSaveClient}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              className="h-11 rounded-xl px-5"
              onClick={() => navigate(`/dashboard/invoices/create?clientId=${client.id}`)}
            >
              <FileText className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[24px] border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Invoiced</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  {formatMoney(totals.totalInvoiced)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-3">
                <TrendingUp className="h-5 w-5 text-slate-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Paid</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-green-600">
                  {formatMoney(totals.totalPaid)}
                </p>
              </div>
              <div className="rounded-2xl bg-green-50 p-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Outstanding</p>
                <p
                  className={`mt-2 text-3xl font-semibold tracking-tight ${
                    totals.outstanding > 0 ? "text-orange-600" : "text-green-600"
                  }`}
                >
                  {formatMoney(totals.outstanding)}
                </p>
              </div>
              <div className="rounded-2xl bg-orange-50 p-3">
                <CreditCard className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Invoices</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  {invoices.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {totals.paidInvoices} paid • {totals.overdueInvoices} overdue
                </p>
              </div>
              <div className="rounded-2xl bg-blue-50 p-3">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Main Info Grid */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="rounded-[24px] border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>Main identity and communication details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Email</p>
                <p className="font-medium text-slate-900">{client.email || "-"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Phone</p>
                <p className="font-medium text-slate-900">{client.phone || "-"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Address</p>
                <p className="font-medium text-slate-900">
                  {client.address || client.city || client.country
                    ? [client.address, client.city, client.postalCode, client.country]
                        .filter(Boolean)
                        .join(", ")
                    : "-"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Tax ID</p>
                <p className="font-medium text-slate-900">{client.taxId || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Client Summary</CardTitle>
            <CardDescription>Commercial and financial overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-sm text-slate-500">Client Since</p>
              <p className="mt-1 font-medium text-slate-900">
                {formatMonthYear(client.createdAt)}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Paid Invoices</p>
              <p className="mt-1 font-medium text-slate-900">{totals.paidInvoices}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Overdue Invoices</p>
              <p
                className={`mt-1 font-medium ${
                  totals.overdueInvoices > 0 ? "text-red-600" : "text-slate-900"
                }`}
              >
                {totals.overdueInvoices}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Draft Invoices</p>
              <p className="mt-1 font-medium text-slate-900">{totals.draftInvoices}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Current Status</p>
              <div className="mt-2">
                <Badge variant="outline" className={`rounded-full px-3 py-1 ${clientStatusBadge.className}`}>
                  <span className="mr-1 inline-flex">{clientStatusBadge.icon}</span>
                  {clientStatusBadge.label}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Fast navigation for daily workflow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full justify-start rounded-xl"
              onClick={() => navigate(`/dashboard/invoices/create?clientId=${client.id}`)}
            >
              <FileText className="mr-2 h-4 w-4" />
              Create New Invoice
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start rounded-xl border-slate-200"
              onClick={() => setIsEditOpen(true)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Client Profile
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start rounded-xl border-slate-200"
              onClick={() => navigate("/dashboard/invoices")}
            >
              <Receipt className="mr-2 h-4 w-4" />
              View All Invoices
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start rounded-xl border-slate-200"
              onClick={() => navigate("/dashboard/clients")}
            >
              <UserRound className="mr-2 h-4 w-4" />
              Back to Clients
            </Button>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              This page links all invoices by
              <span className="mx-1 font-medium text-slate-900">clientId</span>
              and gives a quick financial health view.
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Tabs */}
      <Tabs defaultValue="invoices" className="space-y-6">
        <TabsList className="rounded-xl border border-slate-200 bg-white p-1">
          <TabsTrigger value="invoices" className="rounded-lg">
            Invoices
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-lg">
            Recent Activity
          </TabsTrigger>
          <TabsTrigger value="overview" className="rounded-lg">
            Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-0">
          <Card className="rounded-[24px] border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Invoice History</CardTitle>
              <CardDescription>All invoices linked to this client</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-12 text-center text-slate-500">
                          No invoices yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.map((inv) => {
                        const amount = getDisplayInvoiceAmount(inv);
                        const status = getDisplayStatus(inv);

                        return (
                          <TableRow key={inv.id} className="hover:bg-slate-50/60">
                            <TableCell className="font-medium text-slate-900">
                              {inv.invoiceNumber}
                            </TableCell>
                            <TableCell>{formatDate(inv.issueDate)}</TableCell>
                            <TableCell>{formatDate(inv.dueDate)}</TableCell>
                            <TableCell>{formatMoney(amount)}</TableCell>
                            <TableCell className="font-medium text-green-600">
                              {formatMoney(inv.paidAmount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`rounded-full px-3 py-1 ${getStatusBadge(status)}`}>
                                {status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-lg"
                                onClick={() => navigate(`/dashboard/invoices/${inv.id}`)}
                              >
                                View
                                <ChevronRight className="ml-1 h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-0">
          <Card className="rounded-[24px] border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest invoice-related client activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length === 0 ? (
                  <p className="py-8 text-center text-slate-500">No activity yet</p>
                ) : (
                  recentActivity.map((inv) => {
                    const amount = getDisplayInvoiceAmount(inv);
                    const status = getDisplayStatus(inv);

                    return (
                      <div
                        key={inv.id}
                        className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4"
                      >
                        <div className="rounded-xl bg-indigo-50 p-3">
                          <DollarSign className="h-4 w-4 text-indigo-600" />
                        </div>

                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{inv.invoiceNumber}</p>
                          <p className="text-sm text-slate-500">
                            {(inv.createdAt ? new Date(inv.createdAt) : new Date(inv.issueDate)).toLocaleDateString("fr-FR")}
                            {" — "}
                            {status}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-medium text-slate-900">{formatMoney(amount)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="mt-0">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="rounded-[24px] border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Billing Overview</CardTitle>
                <CardDescription>Key financial numbers for this client</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <span className="text-sm text-slate-500">Total invoiced</span>
                  <span className="font-semibold text-slate-900">
                    {formatMoney(totals.totalInvoiced)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <span className="text-sm text-slate-500">Total paid</span>
                  <span className="font-semibold text-green-600">
                    {formatMoney(totals.totalPaid)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <span className="text-sm text-slate-500">Outstanding balance</span>
                  <span
                    className={`font-semibold ${
                      totals.outstanding > 0 ? "text-orange-600" : "text-green-600"
                    }`}
                  >
                    {formatMoney(totals.outstanding)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[24px] border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Client Metadata</CardTitle>
                <CardDescription>Administrative and profile information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Created At</p>
                    <p className="font-medium text-slate-900">{formatDate(client.createdAt)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Country</p>
                    <p className="font-medium text-slate-900">{client.country || "-"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Notes</p>
                    <p className="font-medium text-slate-900">{client.notes || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}