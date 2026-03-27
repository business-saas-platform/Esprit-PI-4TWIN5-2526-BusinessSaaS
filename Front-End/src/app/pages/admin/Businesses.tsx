import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import { Separator } from "@/app/components/ui/separator";
import {
  Search,
  Eye,
  Ban,
  CheckCircle,
  Loader2,
  Building2,
  Mail,
  CalendarDays,
  RefreshCw,
  BriefcaseBusiness,
  MapPin,
  Layers3,
  Trash2,
  User2,
  ShieldCheck,
  Globe2,
  Phone,
  Plus,
  Pencil,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

import type { Business } from "@/shared/lib/mockData";
import { BusinessesApi } from "@/shared/lib/services/businesses";
import { api } from "@/shared/lib/apiClient";

type BusinessRow = Business & {
  status?: string;
  plan?: string;
  createdAt?: string;
  ownerId?: string;
  ownerName?: string;
  type?: string;
  city?: string;
  country?: string;
  industry?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  currency?: string;
  taxId?: string;
  fiscalYearStart?: string;
  taxRate?: number;
  name?: string;
};

type BusinessFormState = {
  name: string;
  email: string;
  type: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  website: string;
  taxId: string;
  currency: string;
  fiscalYearStart: string;
  industry: string;
  taxRate: string;
  status: string;
  plan: string;
};

const defaultFormState: BusinessFormState = {
  name: "",
  email: "",
  type: "",
  address: "",
  city: "",
  country: "",
  phone: "",
  website: "",
  taxId: "",
  currency: "",
  fiscalYearStart: "",
  industry: "",
  taxRate: "",
  status: "active",
  plan: "starter",
};

export function Businesses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessRow | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [editingBusinessId, setEditingBusinessId] = useState<string | null>(null);
  const [form, setForm] = useState<BusinessFormState>(defaultFormState);

  useEffect(() => {
    loadBusinesses();
  }, []);

  const getStoredUser = () => {
    try {
      return JSON.parse(localStorage.getItem("auth_user") || "{}");
    } catch {
      return {};
    }
  };

  const isAdmin = getStoredUser()?.role === "platform_admin";

  const getBusinessId = () => {
    const user = getStoredUser();

    return (
      localStorage.getItem("current_business_id") ||
      localStorage.getItem("businessId") ||
      user?.businessId ||
      ""
    );
  };

  const normalizeBusiness = (business: any): BusinessRow => {
    const ownerName =
      business?.ownerName ||
      business?.owner?.name ||
      business?.owner?.fullName ||
      business?.owner?.email ||
      business?.ownerId ||
      "—";

    const status =
      business?.status ??
      business?.businessStatus ??
      business?.accountStatus ??
      "";

    const plan =
      business?.plan ??
      business?.subscriptionPlan ??
      business?.package ??
      "";

    return {
      ...business,
      status: status || "unassigned",
      plan: plan || "custom",
      ownerName,
      type: business?.type || business?.industry || "—",
      city: business?.city || "",
      country: business?.country || "",
      email: business?.email || "—",
      name: business?.name || "Untitled business",
      phone: business?.phone || "",
      website: business?.website || "",
      address: business?.address || "",
      currency: business?.currency || "",
      taxId: business?.taxId || "",
      fiscalYearStart: business?.fiscalYearStart || "",
      taxRate: business?.taxRate,
    };
  };

  const loadBusinesses = async () => {
    try {
      setLoading(true);

      const user = getStoredUser();
      let data: BusinessRow[] = [];

      if (user?.role === "platform_admin") {
        const businessId = getBusinessId();

        data = await api<BusinessRow[]>("/businesses/all", {
          method: "GET",
          headers: {
            ...(businessId ? { "x-business-id": businessId } : {}),
          },
        });
      } else {
        data = await BusinessesApi.listMine();
      }

      const normalized = Array.isArray(data) ? data.map(normalizeBusiness) : [];
      setBusinesses(normalized);
    } catch (error) {
      console.error("Error loading businesses:", error);
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  };

  const openDetails = (business: BusinessRow) => {
    setSelectedBusiness(normalizeBusiness(business));
    setDetailsOpen(true);
  };

  const resetForm = () => {
    setForm(defaultFormState);
    setEditingBusinessId(null);
  };

  const fillFormFromBusiness = (business: BusinessRow) => {
    setForm({
      name: business.name || "",
      email: business.email || "",
      type: business.type || "",
      address: business.address || "",
      city: business.city || "",
      country: business.country || "",
      phone: business.phone || "",
      website: business.website || "",
      taxId: business.taxId || "",
      currency: business.currency || "",
      fiscalYearStart: business.fiscalYearStart || "",
      industry: business.industry || business.type || "",
      taxRate:
        business.taxRate !== undefined && business.taxRate !== null
          ? String(business.taxRate)
          : "",
      status: business.status || "active",
      plan: business.plan || "starter",
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEditDialog = (business: BusinessRow) => {
    setEditingBusinessId(business.id);
    fillFormFromBusiness(business);
    setEditOpen(true);
  };

  const handleFormChange = (field: keyof BusinessFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const buildPayloadFromForm = () => {
    return {
      name: form.name.trim(),
      email: form.email.trim(),
      type: form.type.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      country: form.country.trim(),
      phone: form.phone.trim(),
      website: form.website.trim(),
      taxId: form.taxId.trim(),
      currency: form.currency.trim(),
      fiscalYearStart: form.fiscalYearStart.trim(),
      industry: form.industry.trim(),
      taxRate: form.taxRate.trim() === "" ? undefined : Number(form.taxRate),
      status: form.status.trim(),
      plan: form.plan.trim(),
    };
  };

  const handleCreateBusiness = async () => {
    try {
      setSavingForm(true);
      const payload = buildPayloadFromForm();

      const created = isAdmin
        ? await BusinessesApi.createAsAdmin(payload)
        : await BusinessesApi.create(payload);

      const normalized = normalizeBusiness(created);
      setBusinesses((prev) => [normalized, ...prev]);
      setCreateOpen(false);
      resetForm();
    } catch (error) {
      console.error("Failed to create business:", error);
    } finally {
      setSavingForm(false);
    }
  };

  const handleEditBusiness = async () => {
    if (!editingBusinessId) return;

    try {
      setSavingForm(true);
      const payload = buildPayloadFromForm();

      const updated = isAdmin
        ? await BusinessesApi.updateAsAdmin(editingBusinessId, payload)
        : await BusinessesApi.update(editingBusinessId, payload);

      setBusinesses((prev) =>
        prev.map((business) =>
          business.id === editingBusinessId
            ? normalizeBusiness({ ...business, ...updated })
            : business
        )
      );

      if (selectedBusiness?.id === editingBusinessId) {
        setSelectedBusiness((prev) =>
          prev ? normalizeBusiness({ ...prev, ...updated }) : prev
        );
      }

      setEditOpen(false);
      resetForm();
    } catch (error) {
      console.error("Failed to update business:", error);
    } finally {
      setSavingForm(false);
    }
  };

  const handleStatusChange = async (
    id: string,
    newStatus: "active" | "suspended"
  ) => {
    try {
      setUpdatingId(id);

      const updatedBusiness = isAdmin
        ? await BusinessesApi.updateAsAdmin(id, { status: newStatus })
        : await BusinessesApi.update(id, { status: newStatus });

      setBusinesses((prev) =>
        prev.map((business) =>
          business.id === id
            ? normalizeBusiness({ ...business, ...updatedBusiness })
            : business
        )
      );

      if (selectedBusiness?.id === id) {
        setSelectedBusiness((prev) =>
          prev ? normalizeBusiness({ ...prev, ...updatedBusiness }) : prev
        );
      }
    } catch (error) {
      console.error("Failed to update business status:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteBusiness = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this business?"
    );
    if (!confirmed) return;

    try {
      setDeletingId(id);

      if (isAdmin) {
        await BusinessesApi.removeAsAdmin(id);
      } else {
        await BusinessesApi.remove(id);
      }

      setBusinesses((prev) => prev.filter((business) => business.id !== id));

      if (selectedBusiness?.id === id) {
        setDetailsOpen(false);
        setSelectedBusiness(null);
      }
    } catch (error) {
      console.error("Failed to delete business:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAllBusinesses = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete ALL businesses?"
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      await BusinessesApi.removeAllAsAdmin();
      setBusinesses([]);
      setSelectedBusiness(null);
      setDetailsOpen(false);
    } catch (error) {
      console.error("Failed to delete all businesses:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBusinesses = useMemo(() => {
    return businesses.filter((business) => {
      const q = searchQuery.toLowerCase();

      const matchesSearch =
        (business.name || "").toLowerCase().includes(q) ||
        (business.email || "").toLowerCase().includes(q) ||
        (business.ownerName || "").toLowerCase().includes(q) ||
        (business.type || "").toLowerCase().includes(q) ||
        (business.city || "").toLowerCase().includes(q) ||
        (business.country || "").toLowerCase().includes(q) ||
        (business.website || "").toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" || (business.status || "unassigned") === statusFilter;

      const matchesPlan =
        planFilter === "all" || (business.plan || "custom") === planFilter;

      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [businesses, searchQuery, statusFilter, planFilter]);

  const getStatusBadge = (status?: string) => {
    switch ((status || "").toLowerCase()) {
      case "active":
        return (
          <Badge className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50">
            Active
          </Badge>
        );
      case "trial":
        return (
          <Badge className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700 hover:bg-amber-50">
            Trial
          </Badge>
        );
      case "suspended":
        return (
          <Badge className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700 hover:bg-rose-50">
            Suspended
          </Badge>
        );
      case "inactive":
        return (
          <Badge className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700 hover:bg-slate-50">
            Inactive
          </Badge>
        );
      case "unassigned":
        return (
          <Badge className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700 hover:bg-slate-50">
            No status
          </Badge>
        );
      default:
        return (
          <Badge className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700 hover:bg-slate-50">
            {status || "No status"}
          </Badge>
        );
    }
  };

  const getPlanBadge = (plan?: string) => {
    switch ((plan || "").toLowerCase()) {
      case "starter":
        return (
          <Badge className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 hover:bg-white">
            Starter
          </Badge>
        );
      case "professional":
        return (
          <Badge className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700 hover:bg-blue-50">
            Professional
          </Badge>
        );
      case "enterprise":
        return (
          <Badge className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-violet-700 hover:bg-violet-50">
            Enterprise
          </Badge>
        );
      case "custom":
        return (
          <Badge className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700 hover:bg-slate-50">
            Custom
          </Badge>
        );
      default:
        return (
          <Badge className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700 hover:bg-slate-50">
            {plan || "Custom"}
          </Badge>
        );
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getLocation = (business: BusinessRow) => {
    const city = business.city?.trim();
    const country = business.country?.trim();
    if (city && country) return `${city}, ${country}`;
    if (city) return city;
    if (country) return country;
    return "—";
  };

  const totalBusinesses = businesses.length;
  const activeCount = businesses.filter((b) => b.status === "active").length;
  const trialCount = businesses.filter((b) => b.status === "trial").length;
  const suspendedCount = businesses.filter((b) => b.status === "suspended").length;
  const noStatusCount = businesses.filter(
    (b) => !b.status || b.status === "unassigned"
  ).length;

  return (
    <>
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-6 shadow-sm lg:p-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-100/40 blur-3xl" />
          <div className="absolute left-0 bottom-0 h-40 w-40 rounded-full bg-violet-100/40 blur-3xl" />

          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Business administration workspace
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl">
                  Businesses
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Gérez les entreprises, surveillez leur statut, modifiez les plans
                  et ouvrez les détails dans une interface plus propre et plus pro.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isAdmin && (
                <>
                  <Button
                    onClick={openCreateDialog}
                    className="h-11 rounded-xl bg-slate-900 px-5 text-white hover:bg-slate-800"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Business
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={handleDeleteAllBusinesses}
                    disabled={loading || businesses.length === 0}
                    className="h-11 rounded-xl px-5"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete All
                  </Button>
                </>
              )}

              <Button
                variant="outline"
                onClick={loadBusinesses}
                disabled={loading}
                className="h-11 rounded-xl border-slate-300 bg-white px-5"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Total Businesses"
            value={totalBusinesses}
            icon={<Building2 className="h-5 w-5 text-slate-700" />}
            iconWrap="bg-slate-100"
          />
          <StatCard
            title="Active"
            value={activeCount}
            valueClass="text-emerald-700"
            icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
            iconWrap="bg-emerald-50"
          />
          <StatCard
            title="Trial"
            value={trialCount}
            valueClass="text-amber-700"
            icon={<Layers3 className="h-5 w-5 text-amber-600" />}
            iconWrap="bg-amber-50"
          />
          <StatCard
            title="Suspended"
            value={suspendedCount}
            valueClass="text-rose-700"
            icon={<Ban className="h-5 w-5 text-rose-600" />}
            iconWrap="bg-rose-50"
          />
          <StatCard
            title="Without Status"
            value={noStatusCount}
            valueClass="text-slate-700"
            icon={<BriefcaseBusiness className="h-5 w-5 text-slate-600" />}
            iconWrap="bg-slate-100"
          />
        </div>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardContent className="p-5 lg:p-6">
            <div className="grid gap-4 lg:grid-cols-[1.5fr_0.8fr_0.8fr]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by business, owner, email, city, country..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 rounded-2xl border-slate-200 pl-11"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-12 rounded-2xl border-slate-200">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="unassigned">Without Status</SelectItem>
                </SelectContent>
              </Select>

              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="h-12 rounded-2xl border-slate-200">
                  <SelectValue placeholder="Filter by plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="custom">Custom / Empty</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-white">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-xl font-semibold text-slate-900">
                  All Businesses ({filteredBusinesses.length})
                </CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Liste complète avec statut, plan, localisation et actions rapides.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                <ArrowUpRight className="h-3.5 w-3.5" />
                Premium admin view
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex min-h-[320px] items-center justify-center">
                <div className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-300 px-5 py-4 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading businesses...
                </div>
              </div>
            ) : filteredBusinesses.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-2xl bg-slate-100 p-4">
                  <Building2 className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-base font-semibold text-slate-800">No businesses found</p>
                <p className="mt-1 text-sm text-slate-500">
                  Change filters or search query to display results.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/70">
                    <TableRow className="border-slate-100">
                      <TableHead className="whitespace-nowrap px-6 py-4">Business</TableHead>
                      <TableHead className="whitespace-nowrap px-6 py-4">Owner</TableHead>
                      <TableHead className="whitespace-nowrap px-6 py-4">Type</TableHead>
                      <TableHead className="whitespace-nowrap px-6 py-4">Location</TableHead>
                      <TableHead className="whitespace-nowrap px-6 py-4">Status</TableHead>
                      <TableHead className="whitespace-nowrap px-6 py-4">Plan</TableHead>
                      <TableHead className="whitespace-nowrap px-6 py-4">Created</TableHead>
                      <TableHead className="whitespace-nowrap px-6 py-4 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredBusinesses.map((business) => (
                      <TableRow key={business.id} className="border-slate-100 hover:bg-slate-50/60">
                        <TableCell className="px-6 py-5 align-top">
                          <div className="min-w-[260px]">
                            <div className="flex items-start gap-3">
                              <div className="rounded-2xl bg-slate-100 p-3">
                                <Building2 className="h-4 w-4 text-slate-600" />
                              </div>

                              <div className="space-y-1.5">
                                <p className="font-semibold text-slate-900">
                                  {business.name || "Untitled business"}
                                </p>

                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                  <Mail className="h-3.5 w-3.5" />
                                  <span className="break-all">{business.email || "—"}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="px-6 py-5 align-top">
                          <div className="min-w-[180px] space-y-1">
                            <p className="text-sm font-medium text-slate-800">
                              {business.ownerName || "—"}
                            </p>
                            {business.ownerId && business.ownerName !== business.ownerId && (
                              <p className="break-all text-xs text-slate-500">{business.ownerId}</p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="px-6 py-5 align-top">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <BriefcaseBusiness className="h-4 w-4 text-slate-400" />
                            <span>{business.type || "—"}</span>
                          </div>
                        </TableCell>

                        <TableCell className="px-6 py-5 align-top">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            <span>{getLocation(business)}</span>
                          </div>
                        </TableCell>

                        <TableCell className="px-6 py-5 align-top">
                          {getStatusBadge(business.status)}
                        </TableCell>

                        <TableCell className="px-6 py-5 align-top">
                          {getPlanBadge(business.plan)}
                        </TableCell>

                        <TableCell className="px-6 py-5 align-top">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <CalendarDays className="h-4 w-4 text-slate-400" />
                            <span>{formatDate(business.createdAt)}</span>
                          </div>
                        </TableCell>

                        <TableCell className="px-6 py-5 text-right align-top">
                          <div className="flex min-w-[330px] flex-wrap items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl"
                              onClick={() => openDetails(business)}
                              disabled={
                                updatingId === business.id ||
                                deletingId === business.id ||
                                savingForm
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Button>

                            {isAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl"
                                onClick={() => openEditDialog(business)}
                                disabled={
                                  updatingId === business.id ||
                                  deletingId === business.id ||
                                  savingForm
                                }
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                            )}

                            {business.status !== "active" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl"
                                onClick={() => handleStatusChange(business.id, "active")}
                                disabled={
                                  updatingId === business.id ||
                                  deletingId === business.id ||
                                  savingForm
                                }
                              >
                                {updatingId === business.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                )}
                                Activate
                              </Button>
                            )}

                            {business.status !== "suspended" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl"
                                onClick={() => handleStatusChange(business.id, "suspended")}
                                disabled={
                                  updatingId === business.id ||
                                  deletingId === business.id ||
                                  savingForm
                                }
                              >
                                {updatingId === business.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Ban className="mr-2 h-4 w-4" />
                                )}
                                Suspend
                              </Button>
                            )}

                            <Button
                              variant="destructive"
                              size="sm"
                              className="rounded-xl"
                              onClick={() => handleDeleteBusiness(business.id)}
                              disabled={
                                updatingId === business.id ||
                                deletingId === business.id ||
                                savingForm
                              }
                            >
                              {deletingId === business.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                              )}
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="w-[96vw] max-w-6xl rounded-3xl border-none p-0 shadow-2xl">
          {selectedBusiness && (
            <div className="max-h-[90vh] overflow-y-auto">
              <div className="border-b bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="rounded-3xl bg-white/10 p-4 backdrop-blur">
                      <Building2 className="h-7 w-7" />
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-[0.24em] text-slate-300">
                        Business profile
                      </p>
                      <h3 className="text-2xl font-bold">{selectedBusiness.name || "Untitled business"}</h3>
                      <p className="mt-2 text-sm text-slate-300">
                        {selectedBusiness.email || "No email"}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {getStatusBadge(selectedBusiness.status)}
                        {getPlanBadge(selectedBusiness.plan)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                        onClick={() => openEditDialog(selectedBusiness)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    )}

                    {selectedBusiness.status !== "active" && (
                      <Button
                        size="sm"
                        className="bg-white text-slate-900 hover:bg-slate-100"
                        onClick={() => handleStatusChange(selectedBusiness.id, "active")}
                        disabled={updatingId === selectedBusiness.id}
                      >
                        {updatingId === selectedBusiness.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="mr-2 h-4 w-4" />
                        )}
                        Activate
                      </Button>
                    )}

                    {selectedBusiness.status !== "suspended" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                        onClick={() => handleStatusChange(selectedBusiness.id, "suspended")}
                        disabled={updatingId === selectedBusiness.id}
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        Suspend
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteBusiness(selectedBusiness.id)}
                      disabled={deletingId === selectedBusiness.id}
                    >
                      {deletingId === selectedBusiness.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Delete
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 p-6 lg:grid-cols-3 lg:p-8">
                <Card className="rounded-3xl border-slate-200 lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Business Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-5 md:grid-cols-2">
                    <InfoCard label="Business Name" value={selectedBusiness.name} />
                    <InfoCard
                      label="Type"
                      value={selectedBusiness.type || selectedBusiness.industry}
                      icon={<BriefcaseBusiness className="h-4 w-4 text-slate-400" />}
                    />
                    <InfoCard
                      label="Email"
                      value={selectedBusiness.email}
                      icon={<Mail className="h-4 w-4 text-slate-400" />}
                    />
                    <InfoCard
                      label="Phone"
                      value={selectedBusiness.phone}
                      icon={<Phone className="h-4 w-4 text-slate-400" />}
                    />
                    <InfoCard
                      label="Website"
                      value={selectedBusiness.website}
                      icon={<Globe2 className="h-4 w-4 text-slate-400" />}
                    />
                    <InfoCard
                      label="Created"
                      value={formatDate(selectedBusiness.createdAt)}
                      icon={<CalendarDays className="h-4 w-4 text-slate-400" />}
                    />
                    <InfoCard
                      label="Location"
                      value={getLocation(selectedBusiness)}
                      icon={<MapPin className="h-4 w-4 text-slate-400" />}
                    />
                    <InfoCard label="Address" value={selectedBusiness.address} />
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-base">Owner & Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <InfoRow
                      label="Owner"
                      value={selectedBusiness.ownerName}
                      icon={<User2 className="h-4 w-4 text-slate-400" />}
                    />
                    <InfoRow
                      label="Owner ID"
                      value={selectedBusiness.ownerId}
                      icon={<ShieldCheck className="h-4 w-4 text-slate-400" />}
                    />
                    <InfoRow label="Currency" value={selectedBusiness.currency} />
                    <InfoRow label="Tax ID" value={selectedBusiness.taxId} />
                    <InfoRow
                      label="Tax Rate"
                      value={
                        selectedBusiness.taxRate !== undefined &&
                        selectedBusiness.taxRate !== null
                          ? `${selectedBusiness.taxRate}%`
                          : "—"
                      }
                    />
                    <InfoRow
                      label="Fiscal Year Start"
                      value={selectedBusiness.fiscalYearStart}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="w-[96vw] max-w-7xl rounded-3xl border-none p-0 shadow-2xl">
          <div className="max-h-[90vh] overflow-y-auto">
            <div className="border-b bg-gradient-to-r from-slate-900 to-slate-800 p-7 text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Create Business</DialogTitle>
                <DialogDescription className="text-slate-300">
                  Crée une nouvelle entreprise depuis un formulaire large, propre et plus premium.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="p-6 lg:p-8">
              <BusinessForm
                form={form}
                onChange={handleFormChange}
                onSubmit={handleCreateBusiness}
                onCancel={() => {
                  setCreateOpen(false);
                  resetForm();
                }}
                saving={savingForm}
                submitLabel="Create Business"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="w-[96vw] max-w-7xl rounded-3xl border-none p-0 shadow-2xl">
          <div className="max-h-[90vh] overflow-y-auto">
            <div className="border-b bg-gradient-to-r from-slate-900 to-slate-800 p-7 text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Edit Business</DialogTitle>
                <DialogDescription className="text-slate-300">
                  Modifie les informations de l’entreprise dans une grande interface claire.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="p-6 lg:p-8">
              <BusinessForm
                form={form}
                onChange={handleFormChange}
                onSubmit={handleEditBusiness}
                onCancel={() => {
                  setEditOpen(false);
                  resetForm();
                }}
                saving={savingForm}
                submitLabel="Save Changes"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BusinessForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  saving,
  submitLabel,
}: {
  form: BusinessFormState;
  onChange: (field: keyof BusinessFormState, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
}) {
  return (
    <div className="space-y-8">
      <FormSection
        title="General Information"
        description="Les informations principales de l’entreprise."
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <FormField label="Business Name">
            <Input
              className="h-12 rounded-2xl border-slate-200"
              value={form.name}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder="Business name"
            />
          </FormField>

          <FormField label="Email">
            <Input
              className="h-12 rounded-2xl border-slate-200"
              value={form.email}
              onChange={(e) => onChange("email", e.target.value)}
              placeholder="company@email.com"
            />
          </FormField>

          <FormField label="Phone">
            <Input
              className="h-12 rounded-2xl border-slate-200"
              value={form.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              placeholder="+216 ..."
            />
          </FormField>

          <FormField label="Type">
            <Input
              className="h-12 rounded-2xl border-slate-200"
              value={form.type}
              onChange={(e) => onChange("type", e.target.value)}
              placeholder="Retail / IT / Services"
            />
          </FormField>

          <FormField label="Industry">
            <Input
              className="h-12 rounded-2xl border-slate-200"
              value={form.industry}
              onChange={(e) => onChange("industry", e.target.value)}
              placeholder="Industry"
            />
          </FormField>

          <FormField label="Website">
            <Input
              className="h-12 rounded-2xl border-slate-200"
              value={form.website}
              onChange={(e) => onChange("website", e.target.value)}
              placeholder="https://..."
            />
          </FormField>
        </div>
      </FormSection>

      <Separator />

      <FormSection
        title="Location & Legal"
        description="Adresse, pays, fiscalité et devise."
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <FormField label="Address">
            <Input
              className="h-12 rounded-2xl border-slate-200"
              value={form.address}
              onChange={(e) => onChange("address", e.target.value)}
              placeholder="Address"
            />
          </FormField>

          <FormField label="City">
            <Input
              className="h-12 rounded-2xl border-slate-200"
              value={form.city}
              onChange={(e) => onChange("city", e.target.value)}
              placeholder="City"
            />
          </FormField>

          <FormField label="Country">
            <Input
              className="h-12 rounded-2xl border-slate-200"
              value={form.country}
              onChange={(e) => onChange("country", e.target.value)}
              placeholder="Country"
            />
          </FormField>

          <FormField label="Tax ID">
            <Input
              className="h-12 rounded-2xl border-slate-200"
              value={form.taxId}
              onChange={(e) => onChange("taxId", e.target.value)}
              placeholder="Tax ID"
            />
          </FormField>

          <FormField label="Currency">
            <Input
              className="h-12 rounded-2xl border-slate-200"
              value={form.currency}
              onChange={(e) => onChange("currency", e.target.value)}
              placeholder="TND / EUR / USD"
            />
          </FormField>

          <FormField label="Fiscal Year Start">
            <Input
              className="h-12 rounded-2xl border-slate-200"
              value={form.fiscalYearStart}
              onChange={(e) => onChange("fiscalYearStart", e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </FormField>

          <FormField label="Tax Rate (%)">
            <Input
              className="h-12 rounded-2xl border-slate-200"
              value={form.taxRate}
              onChange={(e) => onChange("taxRate", e.target.value)}
              placeholder="19"
              type="number"
            />
          </FormField>
        </div>
      </FormSection>

      <Separator />

      <FormSection
        title="Subscription & Status"
        description="Plan actuel et état de l’entreprise."
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <FormField label="Status">
            <Select value={form.status} onValueChange={(value) => onChange("status", value)}>
              <SelectTrigger className="h-12 rounded-2xl border-slate-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Plan">
            <Select value={form.plan} onValueChange={(value) => onChange("plan", value)}>
              <SelectTrigger className="h-12 rounded-2xl border-slate-200">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </FormSection>

      <div className="sticky bottom-0 z-10 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-end">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={saving}
          className="h-11 rounded-xl px-5"
        >
          Cancel
        </Button>

        <Button
          onClick={onSubmit}
          disabled={saving}
          className="h-11 rounded-xl bg-slate-900 px-5 text-white hover:bg-slate-800"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </div>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2.5">
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      {children}
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | number | null;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      <Label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </Label>
      <div className="mt-2 flex items-center gap-2 text-sm text-slate-800">
        {icon}
        <span className="break-words">{value || "—"}</span>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | number | null;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-5">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {label}
        </p>
      </div>
      <p className="text-sm font-medium text-slate-800 break-words">{value || "—"}</p>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  iconWrap,
  valueClass = "text-slate-900",
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconWrap: string;
  valueClass?: string;
}) {
  return (
    <Card className="rounded-3xl border-slate-200 shadow-sm">
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className={`mt-2 text-3xl font-bold ${valueClass}`}>{value}</p>
        </div>

        <div className={`rounded-2xl p-3 ${iconWrap}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}