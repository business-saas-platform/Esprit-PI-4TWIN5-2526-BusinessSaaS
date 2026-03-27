import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  Eye,
  Ban,
  CheckCircle,
  Clock,
  Building2,
  Loader2,
  CalendarDays,
  ShieldCheck,
  CreditCard,
  Mail,
  Plus,
  User,
  RefreshCw,
  BriefcaseBusiness,
  Sparkles,
  AlertCircle,
  Globe,
  Phone,
  MapPin,
  FileText,
  X,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

import {
  BusinessOwnersApi,
  type BusinessOwnerDetails,
  type BusinessOwnerRow,
} from "@/shared/lib/services/businessOwners";

type CreateOwnerFormState = {
  ownerName: string;
  ownerEmail: string;
  ownerStatus: string;
  businessName: string;
  businessType: string;
  address: string;
  city: string;
  country: string;
  taxId: string;
  phone: string;
  businessEmail: string;
  website: string;
  currency: string;
  fiscalYearStart: string;
  industry: string;
  taxRate: string;
  businessStatus: string;
  plan: string;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
};

const defaultCreateForm: CreateOwnerFormState = {
  ownerName: "",
  ownerEmail: "",
  ownerStatus: "active",
  businessName: "",
  businessType: "",
  address: "",
  city: "",
  country: "",
  taxId: "",
  phone: "",
  businessEmail: "",
  website: "",
  currency: "TND",
  fiscalYearStart: "",
  industry: "",
  taxRate: "19",
  businessStatus: "active",
  plan: "starter",
  subscriptionStartDate: "",
  subscriptionEndDate: "",
};

