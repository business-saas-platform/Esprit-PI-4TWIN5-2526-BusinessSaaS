import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Badge } from "@/app/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/app/components/ui/alert-dialog";
import {
  Plus,
  Search,
  Check,
  X,
  Receipt,
  Loader2,
  Clock3,
  CircleCheckBig,
  Wallet,
  TrendingUp,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  CalendarRange,
  Ban,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";

import type { Expense } from "@/shared/lib/mockData";
import { useBusinessContext } from "@/shared/contexts/BusinessContext";
import { ExpensesApi } from "@/shared/lib/services/expenses";

type StatusFilter = "all" | "pending" | "approved" | "rejected";
type SortOption =
  | "date_desc"
  | "date_asc"
  | "amount_desc"
  | "amount_asc"
  | "status_asc"
  | "category_asc";
type DateFilter = "all" | "today" | "7days" | "30days" | "thisMonth";

type ExpenseStatus = "pending" | "approved" | "rejected";

const PAGE_SIZE = 8;

export function Expenses() {
  const navigate = useNavigate();
  const { currentBusiness } = useBusinessContext();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("date_desc");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [page, setPage] = useState(1);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const [approveTarget, setApproveTarget] = useState<Expense | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Expense | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const currency = currentBusiness?.currency ?? "TND";

  const formatMoney = (value?: number | string | null, curr?: string) => {
    const amount = Number(value ?? 0);

    return (
      new Intl.NumberFormat("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount) + ` ${curr || currency}`
    );
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("fr-FR");
  };

  const normalizeDate = (value?: string | null) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  };

  const isInDateRange = (expenseDate?: string | null, filter?: DateFilter) => {
    if (!filter || filter === "all") return true;

    const d = normalizeDate(expenseDate);
    if (!d) return false;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (filter === "today") {
      const expenseDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      return expenseDay.getTime() === todayStart.getTime();
    }

    if (filter === "7days") {
      const min = new Date(todayStart);
      min.setDate(min.getDate() - 7);
      return d >= min;
    }

    if (filter === "30days") {
      const min = new Date(todayStart);
      min.setDate(min.getDate() - 30);
      return d >= min;
    }

    if (filter === "thisMonth") {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }

    return true;
  };

  useEffect(() => {
    const bid = currentBusiness?.id;
    if (!bid) {
      setExpenses([]);
      return;
    }

    setIsLoading(true);
    ExpensesApi.list(bid)
      .then((list) => setExpenses(list ?? []))
      .catch(() => {
        setExpenses([]);
        toast.error("Erreur", {
          description: "Impossible de charger les dépenses.",
        });
      })
      .finally(() => setIsLoading(false));
  }, [currentBusiness?.id]);

  const categories = useMemo(() => {
    return Array.from(
      new Set(expenses.map((e) => e.category).filter(Boolean))
    ).sort();
  }, [expenses]);

  const getStatusBadgeClass = (status: ExpenseStatus) => {
    const variants: Record<ExpenseStatus, string> = {
      approved: "bg-green-100 text-green-700 border-green-200",
      pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
      rejected: "bg-red-100 text-red-700 border-red-200",
    };

    return variants[status];
  };

  const getStatusLabel = (status: ExpenseStatus) => {
    if (status === "approved") return "Approuvée";
    if (status === "rejected") return "Rejetée";
    return "En attente";
  };

  const filteredAndSortedExpenses = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    const filtered = expenses.filter((expense) => {
      const matchesSearch =
        !q ||
        expense.description?.toLowerCase().includes(q) ||
        expense.category?.toLowerCase().includes(q) ||
        (expense.vendor ?? "").toLowerCase().includes(q) ||
        (expense.submittedBy ?? "").toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" || expense.status === statusFilter;

      const matchesCategory =
        categoryFilter === "all" || expense.category === categoryFilter;

      const matchesDate = isInDateRange(expense.date, dateFilter);

      return matchesSearch && matchesStatus && matchesCategory && matchesDate;
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "date_asc":
          return (
            (normalizeDate(a.date)?.getTime() ?? 0) -
            (normalizeDate(b.date)?.getTime() ?? 0)
          );

        case "date_desc":
          return (
            (normalizeDate(b.date)?.getTime() ?? 0) -
            (normalizeDate(a.date)?.getTime() ?? 0)
          );

        case "amount_asc":
          return Number(a.amount ?? 0) - Number(b.amount ?? 0);

        case "amount_desc":
          return Number(b.amount ?? 0) - Number(a.amount ?? 0);

        case "status_asc":
          return (a.status ?? "").localeCompare(b.status ?? "");

        case "category_asc":
          return (a.category ?? "").localeCompare(b.category ?? "");

        default:
          return 0;
      }
    });

    return sorted;
  }, [expenses, searchTerm, statusFilter, categoryFilter, sortBy, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedExpenses.length / PAGE_SIZE));

  const paginatedExpenses = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredAndSortedExpenses.slice(start, start + PAGE_SIZE);
  }, [filteredAndSortedExpenses, page]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, categoryFilter, sortBy, dateFilter, currentBusiness?.id]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const summary = useMemo(() => {
    const total = expenses.reduce((sum, exp) => sum + Number(exp.amount ?? 0), 0);

    const approved = expenses
      .filter((e) => e.status === "approved")
      .reduce((sum, exp) => sum + Number(exp.amount ?? 0), 0);

    const pending = expenses
      .filter((e) => e.status === "pending")
      .reduce((sum, exp) => sum + Number(exp.amount ?? 0), 0);

    const rejected = expenses
      .filter((e) => e.status === "rejected")
      .reduce((sum, exp) => sum + Number(exp.amount ?? 0), 0);

    const average = expenses.length ? total / expenses.length : 0;

    const byCategory = expenses.reduce<Record<string, number>>((acc, exp) => {
      const key = exp.category || "Autre";
      acc[key] = (acc[key] || 0) + Number(exp.amount ?? 0);
      return acc;
    }, {});

    const topCategory =
      Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";

    return { total, approved, pending, rejected, average, topCategory };
  }, [expenses]);

  const handleApprove = async (expenseId: string) => {
    try {
      setUpdatingId(expenseId);

      const updated = await ExpensesApi.updateStatus(expenseId, "approved");

      setExpenses((prev) =>
        prev.map((e) => (e.id === expenseId ? updated : e))
      );

      toast.success("Dépense approuvée avec succès.");
    } catch (e: any) {
      toast.error("Erreur", {
        description: e?.message || "Échec de l’approbation.",
      });
    } finally {
      setUpdatingId(null);
      setApproveTarget(null);
    }
  };

  const handleReject = async (expenseId: string) => {
    try {
      setUpdatingId(expenseId);

      // Si ton backend supporte la raison de rejet,
      // remplace par quelque chose comme :
      // const updated = await ExpensesApi.updateStatus(expenseId, "rejected", rejectReason);
      const updated = await ExpensesApi.updateStatus(expenseId, "rejected");

      setExpenses((prev) =>
        prev.map((e) => (e.id === expenseId ? updated : e))
      );

      toast.success("Dépense rejetée avec succès.");
    } catch (e: any) {
      toast.error("Erreur", {
        description: e?.message || "Échec du rejet.",
      });
    } finally {
      setUpdatingId(null);
      setRejectTarget(null);
      setRejectReason("");
    }
  };

  const handleExportCsv = () => {
    try {
      const headers = [
        "Date",
        "Catégorie",
        "Description",
        "Fournisseur",
        "Montant",
        "Devise",
        "Soumis par",
        "Statut",
      ];

      const rows = filteredAndSortedExpenses.map((expense) => [
        formatDate(expense.date),
        expense.category ?? "",
        expense.description ?? "",
        expense.vendor ?? "",
        String(Number(expense.amount ?? 0)),
        expense.currency ?? currency,
        expense.submittedBy ?? "",
        expense.status ?? "",
      ]);

      const csvContent = [headers, ...rows]
        .map((row) =>
          row
            .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `expenses-${currentBusiness?.name || "business"}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Export CSV généré avec succès.");
    } catch {
      toast.error("Erreur", {
        description: "Impossible d’exporter le fichier CSV.",
      });
    }
  };

  if (!currentBusiness) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Dépenses</h1>
        <p className="text-sm text-gray-500">
          Aucune entreprise sélectionnée. Créez ou sélectionnez une entreprise.
        </p>
        <Button onClick={() => navigate("/dashboard/businesses/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Créer une entreprise
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Dépenses
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Gérez et suivez les dépenses de{" "}
              <span className="font-semibold text-gray-700">
                {currentBusiness.name}
              </span>
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={handleExportCsv}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>

            <Button onClick={() => navigate("/dashboard/expenses/create")}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une dépense
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Wallet className="h-4 w-4" />
                Total
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {formatMoney(summary.total)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <CircleCheckBig className="h-4 w-4" />
                Approuvées
              </div>
              <div className="mt-2 text-2xl font-bold text-green-600">
                {formatMoney(summary.approved)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock3 className="h-4 w-4" />
                En attente
              </div>
              <div className="mt-2 text-2xl font-bold text-yellow-600">
                {formatMoney(summary.pending)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Ban className="h-4 w-4" />
                Rejetées
              </div>
              <div className="mt-2 text-2xl font-bold text-red-600">
                {formatMoney(summary.rejected)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <TrendingUp className="h-4 w-4" />
                Catégorie principale
              </div>
              <div className="mt-2 text-lg font-bold text-gray-900">
                {summary.topCategory}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Moyenne: {formatMoney(summary.average)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-700">
              <Filter className="h-4 w-4" />
              Filtres
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="relative lg:col-span-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Rechercher par description, catégorie, fournisseur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="lg:col-span-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les catégories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="lg:col-span-2">
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="approved">Approuvées</SelectItem>
                    <SelectItem value="rejected">Rejetées</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="lg:col-span-2">
                <Select
                  value={dateFilter}
                  onValueChange={(v) => setDateFilter(v as DateFilter)}
                >
                  <SelectTrigger>
                    <CalendarRange className="mr-2 h-4 w-4 text-gray-400" />
                    <SelectValue placeholder="Période" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toute période</SelectItem>
                    <SelectItem value="today">Aujourd’hui</SelectItem>
                    <SelectItem value="7days">7 derniers jours</SelectItem>
                    <SelectItem value="30days">30 derniers jours</SelectItem>
                    <SelectItem value="thisMonth">Ce mois</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="lg:col-span-2">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger>
                    <ArrowUpDown className="mr-2 h-4 w-4 text-gray-400" />
                    <SelectValue placeholder="Trier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date_desc">Date ↓</SelectItem>
                    <SelectItem value="date_asc">Date ↑</SelectItem>
                    <SelectItem value="amount_desc">Montant ↓</SelectItem>
                    <SelectItem value="amount_asc">Montant ↑</SelectItem>
                    <SelectItem value="status_asc">Statut A→Z</SelectItem>
                    <SelectItem value="category_asc">Catégorie A→Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              Liste des dépenses ({isLoading ? "..." : filteredAndSortedExpenses.length})
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Date</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Soumis par</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-gray-500">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Chargement des dépenses...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : paginatedExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-14">
                        <div className="flex flex-col items-center justify-center text-center">
                          <Receipt className="mb-3 h-10 w-10 text-gray-300" />
                          <div className="text-lg font-medium text-gray-700">
                            Aucune dépense trouvée
                          </div>
                          <div className="mt-1 text-sm text-gray-500">
                            Ajoutez votre première dépense pour commencer le suivi.
                          </div>
                          <Button
                            className="mt-4"
                            onClick={() => navigate("/dashboard/expenses/create")}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Ajouter une dépense
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedExpenses.map((expense) => (
                      <TableRow key={expense.id} className="hover:bg-gray-50">
                        <TableCell>{formatDate(expense.date)}</TableCell>

                        <TableCell>
                          <Badge variant="outline">{expense.category || "-"}</Badge>
                        </TableCell>

                        <TableCell className="max-w-[260px] truncate font-medium text-gray-900">
                          {expense.description || "-"}
                        </TableCell>

                        <TableCell>{expense.vendor || "-"}</TableCell>

                        <TableCell className="font-semibold">
                          {formatMoney(expense.amount, expense.currency)}
                        </TableCell>

                        <TableCell>{expense.submittedBy || "-"}</TableCell>

                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getStatusBadgeClass(expense.status as ExpenseStatus)}
                          >
                            {getStatusLabel(expense.status as ExpenseStatus)}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedExpense(expense)}
                              title="Voir les détails"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {expense.status === "pending" ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={updatingId === expense.id}
                                  onClick={() => setApproveTarget(expense)}
                                  className="text-green-600 hover:text-green-700"
                                  title="Approuver"
                                >
                                  {updatingId === expense.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={updatingId === expense.id}
                                  onClick={() => setRejectTarget(expense)}
                                  className="text-red-600 hover:text-red-700"
                                  title="Rejeter"
                                >
                                  {updatingId === expense.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <X className="h-4 w-4" />
                                  )}
                                </Button>
                              </>
                            ) : (
                              <span className="px-2 text-sm text-gray-400">—</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {!isLoading && filteredAndSortedExpenses.length > 0 && (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-500">
                  Affichage de{" "}
                  <span className="font-medium text-gray-700">
                    {(page - 1) * PAGE_SIZE + 1}
                  </span>{" "}
                  à{" "}
                  <span className="font-medium text-gray-700">
                    {Math.min(page * PAGE_SIZE, filteredAndSortedExpenses.length)}
                  </span>{" "}
                  sur{" "}
                  <span className="font-medium text-gray-700">
                    {filteredAndSortedExpenses.length}
                  </span>{" "}
                  dépenses
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Précédent
                  </Button>

                  <div className="text-sm font-medium text-gray-700">
                    Page {page} / {totalPages}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Suivant
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense details dialog */}
      <Dialog open={!!selectedExpense} onOpenChange={() => setSelectedExpense(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Détails de la dépense</DialogTitle>
            <DialogDescription>
              Consultez les informations complètes de cette dépense.
            </DialogDescription>
          </DialogHeader>

          {selectedExpense && (
            <div className="grid grid-cols-1 gap-4 py-2">
              <div className="rounded-lg border p-4">
                <div className="mb-3 text-sm font-medium text-gray-500">Informations générales</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Date</span>
                    <span className="font-medium text-gray-900">
                      {formatDate(selectedExpense.date)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Catégorie</span>
                    <span className="font-medium text-gray-900">
                      {selectedExpense.category || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Montant</span>
                    <span className="font-semibold text-gray-900">
                      {formatMoney(selectedExpense.amount, selectedExpense.currency)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Statut</span>
                    <Badge
                      variant="outline"
                      className={getStatusBadgeClass(selectedExpense.status as ExpenseStatus)}
                    >
                      {getStatusLabel(selectedExpense.status as ExpenseStatus)}
                    </Badge>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Fournisseur</span>
                    <span className="font-medium text-gray-900">
                      {selectedExpense.vendor || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Soumis par</span>
                    <span className="font-medium text-gray-900">
                      {selectedExpense.submittedBy || "-"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="mb-3 text-sm font-medium text-gray-500">Description</div>
                <p className="text-sm leading-6 text-gray-700">
                  {selectedExpense.description || "Aucune description disponible."}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve confirm dialog */}
      <AlertDialog open={!!approveTarget} onOpenChange={() => setApproveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l’approbation</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment approuver cette dépense ?
              {approveTarget ? (
                <>
                  <br />
                  <span className="font-medium text-gray-700">
                    {approveTarget.description} —{" "}
                    {formatMoney(approveTarget.amount, approveTarget.currency)}
                  </span>
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => approveTarget && handleApprove(approveTarget.id)}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Rejeter la dépense</DialogTitle>
            <DialogDescription>
              Ajoutez une raison de rejet pour garder une trace claire.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {rejectTarget && (
              <div className="rounded-lg border p-3 text-sm text-gray-700">
                <div className="font-medium">{rejectTarget.description}</div>
                <div className="mt-1 text-gray-500">
                  {formatMoney(rejectTarget.amount, rejectTarget.currency)} •{" "}
                  {rejectTarget.category || "-"}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Raison du rejet
              </label>
              <Textarea
                placeholder="Ex: justificatif manquant, montant invalide, doublon..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-gray-500">
                Note: si ton backend ne stocke pas encore cette raison, garde ce champ
                pour l’UX puis ajoute-le plus tard dans l’API.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectTarget(null)}>
                Annuler
              </Button>
              <Button
                variant="destructive"
                disabled={!rejectTarget || updatingId === rejectTarget.id}
                onClick={() => rejectTarget && handleReject(rejectTarget.id)}
              >
                {updatingId === rejectTarget?.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rejet...
                  </>
                ) : (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Confirmer le rejet
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}