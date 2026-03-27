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
  ArrowLeft,
  Upload,
  Save,
  Loader2,
  CalendarDays,
  Wallet,
  Building2,
  FileText,
  Image as ImageIcon,
  X,
  CreditCard,
  BriefcaseBusiness,
} from "lucide-react";
import { expenseCategories } from "@/shared/lib/mockData";
import { useBusinessContext } from "@/shared/contexts/BusinessContext";
import { toast } from "sonner";
import { ExpensesApi } from "@/shared/lib/services/expenses";
import { useAuth } from "@/shared/contexts/AuthContext";

const paymentMethods = ["Cash", "Card", "Bank Transfer", "Check", "Other"] as const;
const MAX_FILE_SIZE_MB = 5;
const MAX_VENDOR_LENGTH = 100;
const MIN_DESCRIPTION_LENGTH = 5;
const MAX_DESCRIPTION_LENGTH = 500;

const formatMoney = (value: number, currency: string) =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0)) + ` ${currency}`;

type FormErrors = {
  category?: string;
  amount?: string;
  vendor?: string;
  paymentMethod?: string;
  date?: string;
  description?: string;
  receipt?: string;
};

const inputErrorClass =
  "border-red-500 focus-visible:ring-red-500/30 focus-visible:border-red-500";

export function CreateExpense() {
  const navigate = useNavigate();
  const { currentBusiness } = useBusinessContext();
  const { user } = useAuth();

  const [category, setCategory] = useState("");
  const [vendor, setVendor] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const currency = currentBusiness?.currency ?? "TND";
  const numericAmount = useMemo(() => Number(amount || 0), [amount]);

  const submittedByLabel = useMemo(() => {
    return user?.name || user?.email || "system";
  }, [user]);

  const receiptPreview = useMemo(() => {
    if (!receipt) return null;

    const isImage = receipt.type.startsWith("image/");
    const isPdf =
      receipt.type === "application/pdf" ||
      receipt.name.toLowerCase().endsWith(".pdf");

    return {
      name: receipt.name,
      sizeKb: Math.round(receipt.size / 1024),
      isImage,
      isPdf,
    };
  }, [receipt]);

  useEffect(() => {
    if (receipt && receipt.type.startsWith("image/")) {
      const objectUrl = URL.createObjectURL(receipt);
      setReceiptPreviewUrl(objectUrl);

      return () => URL.revokeObjectURL(objectUrl);
    }

    setReceiptPreviewUrl(null);
  }, [receipt]);

  const clearError = (field: keyof FormErrors) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const setFieldError = (field: keyof FormErrors, message?: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const validateCategory = () => {
    if (!category) return "Veuillez sélectionner une catégorie.";
    return undefined;
  };

  const validateAmount = () => {
    if (!amount.trim()) return "Veuillez saisir un montant.";
    if (Number.isNaN(numericAmount)) return "Le montant est invalide.";
    if (numericAmount <= 0) return "Le montant doit être supérieur à 0.";
    if (numericAmount > 999999999) return "Le montant est trop élevé.";
    return undefined;
  };

  const validateVendor = () => {
    if (vendor.trim().length > MAX_VENDOR_LENGTH) {
      return `Le fournisseur ne doit pas dépasser ${MAX_VENDOR_LENGTH} caractères.`;
    }
    return undefined;
  };

  const validatePaymentMethod = () => {
    if (!paymentMethod) return "Veuillez sélectionner une méthode de paiement.";
    return undefined;
  };

  const validateDate = () => {
    if (!date) return "Veuillez choisir une date.";

    const selected = new Date(date);
    if (Number.isNaN(selected.getTime())) {
      return "La date saisie est invalide.";
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (selected > today) {
      return "La date ne peut pas être dans le futur.";
    }

    return undefined;
  };

  const validateDescription = () => {
    const value = description.trim();

    if (!value) return "Veuillez saisir une description.";
    if (value.length < MIN_DESCRIPTION_LENGTH) {
      return `La description doit contenir au moins ${MIN_DESCRIPTION_LENGTH} caractères.`;
    }
    if (value.length > MAX_DESCRIPTION_LENGTH) {
      return `La description ne doit pas dépasser ${MAX_DESCRIPTION_LENGTH} caractères.`;
    }

    return undefined;
  };

  const validateReceipt = (file: File | null = receipt) => {
    if (!file) return undefined;

    const maxSizeBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
    const isAcceptedType =
      file.type.startsWith("image/") ||
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isAcceptedType) {
      return "Le fichier doit être une image ou un PDF.";
    }

    if (file.size > maxSizeBytes) {
      return `Le fichier dépasse ${MAX_FILE_SIZE_MB} MB.`;
    }

    return undefined;
  };

  const validateForm = () => {
    const newErrors: FormErrors = {
      category: validateCategory(),
      amount: validateAmount(),
      vendor: validateVendor(),
      paymentMethod: validatePaymentMethod(),
      date: validateDate(),
      description: validateDescription(),
      receipt: validateReceipt(),
    };

    setErrors(newErrors);

    return !Object.values(newErrors).some(Boolean);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;

    if (!file) {
      setReceipt(null);
      clearError("receipt");
      return;
    }

    const receiptError = validateReceipt(file);

    if (receiptError) {
      setReceipt(null);
      setFieldError("receipt", receiptError);
      toast.error("Fichier invalide", {
        description: receiptError,
      });
      return;
    }

    setReceipt(file);
    clearError("receipt");
  };

  const removeReceipt = () => {
    setReceipt(null);
    setReceiptPreviewUrl(null);
    clearError("receipt");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentBusiness?.id) {
      toast.error("Veuillez sélectionner une entreprise");
      return;
    }

    const isValid = validateForm();

    if (!isValid) {
      toast.error("Formulaire invalide", {
        description: "Veuillez corriger les champs en rouge.",
      });
      return;
    }

    try {
      setLoading(true);

      await ExpensesApi.create({
        businessId: currentBusiness.id,
        date,
        amount: numericAmount,
        currency,
        category,
        vendor: vendor.trim() || "N/A",
        description: description.trim(),
        paymentMethod,
        status: "pending",
        submittedBy: submittedByLabel,
      });

      toast.success("Dépense créée avec succès");
      navigate("/dashboard/expenses");
    } catch (err: any) {
      toast.error("Erreur", {
        description: err?.message || "Impossible de créer la dépense",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!currentBusiness) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-slate-900">Créer une dépense</h1>
        <p className="text-sm text-slate-500">Aucune entreprise sélectionnée.</p>
        <Button onClick={() => navigate("/dashboard/businesses/new")}>
          <Building2 className="mr-2 h-4 w-4" />
          Créer une entreprise
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <button
              type="button"
              onClick={() => navigate("/dashboard/expenses")}
              className="inline-flex items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-white hover:text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </button>
            <span>/</span>
            <span>Expenses</span>
            <span>/</span>
            <span className="text-slate-700">Créer</span>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                Créer une dépense
              </h1>
              <p className="mt-2 text-base text-slate-500">
                Enregistrez une nouvelle dépense pour{" "}
                <span className="font-semibold text-indigo-600">
                  {currentBusiness.name}
                </span>
              </p>
            </div>

            <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
              Statut initial : En attente
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="space-y-6 xl:col-span-8">
              <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl text-slate-900">
                    Informations principales
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Catégorie *
                      </Label>
                      <Select
                        value={category}
                        onValueChange={(value) => {
                          setCategory(value);
                          setFieldError("category", undefined);
                        }}
                      >
                        <SelectTrigger
                          className={`h-11 rounded-xl border-slate-200 bg-white ${
                            errors.category ? inputErrorClass : ""
                          }`}
                        >
                          <SelectValue placeholder="Sélectionner une catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.category && (
                        <p className="text-xs font-medium text-red-600">
                          {errors.category}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Montant ({currency}) *
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => {
                          setAmount(e.target.value);
                          clearError("amount");
                        }}
                        onBlur={() => setFieldError("amount", validateAmount())}
                        className={`h-11 rounded-xl border-slate-200 bg-white ${
                          errors.amount ? inputErrorClass : ""
                        }`}
                      />
                      {errors.amount && (
                        <p className="text-xs font-medium text-red-600">
                          {errors.amount}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Fournisseur
                      </Label>
                      <Input
                        placeholder="Ex: Office Depot"
                        value={vendor}
                        onChange={(e) => {
                          setVendor(e.target.value);
                          clearError("vendor");
                        }}
                        onBlur={() => setFieldError("vendor", validateVendor())}
                        className={`h-11 rounded-xl border-slate-200 bg-white ${
                          errors.vendor ? inputErrorClass : ""
                        }`}
                      />
                      {errors.vendor && (
                        <p className="text-xs font-medium text-red-600">
                          {errors.vendor}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Méthode de paiement *
                      </Label>
                      <Select
                        value={paymentMethod}
                        onValueChange={(value) => {
                          setPaymentMethod(value);
                          setFieldError("paymentMethod", undefined);
                        }}
                      >
                        <SelectTrigger
                          className={`h-11 rounded-xl border-slate-200 bg-white ${
                            errors.paymentMethod ? inputErrorClass : ""
                          }`}
                        >
                          <SelectValue placeholder="Sélectionner une méthode" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.paymentMethod && (
                        <p className="text-xs font-medium text-red-600">
                          {errors.paymentMethod}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Date *
                      </Label>
                      <div className="relative">
                        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          type="date"
                          value={date}
                          onChange={(e) => {
                            setDate(e.target.value);
                            clearError("date");
                          }}
                          onBlur={() => setFieldError("date", validateDate())}
                          className={`h-11 rounded-xl border-slate-200 bg-white pl-10 ${
                            errors.date ? inputErrorClass : ""
                          }`}
                        />
                      </div>
                      {errors.date && (
                        <p className="text-xs font-medium text-red-600">
                          {errors.date}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl text-slate-900">
                    Description
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      Détails de la dépense *
                    </Label>
                    <Textarea
                      placeholder="Ex: Achat de fournitures de bureau pour l’équipe finance..."
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        clearError("description");
                      }}
                      onBlur={() =>
                        setFieldError("description", validateDescription())
                      }
                      rows={6}
                      className={`rounded-2xl border-slate-200 bg-white ${
                        errors.description ? inputErrorClass : ""
                      }`}
                    />
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={
                          errors.description ? "text-red-600 font-medium" : "text-slate-400"
                        }
                      >
                        {errors.description
                          ? errors.description
                          : "Décrivez clairement l’objectif de cette dépense."}
                      </span>
                      <span
                        className={
                          description.trim().length > MAX_DESCRIPTION_LENGTH
                            ? "font-medium text-red-600"
                            : "text-slate-400"
                        }
                      >
                        {description.trim().length}/{MAX_DESCRIPTION_LENGTH}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl text-slate-900">
                    Justificatif
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  {!receiptPreview ? (
                    <label
                      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition ${
                        errors.receipt
                          ? "border-red-400 bg-red-50"
                          : "border-slate-300 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/40"
                      }`}
                    >
                      <div className="rounded-2xl bg-white p-3 shadow-sm">
                        <Upload className="h-5 w-5 text-slate-600" />
                      </div>
                      <p className="mt-4 text-sm font-medium text-slate-800">
                        Glissez votre fichier ici ou cliquez pour importer
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        PNG, JPG ou PDF — max {MAX_FILE_SIZE_MB} MB
                      </p>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl bg-white p-3 shadow-sm">
                            {receiptPreview.isImage ? (
                              <ImageIcon className="h-5 w-5 text-indigo-600" />
                            ) : (
                              <FileText className="h-5 w-5 text-indigo-600" />
                            )}
                          </div>

                          <div>
                            <p className="font-medium text-slate-900">
                              {receiptPreview.name}
                            </p>
                            <p className="text-sm text-slate-500">
                              {receiptPreview.sizeKb} KB
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={removeReceipt}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {receiptPreview.isImage && receiptPreviewUrl && (
                        <div className="mt-4 overflow-hidden rounded-xl border bg-white">
                          <img
                            src={receiptPreviewUrl}
                            alt="Preview"
                            className="max-h-80 w-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {errors.receipt && (
                    <p className="text-xs font-medium text-red-600">
                      {errors.receipt}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6 xl:col-span-4">
              <Card className="sticky top-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl text-slate-900">
                    Résumé de soumission
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div className="rounded-2xl bg-slate-900 p-5 text-white">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Wallet className="h-4 w-4" />
                      Montant
                    </div>
                    <div className="mt-3 text-4xl font-bold tracking-tight">
                      {formatMoney(Number.isFinite(numericAmount) ? numericAmount : 0, currency)}
                    </div>
                    <div className="mt-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                      En attente d’approbation
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <BriefcaseBusiness className="h-4 w-4" />
                      Détails
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Entreprise</span>
                        <span className="font-medium text-slate-900">
                          {currentBusiness.name}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Catégorie</span>
                        <span className="font-medium text-slate-900">
                          {category || "-"}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Paiement</span>
                        <span className="font-medium text-slate-900">
                          {paymentMethod || "-"}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Date</span>
                        <span className="font-medium text-slate-900">
                          {date || "-"}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Soumis par</span>
                        <span className="font-medium text-slate-900">
                          {submittedByLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <CreditCard className="h-4 w-4" />
                      Conseils
                    </div>
                    <ul className="space-y-2 text-sm text-slate-600">
                      <li>• Vérifie le montant exact</li>
                      <li>• Ajoute une description claire</li>
                      <li>• Joins un justificatif si possible</li>
                      <li>• Choisis la bonne catégorie</li>
                    </ul>
                  </div>

                  <div className="space-y-3 pt-2">
                    <Button
                      type="submit"
                      className="h-11 w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Enregistrer la dépense
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full rounded-xl border-slate-200"
                      onClick={() => navigate("/dashboard/expenses")}
                      disabled={loading}
                    >
                      Annuler
                    </Button>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    Cette dépense sera associée à l’entreprise sélectionnée et pourra être approuvée ou rejetée selon les permissions.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}