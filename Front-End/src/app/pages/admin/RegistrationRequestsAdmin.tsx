import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  CreditCard,
  Eye,
  RefreshCcw,
  Search,
  ShieldAlert,
  XCircle,
  Wallet,
  Landmark,
  Clock3,
  ShieldCheck,
  X,
  Building2,
  User2,
  Mail,
  CalendarDays,
  FileText,
  BadgeDollarSign,
  CheckCircle,
  AlertCircle,
  Ban,
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

import {
  RegistrationRequest,
  RegistrationRequestsApi,
  RegistrationRequestStatus,
  PaymentStatus,
} from "@/shared/lib/services/registrationRequests";

function formatDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function RequestStatusBadge({
  status,
}: {
  status: RegistrationRequestStatus;
}) {
  const config = {
    pending: {
      className:
        "border-yellow-200 bg-yellow-50 text-yellow-700 shadow-sm shadow-yellow-100/50",
      label: "Pending",
    },
    approved: {
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100/50",
      label: "Approved",
    },
    rejected: {
      className:
        "border-red-200 bg-red-50 text-red-700 shadow-sm shadow-red-100/50",
      label: "Rejected",
    },
  }[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

function PaymentStatusBadge({
  status,
}: {
  status?: PaymentStatus | null;
}) {
  const value = status ?? "unpaid";

  const config: Record<
    string,
    { className: string; label: string }
  > = {
    paid: {
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100/50",
      label: "Paid",
    },
    pending: {
      className:
        "border-amber-200 bg-amber-50 text-amber-700 shadow-sm shadow-amber-100/50",
      label: "Pending",
    },
    pending_verification: {
      className:
        "border-blue-200 bg-blue-50 text-blue-700 shadow-sm shadow-blue-100/50",
      label: "Pending Verification",
    },
    failed: {
      className:
        "border-red-200 bg-red-50 text-red-700 shadow-sm shadow-red-100/50",
      label: "Failed",
    },
    waived: {
      className:
        "border-purple-200 bg-purple-50 text-purple-700 shadow-sm shadow-purple-100/50",
      label: "Waived",
    },
    unpaid: {
      className:
        "border-slate-200 bg-slate-100 text-slate-700 shadow-sm shadow-slate-100/50",
      label: "Unpaid",
    },
  };

  const item = config[value] ?? config.unpaid;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        item.className
      )}
    >
      {item.label}
    </span>
  );
}

