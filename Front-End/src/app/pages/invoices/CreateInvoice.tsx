import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  Send,
  FileText,
  Loader2,
  CalendarDays,
  User,
  Receipt,
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { useBusinessContext } from "@/shared/contexts/BusinessContext";
import { ClientsApi } from "@/shared/lib/services/clients";
import { InvoicesApi } from "@/shared/lib/services/invoices";
import type { Client } from "@/shared/lib/mockData";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

interface LineItemErrors {
  description?: string;
  quantity?: string;
  unitPrice?: string;
  taxRate?: string;
}

interface FormErrors {
  invoiceNumber?: string;
  clientId?: string;
  issueDate?: string;
  dueDate?: string;
  notes?: string;
  lineItems?: Record<string, LineItemErrors>;
}

const clampNumber = (v: unknown, fallback = 0) => {
  const x = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(x) ? x : fallback;
};

const makeInvoiceNumber = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const r = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `INV-${y}${m}${d}-${r}`;
};

const addDays = (dateStr: string, days: number) => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

const getInputClass = (hasError?: boolean) =>
  hasError
    ? "border-red-500 focus-visible:ring-red-500"
    : "border-gray-200 focus-visible:ring-indigo-500";

export function CreateInvoice() {
  const navigate = useNavigate();
  const { currentBusiness } = useBusinessContext();

  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(addDays(new Date().toISOString().split("T")[0], 15));
  const [notes, setNotes] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(makeInvoiceNumber());
  const [submitting, setSubmitting] = useState<"draft" | "sent" | null>(null);

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const defaultTaxRate = clampNumber(currentBusiness?.taxRate ?? 0);

  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: crypto.randomUUID?.() ?? "1",
      description: "",
      quantity: 1,
      unitPrice: 0,
      taxRate: defaultTaxRate,
    },
  ]);

  useEffect(() => {
    setLineItems((prev) =>
      prev.map((it, idx) =>
        idx === 0 && it.description.trim() === "" && it.unitPrice === 0
          ? { ...it, taxRate: defaultTaxRate }
          : it
      )
    );
  }, [defaultTaxRate, currentBusiness?.id]);

  useEffect(() => {
    const bid = currentBusiness?.id;
    if (!bid) {
      setClients([]);
      return;
    }

    setClientsLoading(true);
    ClientsApi.list(bid)
      .then((list) => setClients(list ?? []))
      .catch(() => {
        setClients([]);
        toast.error("Erreur", {
          description: "Impossible de charger les clients",
        });
      })
      .finally(() => setClientsLoading(false));
  }, [currentBusiness?.id]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === clientId),
    [clients, clientId]
  );

  const currency = currentBusiness?.currency ?? "TND";

  const clientSummary = useMemo(() => {
    if (!selectedClient) return null;
    return {
      name: selectedClient.name,
      email: (selectedClient as any).email ?? "",
      phone: (selectedClient as any).phone ?? "",
      address: (selectedClient as any).address ?? "",
    };
  }, [selectedClient]);

  const lineAmount = (item: LineItem) => {
    return clampNumber(item.quantity, 1) * clampNumber(item.unitPrice, 0);
  };

  const lineTax = (item: LineItem) => {
    return lineAmount(item) * (clampNumber(item.taxRate, 0) / 100);
  };

  const validLineItems = useMemo(() => {
    return lineItems.filter((i) => {
      const hasDesc = i.description.trim().length > 0;
      const qty = clampNumber(i.quantity, 0);
      const price = clampNumber(i.unitPrice, -1);
      const tax = clampNumber(i.taxRate, -1);
      return hasDesc && qty > 0 && price >= 0 && tax >= 0;
    });
  }, [lineItems]);

  const subtotal = useMemo(() => {
    return lineItems.reduce((sum, it) => {
      const qty = clampNumber(it.quantity, 1);
      const price = clampNumber(it.unitPrice, 0);
      return sum + qty * price;
    }, 0);
  }, [lineItems]);

  const taxAmount = useMemo(() => {
    return lineItems.reduce((sum, it) => {
      const qty = clampNumber(it.quantity, 1);
      const price = clampNumber(it.unitPrice, 0);
      const rate = clampNumber(it.taxRate, 0);
      return sum + qty * price * (rate / 100);
    }, 0);
  }, [lineItems]);

  const total = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);

  const itemCount = useMemo(
    () => lineItems.reduce((sum, it) => sum + clampNumber(it.quantity, 0), 0),
    [lineItems]
  );

  const formatMoney = (value?: number | string | null) => {
    const amount = Number(value ?? 0);
    return `${amount.toFixed(2)} ${currency}`;
  };

  const validateForm = (status: "draft" | "sent") => {
    const nextErrors: FormErrors = {
      lineItems: {},
    };

    if (!currentBusiness?.id) {
      toast.error("Aucune entreprise sélectionnée");
      return { valid: false, errors: nextErrors };
    }

    if (!invoiceNumber.trim()) {
      nextErrors.invoiceNumber = "Le numéro de facture est obligatoire.";
    } else if (!/^INV-[A-Z0-9-]+$/i.test(invoiceNumber.trim())) {
      nextErrors.invoiceNumber =
        "Le format du numéro doit être propre. Exemple : INV-20260324-0001";
    }

    if (!clientId) {
      nextErrors.clientId = "Veuillez sélectionner un client.";
    }

    if (!issueDate) {
      nextErrors.issueDate = "La date d’émission est obligatoire.";
    }

    if (!dueDate) {
      nextErrors.dueDate = "La date d’échéance est obligatoire.";
    }

    if (issueDate && dueDate && new Date(dueDate) < new Date(issueDate)) {
      nextErrors.dueDate =
        "La date d’échéance ne peut pas être avant la date d’émission.";
    }

    lineItems.forEach((item) => {
      const itemErrors: LineItemErrors = {};

      if (!item.description.trim()) {
        itemErrors.description = "La description est obligatoire.";
      }

      if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) {
        itemErrors.quantity = "La quantité doit être supérieure à 0.";
      }

      if (!Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) < 0) {
        itemErrors.unitPrice = "Le prix unitaire doit être positif ou nul.";
      }

      if (!Number.isFinite(Number(item.taxRate)) || Number(item.taxRate) < 0) {
        itemErrors.taxRate = "La taxe doit être positive ou nulle.";
      }

      if (Object.keys(itemErrors).length > 0) {
        nextErrors.lineItems![item.id] = itemErrors;
      }
    });

    if (status === "sent" && validLineItems.length === 0) {
      toast.error("Ajoute au moins une ligne valide avant l’envoi.");
    }

    const valid =
      !nextErrors.invoiceNumber &&
      !nextErrors.clientId &&
      !nextErrors.issueDate &&
      !nextErrors.dueDate &&
      Object.keys(nextErrors.lineItems || {}).length === 0 &&
      validLineItems.length > 0;

    return { valid, errors: nextErrors };
  };

  const runValidation = (status: "draft" | "sent" = "sent") => {
    const result = validateForm(status);
    setErrors(result.errors);
    return result.valid;
  };

  useEffect(() => {
    runValidation("draft");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceNumber, clientId, issueDate, dueDate, notes, lineItems]);

  const formHealth = useMemo(() => {
    const hasBusiness = Boolean(currentBusiness?.id);
    const hasClient = Boolean(clientId);
    const hasValidDates =
      Boolean(issueDate) &&
      Boolean(dueDate) &&
      new Date(dueDate).getTime() >= new Date(issueDate).getTime();
    const hasValidItems = validLineItems.length > 0;
    const hasInvoiceNumber = invoiceNumber.trim().length > 0;

    const ok =
      hasBusiness &&
      hasClient &&
      hasValidDates &&
      hasValidItems &&
      hasInvoiceNumber;

    return {
      ok,
      hasBusiness,
      hasClient,
      hasValidDates,
      hasValidItems,
      hasInvoiceNumber,
    };
  }, [currentBusiness?.id, clientId, issueDate, dueDate, validLineItems.length, invoiceNumber]);

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID?.() ?? Date.now().toString(),
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: defaultTaxRate,
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    setLineItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((i) => i.id !== id);
    });

    setErrors((prev) => {
      const copy = { ...prev };
      if (copy.lineItems?.[id]) {
        const updated = { ...(copy.lineItems || {}) };
        delete updated[id];
        copy.lineItems = updated;
      }
      return copy;
    });
  };

  const updateLineItem = (
    id: string,
    field: keyof LineItem,
    value: string | number
  ) => {
    setLineItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]:
                field === "description"
                  ? String(value)
                  : clampNumber(value, field === "quantity" ? 1 : 0),
            }
          : item
      )
    );
  };

  const markTouched = (key: string) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const saveToDb = async (status: "draft" | "sent") => {
    const isValid = runValidation(status);

    if (!isValid) {
      toast.error("Vérifie les champs du formulaire avant de continuer.");
      return;
    }

    const payload = {
      businessId: currentBusiness!.id,
      clientId,
      clientName: selectedClient?.name ?? "",
      invoiceNumber: invoiceNumber.trim(),
      issueDate,
      dueDate: dueDate || issueDate,
      currency,
      taxRate: defaultTaxRate,
      paidAmount: 0,
      notes: notes.trim(),
      status,
      items: lineItems.map((i) => ({
        description: i.description.trim(),
        quantity: clampNumber(i.quantity, 1),
        unitPrice: clampNumber(i.unitPrice, 0),
        taxRate: clampNumber(i.taxRate, 0),
      })),
    };

    try {
      setSubmitting(status);
      await InvoicesApi.create(payload as any);

      toast.success(
        status === "draft"
          ? "Facture enregistrée comme brouillon."
          : "Facture créée et envoyée avec succès."
      );

      navigate("/dashboard/invoices");
    } catch (e: any) {
      toast.error("Erreur", {
        description: e?.message || "Impossible de créer la facture",
      });
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-1 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/invoices")}
            className="rounded-xl"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div>
            <div className="mb-2 inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
              Invoice workspace
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Create Invoice
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Create a professional invoice for{" "}
              <span className="font-semibold text-indigo-600">
                {currentBusiness?.name ?? "..."}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setInvoiceNumber(makeInvoiceNumber())}
            className="rounded-xl"
          >
            <Receipt className="mr-2 h-4 w-4" />
            Regenerate Number
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* Left Content */}
        <div className="space-y-6 min-w-0">
          {/* Invoice Details */}
          <Card className="overflow-hidden rounded-2xl border-gray-200 shadow-sm">
            <CardHeader className="border-b bg-gradient-to-r from-white to-gray-50">
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5 text-indigo-600" />
                Invoice Details
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="invoiceNumber">Invoice Number</Label>
                  <Input
                    id="invoiceNumber"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    onBlur={() => markTouched("invoiceNumber")}
                    placeholder="INV-20260324-0001"
                    className={getInputClass(Boolean(touched.invoiceNumber && errors.invoiceNumber))}
                  />
                  {touched.invoiceNumber && errors.invoiceNumber && (
                    <p className="text-xs text-red-500">{errors.invoiceNumber}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client">Client *</Label>
                  <Select
                    value={clientId}
                    onValueChange={(value) => {
                      setClientId(value);
                      setTouched((prev) => ({ ...prev, clientId: true }));
                    }}
                  >
                    <SelectTrigger
                      id="client"
                      className={getInputClass(Boolean(touched.clientId && errors.clientId))}
                    >
                      <SelectValue
                        placeholder={clientsLoading ? "Loading clients..." : "Select a client"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">
                          Aucun client disponible
                        </div>
                      ) : (
                        clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>

                  {touched.clientId && errors.clientId && (
                    <p className="text-xs text-red-500">{errors.clientId}</p>
                  )}

                  {clients.length === 0 && !clientsLoading && (
                    <p className="text-xs text-gray-500">
                      Ajoute d'abord un client avant de créer une facture.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Business Currency</Label>
                  <Input value={currency} disabled className="bg-gray-50" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="issueDate">Issue Date</Label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="issueDate"
                      type="date"
                      value={issueDate}
                      onBlur={() => markTouched("issueDate")}
                      onChange={(e) => {
                        const newIssueDate = e.target.value;
                        setIssueDate(newIssueDate);

                        if (!dueDate || dueDate < newIssueDate) {
                          setDueDate(addDays(newIssueDate, 15));
                        }
                      }}
                      className={`pl-10 ${getInputClass(Boolean(touched.issueDate && errors.issueDate))}`}
                    />
                  </div>
                  {touched.issueDate && errors.issueDate && (
                    <p className="text-xs text-red-500">{errors.issueDate}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onBlur={() => markTouched("dueDate")}
                      onChange={(e) => setDueDate(e.target.value)}
                      className={`pl-10 ${getInputClass(Boolean(touched.dueDate && errors.dueDate))}`}
                    />
                  </div>
                  {touched.dueDate && errors.dueDate && (
                    <p className="text-xs text-red-500">{errors.dueDate}</p>
                  )}
                </div>
              </div>

              {clientSummary && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-indigo-700">
                    <User className="h-4 w-4" />
                    Selected Client
                  </div>

                  <div className="grid gap-2 text-sm text-gray-700">
                    <p className="font-semibold text-gray-900">{clientSummary.name}</p>
                    {clientSummary.email && <p>{clientSummary.email}</p>}
                    {clientSummary.phone && <p>{clientSummary.phone}</p>}
                    {clientSummary.address && <p>{clientSummary.address}</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card className="overflow-hidden rounded-2xl border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-gradient-to-r from-white to-gray-50">
              <CardTitle className="flex items-center gap-2 text-xl">
                <CircleDollarSign className="h-5 w-5 text-indigo-600" />
                Line Items
              </CardTitle>

              <Button variant="outline" size="sm" onClick={addLineItem} className="rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </CardHeader>

            <CardContent className="space-y-5 p-6">
              {lineItems.map((item, index) => {
                const itemErrors = errors.lineItems?.[item.id] || {};
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-gray-800">
                          Item #{index + 1}
                        </div>
                        <div className="text-xs text-gray-500">
                          Product or service billing line
                        </div>
                      </div>

                      {lineItems.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(item.id)}
                          className="rounded-xl"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                      <div className="space-y-2 md:col-span-5">
                        <Label htmlFor={`desc-${item.id}`}>Description</Label>
                        <Input
                          id={`desc-${item.id}`}
                          placeholder="Service or product description"
                          value={item.description}
                          onChange={(e) =>
                            updateLineItem(item.id, "description", e.target.value)
                          }
                          className={getInputClass(Boolean(itemErrors.description))}
                        />
                        {itemErrors.description && (
                          <p className="text-xs text-red-500">{itemErrors.description}</p>
                        )}
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`qty-${item.id}`}>Qty</Label>
                        <Input
                          id={`qty-${item.id}`}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "quantity",
                              parseInt(e.target.value, 10) || 1
                            )
                          }
                          className={getInputClass(Boolean(itemErrors.quantity))}
                        />
                        {itemErrors.quantity && (
                          <p className="text-xs text-red-500">{itemErrors.quantity}</p>
                        )}
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`price-${item.id}`}>Unit Price</Label>
                        <Input
                          id={`price-${item.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "unitPrice",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className={getInputClass(Boolean(itemErrors.unitPrice))}
                        />
                        {itemErrors.unitPrice && (
                          <p className="text-xs text-red-500">{itemErrors.unitPrice}</p>
                        )}
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`tax-${item.id}`}>Tax %</Label>
                        <Input
                          id={`tax-${item.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.taxRate}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "taxRate",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className={getInputClass(Boolean(itemErrors.taxRate))}
                        />
                        {itemErrors.taxRate && (
                          <p className="text-xs text-red-500">{itemErrors.taxRate}</p>
                        )}
                      </div>

                      <div className="flex items-end md:col-span-1">
                        <div className="w-full rounded-xl border bg-gray-50 px-3 py-2 text-center text-xs font-medium text-gray-500">
                          {currency}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border bg-gray-50 p-4 text-sm md:grid-cols-3">
                      <div className="rounded-xl bg-white p-3 shadow-sm">
                        <span className="text-gray-500">Line Amount</span>
                        <div className="mt-1 font-semibold text-gray-900">
                          {formatMoney(lineAmount(item))}
                        </div>
                      </div>

                      <div className="rounded-xl bg-white p-3 shadow-sm">
                        <span className="text-gray-500">Tax Amount</span>
                        <div className="mt-1 font-semibold text-gray-900">
                          {formatMoney(lineTax(item))}
                        </div>
                      </div>

                      <div className="rounded-xl bg-indigo-50 p-3 shadow-sm">
                        <span className="text-indigo-600">Total with Tax</span>
                        <div className="mt-1 font-bold text-indigo-700">
                          {formatMoney(lineAmount(item) + lineTax(item))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="rounded-2xl border-gray-200 shadow-sm">
            <CardHeader className="border-b bg-gradient-to-r from-white to-gray-50">
              <CardTitle>Additional Notes</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Textarea
                placeholder="Payment terms, delivery notes, or any extra information..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                className="min-h-[120px] rounded-xl"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Summary */}
        <div className="min-w-0">
          <Card className="sticky top-6 w-full rounded-2xl border-gray-200 shadow-sm">
            <CardHeader className="border-b bg-gradient-to-r from-white to-gray-50">
              <CardTitle>Invoice Summary</CardTitle>
            </CardHeader>

            <CardContent className="space-y-5 p-5">
              <div
                className={`rounded-2xl border p-4 ${
                  formHealth.ok
                    ? "border-green-200 bg-green-50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  {formHealth.ok ? (
                    <>
                      <ShieldCheck className="h-4 w-4 text-green-600" />
                      <span className="text-green-700">Invoice ready</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="text-amber-700">Form needs attention</span>
                    </>
                  )}
                </div>

                <div className="space-y-2 text-xs text-gray-700">
                  <div className="flex items-center justify-between gap-3">
                    <span>Invoice number</span>
                    {formHealth.hasInvoiceNumber ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span>Client selected</span>
                    {formHealth.hasClient ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span>Dates valid</span>
                    {formHealth.hasValidDates ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span>At least one valid line</span>
                    {formHealth.hasValidItems ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-gray-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <FileText className="h-4 w-4" />
                  Quick Overview
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-gray-500">Client</span>
                    <span className="max-w-[190px] truncate text-right font-medium text-gray-900">
                      {selectedClient?.name || "-"}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <span className="text-gray-500">Items</span>
                    <span className="font-medium text-gray-900">{itemCount}</span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <span className="text-gray-500">Valid Lines</span>
                    <span className="font-medium text-gray-900">
                      {validLineItems.length}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <span className="text-gray-500">Issue Date</span>
                    <span className="max-w-[190px] truncate text-right font-medium text-gray-900">
                      {issueDate || "-"}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <span className="text-gray-500">Due Date</span>
                    <span className="max-w-[190px] truncate text-right font-medium text-gray-900">
                      {dueDate || "-"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-right font-medium">{formatMoney(subtotal)}</span>
                </div>

                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="text-right font-medium">{formatMoney(taxAmount)}</span>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="text-right text-2xl font-bold text-indigo-600">
                      {formatMoney(total)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 border-t pt-3">
                <Button
                  className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700"
                  disabled={submitting !== null || !formHealth.ok}
                  onClick={() => saveToDb("sent")}
                >
                  {submitting === "sent" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send Invoice
                </Button>

                <Button
                  variant="outline"
                  className="w-full rounded-xl"
                  disabled={submitting !== null || !currentBusiness?.id}
                  onClick={() => saveToDb("draft")}
                >
                  {submitting === "draft" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save as Draft
                </Button>

                <Button
                  variant="ghost"
                  className="w-full rounded-xl"
                  onClick={() => navigate("/dashboard/invoices")}
                  disabled={submitting !== null}
                >
                  Cancel
                </Button>
              </div>

              {!currentBusiness?.id && (
                <p className="text-xs text-red-500">
                  No business selected. Please choose a business first.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}