export function BusinessOwners() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");

  const [owners, setOwners] = useState<BusinessOwnerRow[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<BusinessOwnerDetails | null>(null);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [form, setForm] = useState<CreateOwnerFormState>(defaultCreateForm);

  useEffect(() => {
    loadOwners();
  }, []);

  const loadOwners = async () => {
    try {
      setLoading(true);
      const data = await BusinessOwnersApi.listAll();
      setOwners(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load business owners:", error);
      toast.error("Impossible de charger les business owners");
      setOwners([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredOwners = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return owners.filter((owner) => {
      const matchesSearch =
        !q ||
        (owner.name || "").toLowerCase().includes(q) ||
        (owner.email || "").toLowerCase().includes(q) ||
        (owner.status || "").toLowerCase().includes(q) ||
        (owner.subscriptionPlan || "").toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" || (owner.status || "").toLowerCase() === statusFilter;

      const matchesPlan =
        planFilter === "all" || (owner.subscriptionPlan || "").toLowerCase() === planFilter;

      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [owners, searchQuery, statusFilter, planFilter]);

  const stats = useMemo(() => {
    const totalOwners = owners.length;
    const activeOwners = owners.filter((o) => o.status === "active").length;
    const suspendedOwners = owners.filter((o) => o.status === "suspended").length;
    const expiringSoon = owners.filter(
      (o) =>
        o.daysRemaining !== null &&
        o.daysRemaining !== undefined &&
        o.daysRemaining >= 0 &&
        o.daysRemaining <= 7
    ).length;

    return {
      totalOwners,
      activeOwners,
      suspendedOwners,
      expiringSoon,
    };
  }, [owners]);

  const getStatusBadge = (status?: string) => {
    switch ((status || "").toLowerCase()) {
      case "active":
        return (
          <Badge className="border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
            Active
          </Badge>
        );
      case "trial":
        return (
          <Badge className="border-0 bg-amber-100 text-amber-700 hover:bg-amber-100">
            Trial
          </Badge>
        );
      case "suspended":
        return (
          <Badge className="border-0 bg-red-100 text-red-700 hover:bg-red-100">
            Suspended
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status || "Unknown"}</Badge>;
    }
  };

  const getPlanBadge = (plan?: string | null) => {
    switch ((plan || "").toLowerCase()) {
      case "starter":
        return <Badge variant="outline">Starter</Badge>;
      case "professional":
        return (
          <Badge className="border-0 bg-blue-100 text-blue-700 hover:bg-blue-100">
            Professional
          </Badge>
        );
      case "enterprise":
        return (
          <Badge className="border-0 bg-purple-100 text-purple-700 hover:bg-purple-100">
            Enterprise
          </Badge>
        );
      default:
        return <Badge variant="secondary">{plan || "No plan"}</Badge>;
    }
  };

  const getDaysRemainingBadge = (days?: number | null) => {
    if (days === null || days === undefined) {
      return <Badge variant="secondary">Unknown</Badge>;
    }
    if (days <= 0) {
      return (
        <Badge className="border-0 bg-red-100 text-red-700 hover:bg-red-100">
          Expired
        </Badge>
      );
    }
    if (days <= 7) {
      return (
        <Badge className="border-0 bg-orange-100 text-orange-700 hover:bg-orange-100">
          {days} days left
        </Badge>
      );
    }
    return (
      <Badge className="border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
        {days} days left
      </Badge>
    );
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleViewDetails = async (owner: BusinessOwnerRow) => {
    try {
      setCreateOpen(false);
      setDetailOpen(true);
      setDetailLoading(true);
      setSelectedOwner(null);

      const details = await BusinessOwnersApi.getById(owner.id);
      setSelectedOwner(details);
    } catch (error) {
      console.error("Failed to load owner details:", error);
      toast.error("Impossible de charger les détails");
      setSelectedOwner(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusChange = async (ownerId: string, newStatus: "active" | "suspended") => {
    try {
      setUpdatingId(ownerId);

      const updated = await BusinessOwnersApi.updateStatus(ownerId, newStatus);

      setOwners((prev) =>
        prev.map((owner) => (owner.id === ownerId ? { ...owner, ...updated } : owner))
      );

      setSelectedOwner((prev) =>
        prev && prev.id === ownerId ? { ...prev, ...updated } : prev
      );

      toast.success(
        newStatus === "active"
          ? "Owner activé avec succès"
          : "Owner suspendu avec succès"
      );
    } catch (error) {
      console.error("Failed to update owner status:", error);
      toast.error("Échec de mise à jour du statut");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleFormChange = (field: keyof CreateOwnerFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(defaultCreateForm);
  };

  const validateForm = () => {
    if (!form.ownerName.trim()) {
      toast.error("Owner name is required");
      return false;
    }
    if (!form.ownerEmail.trim()) {
      toast.error("Owner email is required");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(form.ownerEmail.trim())) {
      toast.error("Owner email is invalid");
      return false;
    }
    if (!form.businessName.trim()) {
      toast.error("Business name is required");
      return false;
    }
    if (!form.businessEmail.trim()) {
      toast.error("Business email is required");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(form.businessEmail.trim())) {
      toast.error("Business email is invalid");
      return false;
    }
    if (!form.businessType.trim()) {
      toast.error("Business type is required");
      return false;
    }
    if (!form.city.trim()) {
      toast.error("City is required");
      return false;
    }
    if (!form.country.trim()) {
      toast.error("Country is required");
      return false;
    }
    if (!form.currency.trim()) {
      toast.error("Currency is required");
      return false;
    }

    const taxRate = Number(form.taxRate);
    if (Number.isNaN(taxRate) || taxRate < 0) {
      toast.error("Tax rate is invalid");
      return false;
    }

    if (
      form.subscriptionStartDate &&
      form.subscriptionEndDate &&
      new Date(form.subscriptionStartDate) > new Date(form.subscriptionEndDate)
    ) {
      toast.error("Subscription end date must be after start date");
      return false;
    }

    return true;
  };

  const handleCreateOwner = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      await BusinessOwnersApi.createWithBusiness({
        user: {
          name: form.ownerName.trim(),
          email: form.ownerEmail.trim().toLowerCase(),
          status: form.ownerStatus,
        },
        business: {
          name: form.businessName.trim(),
          type: form.businessType.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          country: form.country.trim(),
          taxId: form.taxId.trim(),
          phone: form.phone.trim(),
          email: form.businessEmail.trim().toLowerCase(),
          website: form.website.trim() || undefined,
          currency: form.currency.trim(),
          fiscalYearStart: form.fiscalYearStart.trim(),
          industry: form.industry.trim(),
          taxRate: Number(form.taxRate || 0),
          status: form.businessStatus,
          plan: form.plan,
          subscriptionStartDate: form.subscriptionStartDate || undefined,
          subscriptionEndDate: form.subscriptionEndDate || undefined,
        },
      });

      toast.success("Owner + business created successfully");
      setCreateOpen(false);
      resetForm();
      await loadOwners();
    } catch (error) {
      console.error("Failed to create owner with business:", error);
      toast.error("Failed to create owner and business");
    } finally {
      setSaving(false);
    }
  };

  const openCreatePanel = () => {
    setDetailOpen(false);
    resetForm();
    setCreateOpen(true);
  };

  const closePanels = () => {
    setCreateOpen(false);
    setDetailOpen(false);
  };

  const panelOpen = createOpen || detailOpen;

  return (
    <div className="relative min-h-screen bg-slate-50/50">
      <div className={`space-y-6 p-6 transition-all duration-300 ${panelOpen ? "xl:pr-[36rem]" : ""}`}>
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 shadow-sm">
          <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Platform Administration
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Business Owners
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Gérer les owners, les businesses et les abonnements dans une interface plus pro.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button className="h-11 rounded-2xl px-5" onClick={openCreatePanel}>
                <Plus className="mr-2 h-4 w-4" />
                Add Owner
              </Button>

              <Button
                variant="outline"
                className="h-11 rounded-2xl px-5"
                onClick={loadOwners}
                disabled={loading}
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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            title="Total Owners"
            value={stats.totalOwners}
            subtitle="All registered business owners"
            icon={<User className="h-5 w-5 text-slate-700" />}
            boxClassName="bg-slate-100"
          />
          <StatsCard
            title="Active Owners"
            value={stats.activeOwners}
            subtitle="Currently active accounts"
            icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
            valueClassName="text-emerald-700"
            boxClassName="bg-emerald-50"
          />
          <StatsCard
            title="Suspended Owners"
            value={stats.suspendedOwners}
            subtitle="Accounts under restriction"
            icon={<Ban className="h-5 w-5 text-red-600" />}
            valueClassName="text-red-700"
            boxClassName="bg-red-50"
          />
          <StatsCard
            title="Expiring Soon"
            value={stats.expiringSoon}
            subtitle="Subscriptions ending in 7 days"
            icon={<Clock className="h-5 w-5 text-orange-600" />}
            valueClassName="text-orange-700"
            boxClassName="bg-orange-50"
          />
        </div>

        <Card className="rounded-[28px] border border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="relative lg:col-span-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by name, email, status or plan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 rounded-2xl border-slate-200 pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-12 rounded-2xl border-slate-200">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>

              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="h-12 rounded-2xl border-slate-200">
                  <SelectValue placeholder="Filter by plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All plans</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-xl">All Business Owners</CardTitle>
              <CardDescription>{filteredOwners.length} result(s) found</CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex min-h-[260px] items-center justify-center text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading owners...
              </div>
            ) : filteredOwners.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed bg-slate-50 text-center">
                <AlertCircle className="mb-3 h-10 w-10 text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-800">No owners found</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Badel filters wala search, ma fama hata résultat.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-3xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead>Owner</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Businesses</TableHead>
                      <TableHead>Subscription</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredOwners.map((owner) => (
                      <TableRow key={owner.id} className="hover:bg-slate-50/60">
                        <TableCell className="min-w-[260px]">
                          <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">
                              <User className="h-4 w-4 text-slate-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{owner.name}</p>
                              <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                                <Mail className="h-3.5 w-3.5" />
                                <span>{owner.email}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>{getStatusBadge(owner.status)}</TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            <span>{owner.businessCount}</span>
                          </div>
                        </TableCell>

                        <TableCell>{getPlanBadge(owner.subscriptionPlan)}</TableCell>

                        <TableCell>{getDaysRemainingBadge(owner.daysRemaining)}</TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <CalendarDays className="h-4 w-4 text-slate-400" />
                            <span>{formatDate(owner.joinedAt)}</span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl"
                              onClick={() => handleViewDetails(owner)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Button>

                            {owner.status !== "active" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl"
                                onClick={() => handleStatusChange(owner.id, "active")}
                                disabled={updatingId === owner.id}
                              >
                                {updatingId === owner.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                )}
                                Activate
                              </Button>
                            )}

                            {owner.status !== "suspended" && (
                              <Button
                                variant="destructive"
                                size="sm"
                                className="rounded-xl"
                                onClick={() => handleStatusChange(owner.id, "suspended")}
                                disabled={updatingId === owner.id}
                              >
                                {updatingId === owner.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Ban className="mr-2 h-4 w-4" />
                                )}
                                Ban
                              </Button>
                            )}
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

      {panelOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px] xl:hidden"
            onClick={closePanels}
          />

          <aside className="fixed right-0 top-0 z-50 h-[100dvh] w-full max-w-[920px] border-l border-slate-200 bg-slate-50 shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
            {detailOpen && (
              <div className="flex h-full flex-col">
                <div className="border-b bg-white px-6 py-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Owner Profile
                      </div>
                      <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                        Owner Details
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Vue claire, structurée et complète du owner.
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 rounded-2xl"
                      onClick={closePanels}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {detailLoading ? (
                  <div className="flex flex-1 items-center justify-center text-slate-500">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Loading owner details...
                  </div>
                ) : selectedOwner ? (
                  <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_300px]">
                    <div className="min-h-0 overflow-y-auto p-6 pb-32">
                      <div className="space-y-6">
                        <Card className="rounded-[28px] border border-slate-200 shadow-sm">
                          <CardContent className="p-6">
                            <div className="flex flex-col gap-5">
                              <div className="flex items-start gap-4">
                                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] bg-slate-100">
                                  <User className="h-9 w-9 text-slate-600" />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <h3 className="truncate text-3xl font-bold text-slate-900">
                                    {selectedOwner.name}
                                  </h3>

                                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                                    <div className="flex items-center gap-2">
                                      <Mail className="h-4 w-4" />
                                      <span className="break-all">{selectedOwner.email}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <CalendarDays className="h-4 w-4" />
                                      <span>Joined {formatDate(selectedOwner.joinedAt)}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <Building2 className="h-4 w-4" />
                                      <span>{selectedOwner.businessCount} business(es)</span>
                                    </div>
                                  </div>

                                  <div className="mt-4 flex flex-wrap gap-2">
                                    {getStatusBadge(selectedOwner.status)}
                                    {getPlanBadge(selectedOwner.subscriptionPlan)}
                                    {getDaysRemainingBadge(selectedOwner.daysRemaining)}
                                  </div>
                                </div>
                              </div>

                              <div className="grid gap-4 md:grid-cols-3">
                                <SummaryMiniCard
                                  label="Businesses"
                                  value={selectedOwner.businessCount ?? 0}
                                  icon={<Building2 className="h-4 w-4 text-slate-500" />}
                                />
                                <SummaryMiniCard
                                  label="Plan"
                                  value={selectedOwner.subscriptionPlan || "No plan"}
                                  icon={<CreditCard className="h-4 w-4 text-slate-500" />}
                                />
                                <SummaryMiniCard
                                  label="Days Left"
                                  value={
                                    selectedOwner.daysRemaining !== null &&
                                    selectedOwner.daysRemaining !== undefined
                                      ? selectedOwner.daysRemaining
                                      : "Unknown"
                                  }
                                  icon={<Clock className="h-4 w-4 text-slate-500" />}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <DetailStatCard
                            title="Owner Status"
                            content={getStatusBadge(selectedOwner.status)}
                            icon={<ShieldCheck className="h-5 w-5 text-emerald-600" />}
                            iconBox="bg-emerald-50"
                          />
                          <DetailStatCard
                            title="Subscription Plan"
                            content={getPlanBadge(selectedOwner.subscriptionPlan)}
                            icon={<CreditCard className="h-5 w-5 text-blue-600" />}
                            iconBox="bg-blue-50"
                          />
                          <DetailStatCard
                            title="Subscription End"
                            content={
                              <span className="text-base font-semibold text-slate-900">
                                {formatDate(selectedOwner.subscriptionEndDate)}
                              </span>
                            }
                            icon={<CalendarDays className="h-5 w-5 text-orange-600" />}
                            iconBox="bg-orange-50"
                          />
                          <DetailStatCard
                            title="Remaining Time"
                            content={getDaysRemainingBadge(selectedOwner.daysRemaining)}
                            icon={<Clock className="h-5 w-5 text-purple-600" />}
                            iconBox="bg-purple-50"
                          />
                        </div>

                        <div className="grid gap-6 xl:grid-cols-2">
                          <Card className="rounded-[28px] border border-slate-200 shadow-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg font-semibold text-slate-900">
                                Owner Information
                              </CardTitle>
                              <CardDescription>Main owner account data</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                              <ProInfoRow
                                label="Full Name"
                                value={selectedOwner.name}
                                icon={<User className="h-4 w-4 text-slate-400" />}
                              />
                              <ProInfoRow
                                label="Email Address"
                                value={selectedOwner.email}
                                icon={<Mail className="h-4 w-4 text-slate-400" />}
                              />
                              <ProInfoRow
                                label="Joined At"
                                value={formatDate(selectedOwner.joinedAt)}
                                icon={<CalendarDays className="h-4 w-4 text-slate-400" />}
                              />
                              <ProInfoRow
                                label="Status"
                                value={selectedOwner.status}
                                icon={<ShieldCheck className="h-4 w-4 text-slate-400" />}
                              />
                              <ProInfoRow
                                label="Businesses Count"
                                value={String(selectedOwner.businessCount ?? 0)}
                                icon={<Building2 className="h-4 w-4 text-slate-400" />}
                              />
                            </CardContent>
                          </Card>

                          <Card className="rounded-[28px] border border-slate-200 shadow-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg font-semibold text-slate-900">
                                Subscription Details
                              </CardTitle>
                              <CardDescription>Plan and validity period</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                              <ProInfoRow
                                label="Plan"
                                value={selectedOwner.subscriptionPlan || "No plan"}
                                icon={<CreditCard className="h-4 w-4 text-slate-400" />}
                              />
                              <ProInfoRow
                                label="Start Date"
                                value={formatDate(selectedOwner.subscriptionStartDate)}
                                icon={<CalendarDays className="h-4 w-4 text-slate-400" />}
                              />
                              <ProInfoRow
                                label="End Date"
                                value={formatDate(selectedOwner.subscriptionEndDate)}
                                icon={<CalendarDays className="h-4 w-4 text-slate-400" />}
                              />
                              <ProInfoRow
                                label="Days Remaining"
                                value={
                                  selectedOwner.daysRemaining !== null &&
                                  selectedOwner.daysRemaining !== undefined
                                    ? `${selectedOwner.daysRemaining} day(s)`
                                    : "Unknown"
                                }
                                icon={<Clock className="h-4 w-4 text-slate-400" />}
                              />
                            </CardContent>
                          </Card>
                        </div>

                        <Card className="rounded-[28px] border border-slate-200 shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg font-semibold text-slate-900">
                              Linked Businesses
                            </CardTitle>
                            <CardDescription>Businesses liés à ce owner</CardDescription>
                          </CardHeader>

                          <CardContent>
                            {!selectedOwner.businesses || selectedOwner.businesses.length === 0 ? (
                              <div className="rounded-3xl border border-dashed bg-slate-50 p-8 text-center text-sm text-slate-500">
                                No businesses found.
                              </div>
                            ) : (
                              <div className="grid gap-4">
                                {selectedOwner.businesses.map((business) => (
                                  <Card
                                    key={business.id}
                                    className="rounded-[24px] border border-slate-200 bg-slate-50/50 shadow-sm"
                                  >
                                    <CardContent className="p-5">
                                      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div className="flex min-w-0 items-start gap-3">
                                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                                            <BriefcaseBusiness className="h-5 w-5 text-slate-600" />
                                          </div>
                                          <div className="min-w-0">
                                            <p className="truncate text-lg font-semibold text-slate-900">
                                              {business.name}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                              {business.type || "Business"}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                          {getStatusBadge(business.status)}
                                          {getPlanBadge(business.plan)}
                                        </div>
                                      </div>

                                      <div className="grid gap-4 md:grid-cols-2">
                                        <ProInfoRow
                                          label="Email"
                                          value={business.email || "—"}
                                          icon={<Mail className="h-4 w-4 text-slate-400" />}
                                        />
                                        <ProInfoRow
                                          label="Phone"
                                          value={business.phone || "—"}
                                          icon={<Phone className="h-4 w-4 text-slate-400" />}
                                        />
                                        <ProInfoRow
                                          label="Website"
                                          value={business.website || "—"}
                                          icon={<Globe className="h-4 w-4 text-slate-400" />}
                                        />
                                        <ProInfoRow
                                          label="Address"
                                          value={
                                            [business.address, business.city, business.country]
                                              .filter(Boolean)
                                              .join(", ") || "—"
                                          }
                                          icon={<MapPin className="h-4 w-4 text-slate-400" />}
                                        />
                                        <ProInfoRow
                                          label="Tax ID"
                                          value={business.taxId || "—"}
                                          icon={<FileText className="h-4 w-4 text-slate-400" />}
                                        />
                                        <ProInfoRow
                                          label="Subscription End"
                                          value={formatDate(business.subscriptionEndDate)}
                                          icon={<CalendarDays className="h-4 w-4 text-slate-400" />}
                                        />
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    <div className="hidden border-l bg-white xl:flex xl:flex-col">
                      <div className="border-b px-5 py-5">
                        <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
                        <p className="mt-1 text-sm text-slate-500">Actions rapides et résumé</p>
                      </div>

                      <div className="flex-1 space-y-4 overflow-y-auto p-5 pb-28">
                        <div className="rounded-[28px] bg-slate-900 p-5 text-white">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Summary</p>
                          <p className="mt-3 text-xl font-bold">{selectedOwner.name}</p>
                          <p className="mt-1 break-all text-sm text-slate-300">{selectedOwner.email}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {getStatusBadge(selectedOwner.status)}
                            {getPlanBadge(selectedOwner.subscriptionPlan)}
                          </div>
                        </div>

                        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                          <QuickSummaryItem label="Status" value={selectedOwner.status || "—"} />
                          <div className="my-3" />
                          <QuickSummaryItem label="Plan" value={selectedOwner.subscriptionPlan || "No plan"} />
                          <div className="my-3" />
                          <QuickSummaryItem label="Businesses" value={String(selectedOwner.businessCount ?? 0)} />
                          <div className="my-3" />
                          <QuickSummaryItem label="Ends" value={formatDate(selectedOwner.subscriptionEndDate)} />
                        </div>
                      </div>

                      <div className="sticky bottom-0 border-t bg-white/95 p-5 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur supports-[backdrop-filter]:bg-white/80">
                        <div className="grid gap-2">
                          {selectedOwner.status !== "active" && (
                            <Button
                              className="h-11 rounded-2xl"
                              onClick={() => handleStatusChange(selectedOwner.id, "active")}
                              disabled={updatingId === selectedOwner.id}
                            >
                              {updatingId === selectedOwner.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="mr-2 h-4 w-4" />
                              )}
                              Activate Owner
                            </Button>
                          )}

                          {selectedOwner.status !== "suspended" && (
                            <Button
                              variant="destructive"
                              className="h-11 rounded-2xl"
                              onClick={() => handleStatusChange(selectedOwner.id, "suspended")}
                              disabled={updatingId === selectedOwner.id}
                            >
                              {updatingId === selectedOwner.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Ban className="mr-2 h-4 w-4" />
                              )}
                              Ban Owner
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            className="h-11 rounded-2xl"
                            onClick={closePanels}
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-sm text-slate-500">No details available.</div>
                )}
              </div>
            )}

            {createOpen && (
              <div className="flex h-full flex-col">
                <div className="border-b bg-white px-6 py-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                        <Sparkles className="h-3.5 w-3.5" />
                        Platform Admin
                      </div>
                      <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                        Create Business Owner + Business
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Formulaire clair, structuré et facile à lire.
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 rounded-2xl"
                      onClick={closePanels}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="min-h-0 overflow-y-auto px-6 py-6 pb-36">
                    <div className="space-y-6">
                      <Card className="rounded-[28px] border border-slate-200 shadow-sm">
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
                              <User className="h-5 w-5 text-blue-700" />
                            </div>
                            <div>
                              <CardTitle className="text-lg font-semibold text-slate-900">
                                Owner Information
                              </CardTitle>
                              <CardDescription>Main owner account fields</CardDescription>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="grid gap-4 md:grid-cols-2">
                          <FormField label="Owner Name">
                            <Input
                              className="h-12 rounded-2xl border-slate-200 bg-slate-50/70"
                              value={form.ownerName}
                              onChange={(e) => handleFormChange("ownerName", e.target.value)}
                              placeholder="Ex: Aziz Rahouej"
                            />
                          </FormField>

                          <FormField label="Owner Email">
                            <Input
                              className="h-12 rounded-2xl border-slate-200 bg-slate-50/70"
                              value={form.ownerEmail}
                              onChange={(e) => handleFormChange("ownerEmail", e.target.value)}
                              placeholder="owner@email.com"
                            />
                          </FormField>

                          <div className="md:col-span-2">
                            <FormField label="Owner Status">
                              <Select
                                value={form.ownerStatus}
                                onValueChange={(value) => handleFormChange("ownerStatus", value)}
                              >
                                <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/70">
                                  <SelectValue placeholder="Owner Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="suspended">Suspended</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormField>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="rounded-[28px] border border-slate-200 shadow-sm">
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
                              <BriefcaseBusiness className="h-5 w-5 text-emerald-700" />
                            </div>
                            <div>
                              <CardTitle className="text-lg font-semibold text-slate-900">
                                Business Information
                              </CardTitle>
                              <CardDescription>Business details and subscription</CardDescription>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="grid gap-4 md:grid-cols-2">
                          <FormField label="Business Name">
                            <Input
                              className="h-12 rounded-2xl border-slate-200 bg-slate-50/70"
                              value={form.businessName}
                              onChange={(e) => handleFormChange("businessName", e.target.value)}
                              placeholder="Business name"
                            />
                          </FormField>

                          <FormField label="Business Email">
                            <Input
                              className="h-12 rounded-2xl border-slate-200 bg-slate-50/70"
                              value={form.businessEmail}
                              onChange={(e) => handleFormChange("businessEmail", e.target.value)}
                              placeholder="business@email.com"
                            />
                          </FormField>

                          <FormField label="Business Type">
                            <Input
                              className="h-12 rounded-2xl border-slate-200 bg-slate-50/70"
                              value={form.businessType}
                              onChange={(e) => handleFormChange("businessType", e.target.value)}
                              placeholder="Retail / IT / Services"
                            />
                          </FormField>

                          <FormField label="Industry">
                            <Input
                              className="h-12 rounded-2xl border-slate-200 bg-slate-50/70"
                              value={form.industry}
                              onChange={(e) => handleFormChange("industry", e.target.value)}
                              placeholder="Industry"
                            />
                          </FormField>

                          <div className="md:col-span-2">
                            <FormField label="Address">
                              <Input
                                className="h-12 rounded-2xl border-slate-200 bg-slate-50/70"
                                value={form.address}
                                onChange={(e) => handleFormChange("address", e.target.value)}
                                placeholder="Full address"
                              />
                            </FormField>
                          </div>

                          <FormField label="City">
                            <Input
                              className="h-12 rounded-2xl border-slate-200 bg-slate-50/70"
                              value={form.city}
                              onChange={(e) => handleFormChange("city", e.target.value)}
                              placeholder="City"
                            />
                          </FormField>

                          <FormField label="Country">
                            <Input
                              className="h-12 rounded-2xl border-slate-200 bg-slate-50/70"
                              value={form.country}
                              onChange={(e) => handleFormChange("country", e.target.value)}
                              placeholder="Country"
                            />
                          </FormField>

                          <FormField label="Tax ID">
                            <Input
                              className="h-12 rounded-2xl border-slate-200 bg-slate-50/70"
                              value={form.taxId}
                              onChange={(e) => handleFormChange("taxId", e.target.value)}
                              placeholder="Tax ID"
                            />
                          </FormField>

                          <FormField label="Phone">
                            <Input
                              className="h-12 rounded-2xl border-slate-200 bg-slate-50/70"
                              value={form.phone}
                              onChange={(e) => handleFormChange("phone", e.target.value)}
                              placeholder="+216 ..."
                            />
                          </FormField>

                          <FormField label="Website">
                            <Input
                              className="h-12 rounded-2xl border-slate-200 bg-slate-50/70"
                              value={form.website}
                              onChange={(e) => handleFormChange("website", e.target.value)}
                              placeholder="https://..."
                            />
                          </FormField>

                          <FormField label="Fiscal Year Start">
                            <Input
                              className="h-12 rounded-2xl border-slate-200 bg-slate-50/70"
                              value={form.fiscalYearStart}
                              onChange={(e) => handleFormChange("fiscalYearStart", e.target.value)}
                              placeholder="YYYY-MM-DD"
                            />
                          </FormField>

                          <FormField label="Currency">
                            <Input
                              className="h-12 rounded-2xl border-slate-200 bg-slate-50/70"
                              value={form.currency}
                              onChange={(e) => handleFormChange("currency", e.target.value)}
                              placeholder="TND"
                            />
                          </FormField>

                          <FormField label="Tax Rate (%)">
                            <Input
                              className="h-12 rounded-2xl border-slate-200 bg-slate-50/70"
                              type="number"
                              value={form.taxRate}
                              onChange={(e) => handleFormChange("taxRate", e.target.value)}
                              placeholder="19"
                            />
                          </FormField>

                          <FormField label="Business Status">
                            <Select
                              value={form.businessStatus}
                              onValueChange={(value) => handleFormChange("businessStatus", value)}
                            >
                              <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/70">
                                <SelectValue placeholder="Business Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="trial">Trial</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormField>

                          <FormField label="Plan">
                            <Select
                              value={form.plan}
                              onValueChange={(value) => handleFormChange("plan", value)}
                            >
                              <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/70">
                                <SelectValue placeholder="Plan" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="starter">Starter</SelectItem>
                                <SelectItem value="professional">Professional</SelectItem>
                                <SelectItem value="enterprise">Enterprise</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormField>

                          <FormField label="Subscription Start Date">
                            <Input
                              className="h-12 rounded-2xl border-slate-200 bg-slate-50/70"
                              type="date"
                              value={form.subscriptionStartDate}
                              onChange={(e) => handleFormChange("subscriptionStartDate", e.target.value)}
                            />
                          </FormField>

                          <FormField label="Subscription End Date">
                            <Input
                              className="h-12 rounded-2xl border-slate-200 bg-slate-50/70"
                              type="date"
                              value={form.subscriptionEndDate}
                              onChange={(e) => handleFormChange("subscriptionEndDate", e.target.value)}
                            />
                          </FormField>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className="hidden border-l bg-white lg:flex lg:flex-col">
                    <div className="border-b px-5 py-5">
                      <h3 className="text-lg font-semibold text-slate-900">Live Summary</h3>
                      <p className="mt-1 text-sm text-slate-500">Preview before creation</p>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto p-5 pb-28">
                      <div className="rounded-[28px] bg-slate-900 p-5 text-white">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Owner</p>
                        <p className="mt-3 text-xl font-bold">{form.ownerName || "Owner name"}</p>
                        <p className="mt-1 break-all text-sm text-slate-300">
                          {form.ownerEmail || "owner@email.com"}
                        </p>
                        <div className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                          {form.ownerStatus || "active"}
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Business</p>
                        <p className="mt-3 text-lg font-semibold text-slate-900">
                          {form.businessName || "Business name"}
                        </p>

                        <div className="mt-4 space-y-3 text-sm text-slate-600">
                          <QuickSummaryItem label="Type" value={form.businessType || "—"} />
                          <div className="my-3" />
                          <QuickSummaryItem label="Plan" value={form.plan || "starter"} />
                          <div className="my-3" />
                          <QuickSummaryItem label="Currency" value={form.currency || "TND"} />
                          <div className="my-3" />
                          <QuickSummaryItem
                            label="Tax Rate"
                            value={form.taxRate ? `${form.taxRate}%` : "—"}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="sticky bottom-0 border-t bg-white/95 p-5 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur supports-[backdrop-filter]:bg-white/80">
                      <div className="grid gap-2">
                        <Button
                          className="h-11 rounded-2xl"
                          onClick={handleCreateOwner}
                          disabled={saving}
                        >
                          {saving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Create Owner + Business"
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          className="h-11 rounded-2xl"
                          onClick={closePanels}
                          disabled={saving}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t bg-white/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/80 lg:hidden">
                  <div className="grid gap-2">
                    <Button
                      className="h-11 rounded-2xl"
                      onClick={handleCreateOwner}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Create Owner + Business"
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      className="h-11 rounded-2xl"
                      onClick={closePanels}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </>
      )}
    </div>
  );
}

function StatsCard({
  title,
  value,
  subtitle,
  icon,
  valueClassName,
  boxClassName = "bg-slate-100",
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  valueClassName?: string;
  boxClassName?: string;
}) {
  return (
    <Card className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className={`mt-2 text-3xl font-bold text-slate-900 ${valueClassName || ""}`}>
              {value}
            </p>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          </div>
          <div className={`rounded-2xl p-3 ${boxClassName}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailStatCard({
  title,
  content,
  icon,
  iconBox = "bg-slate-100",
}: {
  title: string;
  content: React.ReactNode;
  icon: React.ReactNode;
  iconBox?: string;
}) {
  return (
    <Card className="rounded-[24px] border border-slate-200 shadow-sm">
      <CardContent className="flex items-center justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="mt-3">{content}</div>
        </div>
        <div className={`rounded-2xl p-3 ${iconBox}`}>{icon}</div>
      </CardContent>
    </Card>
  );
}

function SummaryMiniCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-medium uppercase tracking-[0.15em]">{label}</span>
      </div>
      <p className="break-words text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

function QuickSummaryItem({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="max-w-[150px] break-words text-right text-sm font-semibold text-slate-900">
        {value || "—"}
      </span>
    </div>
  );
}

function ProInfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | number | null;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 transition-all hover:border-slate-300 hover:bg-white">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {label}
        </p>
      </div>
      <p className="break-words text-sm font-semibold text-slate-900">{value || "—"}</p>
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
    <div className="grid gap-2">
      <Label className="text-sm font-semibold text-slate-800">{label}</Label>
      {children}
    </div>
  );
}