function PaymentMethodBadge({
  method,
}: {
  method?: RegistrationRequest["paymentMethod"];
}) {
  const value = method ?? "manual";

  const map: Record<string, string> = {
    mock_online: "Mock Online",
    cash: "Cash",
    bank_transfer: "Bank Transfer",
    manual: "Manual",
  };

  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
      {map[value] ?? value}
    </span>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        {icon ? <div className="text-slate-400">{icon}</div> : null}
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {label}
        </span>
      </div>
      <div className="text-sm font-semibold text-slate-900 break-words">
        {value || "—"}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  tone = "slate",
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  tone?: "yellow" | "green" | "red" | "blue" | "slate";
}) {
  const tones = {
    yellow: "from-yellow-50 to-white border-yellow-200 text-yellow-600",
    green: "from-emerald-50 to-white border-emerald-200 text-emerald-600",
    red: "from-red-50 to-white border-red-200 text-red-600",
    blue: "from-blue-50 to-white border-blue-200 text-blue-600",
    slate: "from-slate-50 to-white border-slate-200 text-slate-600",
  };

  return (
    <Card
      className={cn(
        "rounded-3xl border bg-gradient-to-br shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        tones[tone]
      )}
    >
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

export default function RegistrationRequestsAdmin() {
  const [status, setStatus] = useState<RegistrationRequestStatus | "all">(
    "pending"
  );
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "all">(
    "all"
  );
  const [items, setItems] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedItem, setSelectedItem] = useState<RegistrationRequest | null>(
    null
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchList = async () => {
    try {
      setLoading(true);

      const list =
        status === "all" || paymentFilter !== "all"
          ? await RegistrationRequestsApi.listAdvanced({
              status: status === "all" ? undefined : status,
              paymentStatus:
                paymentFilter === "all" ? undefined : paymentFilter,
            })
          : await RegistrationRequestsApi.list(status);

      setItems(list);

      if (selectedItem) {
        const fresh = list.find((x) => x.id === selectedItem.id) ?? null;
        setSelectedItem(fresh);
      }
    } catch (err: any) {
      toast.error("Failed to load requests", {
        description: err?.message || "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, paymentFilter]);

  const stats = useMemo(() => {
    const pending = items.filter((x) => x.status === "pending").length;
    const approved = items.filter((x) => x.status === "approved").length;
    const rejected = items.filter((x) => x.status === "rejected").length;
    const paid = items.filter((x) => x.paymentStatus === "paid").length;
    const paymentPending = items.filter(
      (x) =>
        x.paymentStatus === "pending" ||
        x.paymentStatus === "pending_verification"
    ).length;

    return { pending, approved, rejected, paid, paymentPending };
  }, [items]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;

    return items.filter((r) => {
      const s = `${r.ownerName} ${r.ownerEmail} ${r.companyName} ${
        r.companyCategory
      } ${r.selectedPlan ?? ""} ${r.paymentMethod ?? ""} ${
        r.paymentStatus ?? ""
      } ${r.message ?? ""}`.toLowerCase();

      return s.includes(query);
    });
  }, [items, q]);

  const approve = async (id: string) => {
    try {
      setActionLoading(`approve-${id}`);
      await RegistrationRequestsApi.approve(id);
      toast.success("Approved", {
        description: "Email sent to owner with login details.",
      });
      await fetchList();
    } catch (err: any) {
      toast.error("Approve failed", {
        description: err?.message || "Unknown error",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const openReject = (id: string) => {
    setRejectingId(id);
    setRejectReason("");
  };

  const cancelReject = () => {
    setRejectingId(null);
    setRejectReason("");
  };

  const confirmReject = async () => {
    if (!rejectingId) return;

    const reason = rejectReason.trim();
    if (!reason) {
      toast.error("Please provide a rejection reason");
      return;
    }

    try {
      setActionLoading(`reject-${rejectingId}`);
      await RegistrationRequestsApi.reject(rejectingId, reason);
      toast.success("Rejected", {
        description: "Email sent to owner with rejection reason.",
      });
      cancelReject();
      await fetchList();
    } catch (err: any) {
      toast.error("Reject failed", {
        description: err?.message || "Unknown error",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const updatePaymentStatus = async (
    id: string,
    paymentStatus: PaymentStatus,
    paymentReference?: string
  ) => {
    try {
      setActionLoading(`${paymentStatus}-${id}`);
      await RegistrationRequestsApi.updatePaymentStatus(id, {
        paymentStatus,
        paymentReference,
      });
      toast.success("Payment status updated", {
        description: `Status changed to ${paymentStatus}.`,
      });
      await fetchList();
    } catch (err: any) {
      toast.error("Payment update failed", {
        description: err?.message || "Unknown error",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const createMockPayment = async (id: string) => {
    try {
      setActionLoading(`mock-create-${id}`);
      await RegistrationRequestsApi.createMockPayment(id);
      toast.success("Mock payment created");
      await fetchList();
    } catch (err: any) {
      toast.error("Mock payment creation failed", {
        description: err?.message || "Unknown error",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const mockSuccess = async (id: string) => {
    try {
      setActionLoading(`mock-success-${id}`);
      await RegistrationRequestsApi.mockPaymentSuccess(id);
      toast.success("Payment marked as paid");
      await fetchList();
    } catch (err: any) {
      toast.error("Mock payment success failed", {
        description: err?.message || "Unknown error",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const mockFail = async (id: string) => {
    try {
      setActionLoading(`mock-fail-${id}`);
      await RegistrationRequestsApi.mockPaymentFail(id);
      toast.success("Payment marked as failed");
      await fetchList();
    } catch (err: any) {
      toast.error("Mock payment fail failed", {
        description: err?.message || "Unknown error",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const statusTabs = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg">
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
              Platform Admin Panel
            </div>
            <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
              Registration Requests
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300 lg:text-base">
              Review onboarding requests, validate payments, approve access, and
              manage the entire business registration flow from one professional
              control center.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={fetchList}
              disabled={loading}
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              {loading ? "Refreshing..." : "Refresh Data"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Pending"
          value={stats.pending}
          icon={<AlertCircle className="h-5 w-5" />}
          tone="yellow"
        />
        <StatCard
          title="Approved"
          value={stats.approved}
          icon={<CheckCircle className="h-5 w-5" />}
          tone="green"
        />
        <StatCard
          title="Rejected"
          value={stats.rejected}
          icon={<Ban className="h-5 w-5" />}
          tone="red"
        />
        <StatCard
          title="Paid"
          value={stats.paid}
          icon={<BadgeDollarSign className="h-5 w-5" />}
          tone="blue"
        />
        <StatCard
          title="Payment Pending"
          value={stats.paymentPending}
          icon={<Clock3 className="h-5 w-5" />}
          tone="slate"
        />
      </div>

      <Card className="rounded-[28px] border-slate-200 shadow-sm">
        <CardContent className="space-y-5 p-5 lg:p-6">
          <div className="flex flex-wrap gap-2">
            {statusTabs.map((tab) => (
              <Button
                key={tab.key}
                size="sm"
                variant={status === tab.key ? "default" : "outline"}
                onClick={() => setStatus(tab.key)}
                className={cn(
                  "rounded-full px-4",
                  status === tab.key && "shadow-sm"
                )}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by company, owner, email, plan, payment..."
                className="h-11 rounded-xl border-slate-200 pl-10"
              />
            </div>

            <select
              value={paymentFilter}
              onChange={(e) =>
                setPaymentFilter(e.target.value as PaymentStatus | "all")
              }
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400"
            >
              <option value="all">All payment states</option>
              <option value="unpaid">Unpaid</option>
              <option value="pending">Pending</option>
              <option value="pending_verification">Pending Verification</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="waived">Waived</option>
            </select>

            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-600">
              {loading ? "Loading..." : `${filtered.length} request(s)`}
            </div>
          </div>
        </CardContent>
      </Card>

      {rejectingId && (
        <Card className="rounded-[28px] border-red-200 bg-red-50/40 shadow-sm">
          <CardHeader>
            <CardTitle className="text-red-700">Reject Request</CardTitle>
            <CardDescription>
              This message will be sent to the business owner by email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection reason</Label>
              <Input
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Example: Missing company data, duplicate request, invalid payment proof..."
                className="h-11 rounded-xl"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={confirmReject}
                disabled={actionLoading === `reject-${rejectingId}`}
              >
                Confirm Reject
              </Button>
              <Button variant="outline" onClick={cancelReject}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden rounded-[28px] border-slate-200 shadow-sm">
        <CardHeader className="border-b bg-slate-50/70">
          <CardTitle>Requests Table</CardTitle>
          <CardDescription>
            Full view of all onboarding requests with quick actions.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-[1280px] w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b text-left">
                  <th className="px-5 py-4 font-semibold text-slate-600">
                    Company
                  </th>
                  <th className="px-5 py-4 font-semibold text-slate-600">
                    Owner
                  </th>
                  <th className="px-5 py-4 font-semibold text-slate-600">
                    Plan
                  </th>
                  <th className="px-5 py-4 font-semibold text-slate-600">
                    Payment Method
                  </th>
                  <th className="px-5 py-4 font-semibold text-slate-600">
                    Payment Status
                  </th>
                  <th className="px-5 py-4 font-semibold text-slate-600">
                    Request Status
                  </th>
                  <th className="px-5 py-4 font-semibold text-slate-600">
                    Created
                  </th>
                  <th className="px-5 py-4 text-right font-semibold text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-16 text-center text-slate-500"
                    >
                      No requests found.
                    </td>
                  </tr>
                )}

                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-b transition hover:bg-slate-50/70",
                      selectedItem?.id === r.id && "bg-blue-50/40"
                    )}
                  >
                    <td className="px-5 py-4 align-top">
                      <div className="font-semibold text-slate-900">
                        {r.companyName}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {r.companyCategory || "No category"}
                      </div>
                    </td>

                    <td className="px-5 py-4 align-top">
                      <div className="font-semibold text-slate-900">
                        {r.ownerName}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {r.ownerEmail}
                      </div>
                    </td>

                    <td className="px-5 py-4 align-top text-slate-700">
                      {r.selectedPlan || "—"}
                    </td>

                    <td className="px-5 py-4 align-top">
                      <PaymentMethodBadge method={r.paymentMethod} />
                    </td>

                    <td className="px-5 py-4 align-top">
                      <PaymentStatusBadge status={r.paymentStatus} />
                    </td>

                    <td className="px-5 py-4 align-top">
                      <RequestStatusBadge status={r.status} />
                    </td>

                    <td className="px-5 py-4 align-top text-slate-500">
                      {formatDate(r.createdAt)}
                    </td>

                    <td className="px-5 py-4 align-top">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedItem(r)}
                          className="rounded-xl"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Details
                        </Button>

                        {r.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => approve(r.id)}
                              disabled={actionLoading === `approve-${r.id}`}
                              className="rounded-xl"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openReject(r.id)}
                              className="rounded-xl"
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {loading && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-14 text-center text-slate-500"
                    >
                      Loading requests...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedItem && (
        <Card className="rounded-[28px] border-blue-200 bg-gradient-to-br from-white to-blue-50/40 shadow-md">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="text-2xl">
                {selectedItem.companyName}
              </CardTitle>
              <CardDescription className="mt-1">
                Full admin control panel for this registration request.
              </CardDescription>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedItem(null)}
              className="rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              <InfoRow
                label="Company Name"
                value={selectedItem.companyName}
                icon={<Building2 className="h-4 w-4" />}
              />
              <InfoRow
                label="Category"
                value={selectedItem.companyCategory}
                icon={<FileText className="h-4 w-4" />}
              />
              <InfoRow
                label="Company Phone"
                value={selectedItem.companyPhone}
                icon={<CreditCard className="h-4 w-4" />}
              />
              <InfoRow
                label="Company Address"
                value={selectedItem.companyAddress}
                icon={<Building2 className="h-4 w-4" />}
              />
              <InfoRow
                label="Tax ID"
                value={selectedItem.companyTaxId}
                icon={<FileText className="h-4 w-4" />}
              />
              <InfoRow
                label="Team Size"
                value={selectedItem.teamSize}
                icon={<User2 className="h-4 w-4" />}
              />
              <InfoRow
                label="Owner Name"
                value={selectedItem.ownerName}
                icon={<User2 className="h-4 w-4" />}
              />
              <InfoRow
                label="Owner Email"
                value={selectedItem.ownerEmail}
                icon={<Mail className="h-4 w-4" />}
              />
              <InfoRow
                label="Plan"
                value={selectedItem.selectedPlan}
                icon={<BadgeDollarSign className="h-4 w-4" />}
              />
              <InfoRow
                label="Payment Method"
                value={
                  <PaymentMethodBadge method={selectedItem.paymentMethod} />
                }
                icon={<CreditCard className="h-4 w-4" />}
              />
              <InfoRow
                label="Payment Status"
                value={
                  <PaymentStatusBadge status={selectedItem.paymentStatus} />
                }
                icon={<Wallet className="h-4 w-4" />}
              />
              <InfoRow
                label="Request Status"
                value={<RequestStatusBadge status={selectedItem.status} />}
                icon={<ShieldCheck className="h-4 w-4" />}
              />
              <InfoRow
                label="Payment Provider"
                value={selectedItem.paymentProvider}
                icon={<Landmark className="h-4 w-4" />}
              />
              <InfoRow
                label="Payment Ref"
                value={selectedItem.paymentReference}
                icon={<FileText className="h-4 w-4" />}
              />
              <InfoRow
                label="Paid At"
                value={formatDate(selectedItem.paidAt)}
                icon={<CalendarDays className="h-4 w-4" />}
              />
              <InfoRow
                label="Created At"
                value={formatDate(selectedItem.createdAt)}
                icon={<CalendarDays className="h-4 w-4" />}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="rounded-3xl border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Message</CardTitle>
                  <CardDescription>
                    Note sent by the business owner during registration.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {selectedItem.message || "No message provided."}
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Review Info</CardTitle>
                  <CardDescription>
                    Internal review and moderation metadata.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-700">
                  <div>
                    <span className="font-semibold text-slate-900">
                      Rejection Reason:
                    </span>{" "}
                    {selectedItem.rejectionReason || "—"}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">
                      Reviewed At:
                    </span>{" "}
                    {formatDate(selectedItem.reviewedAt)}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">
                      Reviewed By:
                    </span>{" "}
                    {selectedItem.reviewedByAdminId || "—"}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="rounded-3xl border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Payment Controls</CardTitle>
                  <CardDescription>
                    Manage payment state and test flows.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                      variant="outline"
                      onClick={() => createMockPayment(selectedItem.id)}
                      disabled={actionLoading === `mock-create-${selectedItem.id}`}
                      className="justify-start rounded-xl"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Create Mock Payment
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => mockSuccess(selectedItem.id)}
                      disabled={actionLoading === `mock-success-${selectedItem.id}`}
                      className="justify-start rounded-xl"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Mock Success
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => mockFail(selectedItem.id)}
                      disabled={actionLoading === `mock-fail-${selectedItem.id}`}
                      className="justify-start rounded-xl"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Mock Fail
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => updatePaymentStatus(selectedItem.id, "paid")}
                      disabled={actionLoading === `paid-${selectedItem.id}`}
                      className="justify-start rounded-xl"
                    >
                      <Wallet className="mr-2 h-4 w-4" />
                      Mark Paid
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() =>
                        updatePaymentStatus(
                          selectedItem.id,
                          "pending_verification"
                        )
                      }
                      disabled={
                        actionLoading ===
                        `pending_verification-${selectedItem.id}`
                      }
                      className="justify-start rounded-xl"
                    >
                      <Landmark className="mr-2 h-4 w-4" />
                      Pending Verification
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => updatePaymentStatus(selectedItem.id, "failed")}
                      disabled={actionLoading === `failed-${selectedItem.id}`}
                      className="justify-start rounded-xl"
                    >
                      <ShieldAlert className="mr-2 h-4 w-4" />
                      Mark Failed
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => updatePaymentStatus(selectedItem.id, "unpaid")}
                      disabled={actionLoading === `unpaid-${selectedItem.id}`}
                      className="justify-start rounded-xl"
                    >
                      <Clock3 className="mr-2 h-4 w-4" />
                      Mark Unpaid
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => updatePaymentStatus(selectedItem.id, "waived")}
                      disabled={actionLoading === `waived-${selectedItem.id}`}
                      className="justify-start rounded-xl"
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Waive Payment
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Review Actions</CardTitle>
                  <CardDescription>
                    Final moderation decisions for this request.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedItem.status === "pending" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Button
                        onClick={() => approve(selectedItem.id)}
                        disabled={actionLoading === `approve-${selectedItem.id}`}
                        className="rounded-xl"
                      >
                        Approve Request
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => openReject(selectedItem.id)}
                        className="rounded-xl"
                      >
                        Reject Request
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      This request has already been reviewed.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}