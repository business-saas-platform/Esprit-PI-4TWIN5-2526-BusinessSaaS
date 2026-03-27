import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import {
  ArrowLeft,
  Download,
  Send,
  Printer,
  CheckCircle2,
  FileText,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { useBusinessContext } from "@/shared/contexts/BusinessContext";
import { InvoicesApi, type Invoice } from "@/shared/lib/services/invoices";
import { ClientsApi } from "@/shared/lib/services/clients";

type ClientLite = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
};

type AuthUser = {
  id: string;
  email: string;
  role:
    | "platform_admin"
    | "business_owner"
    | "business_admin"
    | "accountant"
    | "team_member"
    | "client";
  businessId?: string | null;
};

type InvoiceStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "paid"
  | "overdue"
  | "cancelled";

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
  sent: {
    label: "Sent",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  viewed: {
    label: "Viewed",
    className: "bg-purple-100 text-purple-700 border-purple-200",
  },
  paid: {
    label: "Paid",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  overdue: {
    label: "Overdue",
    className: "bg-red-100 text-red-700 border-red-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
};

export function ViewInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentBusiness } = useBusinessContext();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<ClientLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  const authUser: AuthUser | null = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("auth_user") || "null");
    } catch {
      return null;
    }
  }, []);

  const canManageInvoice = useMemo(() => {
    if (!authUser) return false;
    return ["business_owner", "business_admin", "accountant"].includes(
      authUser.role
    );
  }, [authUser]);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        setLoading(true);

        const inv = await InvoicesApi.get(id);
        setInvoice(inv);

        try {
          if (inv.clientId && currentBusiness?.id) {
            const c = await ClientsApi.get(inv.clientId);
            setClient(c);
          } else {
            setClient(null);
          }
        } catch {
          setClient(null);
        }
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to load invoice");
        setInvoice(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, currentBusiness?.id]);

  const formatMoney = (value?: number | string | null) => {
    const amount = Number(value ?? 0);
    return `${amount.toFixed(2)} ${invoice?.currency ?? "TND"}`;
  };

  const formatDate = (value?: string | Date | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("fr-FR");
  };

  const getDisplayStatus = (inv: Invoice | null): InvoiceStatus => {
    if (!inv) return "draft";

    if (inv.status === "sent") {
      const due = new Date(inv.dueDate);
      const now = new Date();
      if (!Number.isNaN(due.getTime()) && due.getTime() < now.getTime()) {
        return "overdue";
      }
    }

    return inv.status as InvoiceStatus;
  };

  const displayStatus = getDisplayStatus(invoice);
  const statusConfig = STATUS_CONFIG[displayStatus] ?? STATUS_CONFIG.draft;

  const totals = useMemo(() => {
    if (!invoice) {
      return {
        subtotal: 0,
        tax: 0,
        total: 0,
        paid: 0,
        balance: 0,
      };
    }

    const subtotal = Number(invoice.subtotal ?? 0);
    const tax = Number(invoice.taxAmount ?? 0);
    const total = Number(invoice.totalAmount ?? 0);
    const paid = Number(invoice.paidAmount ?? 0);
    const balance = Math.max(total - paid, 0);

    return { subtotal, tax, total, paid, balance };
  }, [invoice]);

  const computedTaxRate = useMemo(() => {
    if (!invoice) return 0;

    const businessTaxRate = Number(currentBusiness?.taxRate ?? 0);
    if (businessTaxRate > 0) return businessTaxRate;

    const subtotal = Number(invoice.subtotal ?? 0);
    const taxAmount = Number(invoice.taxAmount ?? 0);

    if (subtotal <= 0) return 0;
    return (taxAmount / subtotal) * 100;
  }, [currentBusiness?.taxRate, invoice]);

  const canSend = canManageInvoice && invoice?.status === "draft";
  const canMarkPaid =
    canManageInvoice &&
    !!invoice &&
    ["sent", "viewed", "overdue"].includes(displayStatus);

  const handleDownload = async () => {
    try {
      toast.info("PDF generation not implemented yet");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to download invoice");
    }
  };

  const handleSend = async () => {
    if (!invoice) return;

    try {
      setSending(true);
      const updated = await InvoicesApi.markSent(invoice.id);
      setInvoice(updated);
      toast.success("Invoice marked as sent");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send invoice");
    } finally {
      setSending(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!invoice) return;

    try {
      setMarkingPaid(true);
      const updated = await InvoicesApi.markPaid(invoice.id);
      setInvoice(updated);
      toast.success("Invoice marked as paid");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to mark invoice as paid");
    } finally {
      setMarkingPaid(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card>
          <CardContent className="flex items-center gap-3 p-8 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading invoice...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-4 h-12 w-12 text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-900">
              Invoice not found
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              The invoice you are looking for does not exist or is no longer accessible.
            </p>
            <Button className="mt-6" onClick={() => navigate("/dashboard/invoices")}>
              Back to Invoices
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const bizName = currentBusiness?.name ?? "Business";
  const bizAddress = currentBusiness?.address ?? "";
  const bizPhone = currentBusiness?.phone ?? "";
  const bizEmail = currentBusiness?.email ?? "";
  const bizTaxId = currentBusiness?.taxId ?? "";

  return (
    <div className="mx-auto max-w-5xl space-y-6 print:max-w-full">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between print:hidden">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/invoices")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                {invoice.invoiceNumber}
              </h1>
              <Badge variant="outline" className={statusConfig.className}>
                {statusConfig.label}
              </Badge>
            </div>

            <p className="mt-2 text-sm text-gray-500">
              View invoice details, payment status and billing breakdown.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>

          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>

          {canSend && (
            <Button size="sm" onClick={handleSend} disabled={sending}>
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send
            </Button>
          )}

          {canMarkPaid && (
            <Button size="sm" onClick={handleMarkPaid} disabled={markingPaid}>
              {markingPaid ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Mark Paid
            </Button>
          )}
        </div>
      </div>

      {/* Printable invoice */}
      <Card className="border-gray-200 print:border-0 print:shadow-none">
        <CardContent className="p-6 md:p-10 print:p-0">
          {/* Top section */}
          <div className="flex flex-col gap-8 border-b pb-8 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-sm font-medium uppercase tracking-wide text-gray-500">
                From
              </div>
              <h2 className="mt-2 text-xl font-bold text-gray-900">{bizName}</h2>

              <div className="mt-3 space-y-1 text-sm text-gray-600">
                {bizAddress && <p>{bizAddress}</p>}
                {bizPhone && <p>{bizPhone}</p>}
                {bizEmail && <p>{bizEmail}</p>}
                {bizTaxId && <p>Tax ID: {bizTaxId}</p>}
              </div>
            </div>

            <div className="md:text-right">
              <div className="text-sm font-medium uppercase tracking-wide text-gray-500">
                Bill To
              </div>
              <h2 className="mt-2 text-xl font-bold text-gray-900">
                {client?.name || invoice.clientName}
              </h2>

              <div className="mt-3 space-y-1 text-sm text-gray-600">
                {client?.address && <p>{client.address}</p>}
                {client?.phone && <p>{client.phone}</p>}
                {client?.email && <p>{client.email}</p>}
                {client?.taxId && <p>Tax ID: {client.taxId}</p>}
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-1 gap-4 border-b py-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-gray-500">Invoice Number</p>
              <p className="mt-1 font-semibold text-gray-900">{invoice.invoiceNumber}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Issue Date</p>
              <p className="mt-1 font-semibold text-gray-900">
                {formatDate(invoice.issueDate)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Due Date</p>
              <p className="mt-1 font-semibold text-gray-900">
                {formatDate(invoice.dueDate)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Status</p>
              <div className="mt-1">
                <Badge variant="outline" className={statusConfig.className}>
                  {statusConfig.label}
                </Badge>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="py-8">
            <h3 className="mb-4 text-base font-semibold text-gray-900">
              Invoice Items
            </h3>

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      Unit Price
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      Tax
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {invoice.items?.length ? (
                    invoice.items.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-4 py-4 text-gray-900">
                          {item.description}
                        </td>
                        <td className="px-4 py-4 text-right text-gray-600">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-4 text-right text-gray-600">
                          {formatMoney(item.unitPrice)}
                        </td>
                        <td className="px-4 py-4 text-right text-gray-600">
                          {Number(item.taxRate ?? 0).toFixed(2)}%
                        </td>
                        <td className="px-4 py-4 text-right font-medium text-gray-900">
                          {formatMoney(item.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        No line items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals + notes */}
          <div className="grid grid-cols-1 gap-8 border-t pt-8 md:grid-cols-2">
            <div>
              {invoice.notes ? (
                <>
                  <h3 className="mb-2 text-base font-semibold text-gray-900">Notes</h3>
                  <div className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-600">
                    {invoice.notes}
                  </div>
                </>
              ) : (
                <>
                  <h3 className="mb-2 text-base font-semibold text-gray-900">
                    Notes
                  </h3>
                  <div className="rounded-xl border border-dashed p-4 text-sm text-gray-400">
                    No notes added for this invoice.
                  </div>
                </>
              )}
            </div>

            <div className="md:ml-auto md:w-full md:max-w-sm">
              <div className="rounded-xl border bg-gray-50 p-5">
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">
                    {formatMoney(totals.subtotal)}
                  </span>
                </div>

                <div className="flex justify-between py-2 text-sm">
                  <span className="text-gray-600">
                    Tax ({computedTaxRate.toFixed(2)}%)
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatMoney(totals.tax)}
                  </span>
                </div>

                <div className="mt-2 border-t pt-4">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-indigo-600">
                      {formatMoney(totals.total)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Paid</span>
                    <span className="font-medium text-green-600">
                      {formatMoney(totals.paid)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Balance Due</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatMoney(totals.balance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 border-t pt-6 text-center text-sm text-gray-500">
            <p>Thank you for your business!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}