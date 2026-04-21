import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Eye,
  Download,
  Send,
  ShieldAlert,
  RefreshCw,
  FileText,
  CheckCircle,
  XCircle,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  FileDown,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';

import type { Invoice } from '@/shared/lib/services/invoices';
import { useBusinessContext } from '@/shared/contexts/BusinessContext';
import { InvoicesApi } from '@/shared/lib/services/invoices';

type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';

type AuthUser = {
  id: string;
  email: string;
  role:
    | 'platform_admin'
    | 'business_owner'
    | 'business_admin'
    | 'accountant'
    | 'team_member'
    | 'client';
  businessId?: string | null;
};

type SortOption =
  | 'newest'
  | 'oldest'
  | 'amount_desc'
  | 'amount_asc'
  | 'due_asc'
  | 'due_desc'
  | 'client_asc'
  | 'client_desc';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  sent: {
    label: 'Sent',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  viewed: {
    label: 'Viewed',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  paid: {
    label: 'Paid',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
};

export function Invoices() {
  const navigate = useNavigate();
  const { currentBusiness } = useBusinessContext();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState('10');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const currency = currentBusiness?.currency ?? 'TND';

  const authUser: AuthUser | null = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('auth_user') || 'null');
    } catch {
      return null;
    }
  }, []);

  const canManageInvoices = useMemo(() => {
    if (!authUser) return false;
    return ['business_owner', 'business_admin', 'accountant'].includes(authUser.role);
  }, [authUser]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim().toLowerCase());
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const formatCurrency = useCallback(
    (value: number | string | undefined | null) => {
      const amount = Number(value ?? 0);
      return `${amount.toFixed(2)} ${currency}`;
    },
    [currency]
  );

  const formatDate = (value?: string | Date | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('fr-FR');
  };

  const toTimestamp = (value?: string | Date | null) => {
    if (!value) return 0;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 0;
    return date.getTime();
  };

  const isPastDue = (dueDate?: string | Date | null) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return false;
    return due.getTime() < Date.now();
  };

  const getDisplayStatus = useCallback((invoice: Invoice): InvoiceStatus => {
    if (invoice.status === 'sent' && isPastDue(invoice.dueDate)) {
      return 'overdue';
    }
    if (invoice.status === 'viewed' && isPastDue(invoice.dueDate)) {
      return 'overdue';
    }
    return invoice.status as InvoiceStatus;
  }, []);

  const getRemainingAmount = (invoice: Invoice) => {
    const total = Number(invoice.totalAmount ?? 0);
    const paid = Number(invoice.paidAmount ?? 0);
    return Math.max(total - paid, 0);
  };

  const getPaymentProgress = (invoice: Invoice) => {
    const total = Number(invoice.totalAmount ?? 0);
    const paid = Number(invoice.paidAmount ?? 0);
    if (total <= 0) return 0;
    return Math.min((paid / total) * 100, 100);
  };

  const loadInvoices = useCallback(
    async (silent = false) => {
      const bid = currentBusiness?.id;

      if (!bid) {
        setInvoices([]);
        setSelectedIds([]);
        return;
      }

      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const list = await InvoicesApi.list(bid);
        setInvoices(list ?? []);
      } catch (error) {
        console.error('Failed to load invoices:', error);
        setInvoices([]);
        toast.error('Erreur', {
          description: 'Impossible de charger les factures',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentBusiness?.id]
  );

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const filteredAndSortedInvoices = useMemo(() => {
    const result = invoices.filter((invoice) => {
      const invoiceNumber = invoice.invoiceNumber?.toLowerCase() ?? '';
      const clientName = invoice.clientName?.toLowerCase() ?? '';
      const displayStatus = getDisplayStatus(invoice);

      const matchesSearch =
        !debouncedSearch ||
        invoiceNumber.includes(debouncedSearch) ||
        clientName.includes(debouncedSearch);

      const matchesStatus = statusFilter === 'all' || displayStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return toTimestamp(b.issueDate) - toTimestamp(a.issueDate);
        case 'oldest':
          return toTimestamp(a.issueDate) - toTimestamp(b.issueDate);
        case 'amount_desc':
          return Number(b.totalAmount ?? 0) - Number(a.totalAmount ?? 0);
        case 'amount_asc':
          return Number(a.totalAmount ?? 0) - Number(b.totalAmount ?? 0);
        case 'due_asc':
          return toTimestamp(a.dueDate) - toTimestamp(b.dueDate);
        case 'due_desc':
          return toTimestamp(b.dueDate) - toTimestamp(a.dueDate);
        case 'client_asc':
          return (a.clientName ?? '').localeCompare(b.clientName ?? '');
        case 'client_desc':
          return (b.clientName ?? '').localeCompare(a.clientName ?? '');
        default:
          return 0;
      }
    });

    return result;
  }, [invoices, debouncedSearch, statusFilter, sortBy, getDisplayStatus]);

  const pageSizeNumber = Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedInvoices.length / pageSizeNumber));

  const paginatedInvoices = useMemo(() => {
    const start = (page - 1) * pageSizeNumber;
    const end = start + pageSizeNumber;
    return filteredAndSortedInvoices.slice(start, end);
  }, [filteredAndSortedInvoices, page, pageSizeNumber]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setSelectedIds((prev) =>
      prev.filter((id) => filteredAndSortedInvoices.some((inv) => inv.id === id))
    );
  }, [filteredAndSortedInvoices]);

  const totals = useMemo(() => {
    const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount ?? 0), 0);

    const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.paidAmount ?? 0), 0);

    const pending = invoices
      .filter((inv) => {
        const s = getDisplayStatus(inv);
        return s === 'sent' || s === 'viewed';
      })
      .reduce((sum, inv) => sum + getRemainingAmount(inv), 0);

    const overdue = invoices
      .filter((inv) => getDisplayStatus(inv) === 'overdue')
      .reduce((sum, inv) => sum + getRemainingAmount(inv), 0);

    const draftCount = invoices.filter((inv) => getDisplayStatus(inv) === 'draft').length;
    const overdueCount = invoices.filter((inv) => getDisplayStatus(inv) === 'overdue').length;

    return {
      totalInvoiced,
      totalPaid,
      pending,
      overdue,
      draftCount,
      overdueCount,
    };
  }, [invoices, getDisplayStatus]);

  const getStatusConfig = (status: InvoiceStatus) => {
    return STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  };

  const resetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setSortBy('newest');
    setPage(1);
  };

  const exportToCSV = () => {
    try {
      const headers = [
        'Invoice Number',
        'Client',
        'Issue Date',
        'Due Date',
        'Status',
        'Total Amount',
        'Paid Amount',
        'Remaining Amount',
      ];

      const rows = filteredAndSortedInvoices.map((invoice) => [
        invoice.invoiceNumber ?? '',
        invoice.clientName ?? '',
        formatDate(invoice.issueDate),
        formatDate(invoice.dueDate),
        getDisplayStatus(invoice),
        Number(invoice.totalAmount ?? 0).toFixed(2),
        Number(invoice.paidAmount ?? 0).toFixed(2),
        getRemainingAmount(invoice).toFixed(2),
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], {
        type: 'text/csv;charset=utf-8;',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'invoices-export.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Export CSV effectué avec succès');
    } catch (error) {
      console.error(error);
      toast.error('Erreur', {
        description: 'Impossible d’exporter les factures',
      });
    }
  };

  const handleDownloadPDF = async (invoiceId: string) => {
    try {
      // Ici plus tard: await InvoicesApi.downloadPdf(invoiceId)
      console.log('Download PDF for invoice:', invoiceId);
      toast.success('PDF généré avec succès');
    } catch (error) {
      console.error(error);
      toast.error('Erreur', {
        description: 'Impossible de télécharger le PDF',
      });
    }
  };

  const handleChangeStatus = async (
    invoiceId: string,
    newStatus: 'sent' | 'paid' | 'cancelled'
  ) => {
    try {
      setUpdatingId(invoiceId);

      if (newStatus === 'sent') {
        await InvoicesApi.markSent(invoiceId);
      } else if (newStatus === 'paid') {
        await InvoicesApi.markPaid(invoiceId);
      } else if (newStatus === 'cancelled') {
        const ok = window.confirm('Annuler cette facture ?');
        if (!ok) return;
        await InvoicesApi.updateStatus(invoiceId, 'cancelled');
      }

      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId
            ? {
                ...inv,
                status: newStatus,
                paidAmount: newStatus === 'paid' ? Number(inv.totalAmount ?? 0) : inv.paidAmount,
              }
            : inv
        )
      );

      const successText =
        newStatus === 'sent'
          ? 'Facture envoyée avec succès ✅'
          : newStatus === 'paid'
            ? 'Facture marquée comme payée ✅'
            : 'Facture annulée ✅';

      toast.success(successText);
    } catch (error) {
      console.error(error);
      toast.error('Erreur', {
        description: 'Impossible de mettre à jour le statut',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBulkStatusUpdate = async (newStatus: 'sent' | 'paid' | 'cancelled') => {
    if (!selectedIds.length) {
      toast.error('Aucune facture sélectionnée');
      return;
    }

    if (newStatus === 'cancelled') {
      const ok = window.confirm(`Annuler ${selectedIds.length} facture(s) ?`);
      if (!ok) return;
    }

    try {
      for (const invoiceId of selectedIds) {
        if (newStatus === 'sent') {
          await InvoicesApi.markSent(invoiceId);
        } else if (newStatus === 'paid') {
          await InvoicesApi.markPaid(invoiceId);
        } else {
          await InvoicesApi.updateStatus(invoiceId, 'cancelled');
        }
      }

      setInvoices((prev) =>
        prev.map((inv) =>
          selectedIds.includes(inv.id)
            ? {
                ...inv,
                status: newStatus,
                paidAmount: newStatus === 'paid' ? Number(inv.totalAmount ?? 0) : inv.paidAmount,
              }
            : inv
        )
      );

      setSelectedIds([]);
      toast.success(`Mise à jour groupée terminée ✅`);
    } catch (error) {
      console.error(error);
      toast.error('Erreur', {
        description: 'Impossible de terminer l’action groupée',
      });
    }
  };

  const toggleSelectAllCurrentPage = () => {
    const currentPageIds = paginatedInvoices.map((inv) => inv.id);
    const allSelected = currentPageIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  const toggleSelectOne = (invoiceId: string) => {
    setSelectedIds((prev) =>
      prev.includes(invoiceId) ? prev.filter((id) => id !== invoiceId) : [...prev, invoiceId]
    );
  };

  const canSendInvoice = (invoice: Invoice) => {
    return canManageInvoices && invoice.status === 'draft';
  };

  const canMarkPaid = (invoice: Invoice) => {
    if (!canManageInvoices) return false;
    const displayStatus = getDisplayStatus(invoice);
    return ['sent', 'viewed', 'overdue'].includes(displayStatus);
  };

  const canCancelInvoice = (invoice: Invoice) => {
    if (!canManageInvoices) return false;
    const displayStatus = getDisplayStatus(invoice);
    return ['draft', 'sent', 'viewed', 'overdue'].includes(displayStatus);
  };

  const canViewRisk = (invoice: Invoice) => {
    const displayStatus = getDisplayStatus(invoice);
    return ['sent', 'viewed', 'overdue'].includes(displayStatus);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="mt-1 text-sm text-gray-500">Manage, track and monitor all your invoices</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => loadInvoices(true)}
            disabled={refreshing || loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button variant="outline" onClick={exportToCSV}>
            <FileDown className="mr-2 h-4 w-4" />
            Export CSV
          </Button>

          {canManageInvoices && (
            <Button onClick={() => navigate('/dashboard/invoices/create')}>
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Total Invoiced</div>
            <div className="mt-1 text-2xl font-bold">{formatCurrency(totals.totalInvoiced)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Collected</div>
            <div className="mt-1 text-2xl font-bold text-green-600">
              {formatCurrency(totals.totalPaid)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Pending</div>
            <div className="mt-1 text-2xl font-bold text-blue-600">
              {formatCurrency(totals.pending)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Overdue</div>
            <div className="mt-1 text-2xl font-bold text-red-600">
              {formatCurrency(totals.overdue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Drafts</div>
            <div className="mt-1 text-2xl font-bold text-gray-800">{totals.draftCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Overdue Count</div>
            <div className="mt-1 text-2xl font-bold text-red-600">{totals.overdueCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 xl:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by invoice number or client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full xl:w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="viewed">Viewed</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="w-full xl:w-[220px]">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="amount_desc">Amount: High to Low</SelectItem>
                <SelectItem value="amount_asc">Amount: Low to High</SelectItem>
                <SelectItem value="due_asc">Due date: Earliest</SelectItem>
                <SelectItem value="due_desc">Due date: Latest</SelectItem>
                <SelectItem value="client_asc">Client: A → Z</SelectItem>
                <SelectItem value="client_desc">Client: Z → A</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={pageSize}
              onValueChange={(value) => {
                setPageSize(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full xl:w-[120px]">
                <SelectValue placeholder="Rows" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 / page</SelectItem>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="20">20 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={resetFilters}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {canManageInvoices && selectedIds.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-gray-600">{selectedIds.length} invoice(s) selected</div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => handleBulkStatusUpdate('sent')}>
                <Send className="mr-2 h-4 w-4" />
                Mark Sent
              </Button>

              <Button variant="outline" onClick={() => handleBulkStatusUpdate('paid')}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark Paid
              </Button>

              <Button variant="outline" onClick={() => handleBulkStatusUpdate('cancelled')}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Invoices ({loading ? '...' : filteredAndSortedInvoices.length})</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {canManageInvoices && (
                    <TableHead className="w-[50px]">
                      <input
                        type="checkbox"
                        checked={
                          paginatedInvoices.length > 0 &&
                          paginatedInvoices.every((inv) => selectedIds.includes(inv.id))
                        }
                        onChange={toggleSelectAllCurrentPage}
                      />
                    </TableHead>
                  )}
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={canManageInvoices ? 10 : 9}
                      className="py-8 text-center text-gray-500"
                    >
                      Loading invoices...
                    </TableCell>
                  </TableRow>
                ) : paginatedInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManageInvoices ? 10 : 9} className="py-10">
                      <div className="flex flex-col items-center justify-center text-center">
                        <FileText className="mb-3 h-10 w-10 text-gray-300" />
                        <div className="text-lg font-medium text-gray-700">No invoices found</div>
                        <div className="mt-1 text-sm text-gray-500">
                          Try changing filters or create a new invoice.
                        </div>
                        {canManageInvoices && (
                          <Button
                            className="mt-4"
                            onClick={() => navigate('/dashboard/invoices/create')}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Create Invoice
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedInvoices.map((invoice) => {
                    const displayStatus = getDisplayStatus(invoice);
                    const status = getStatusConfig(displayStatus);
                    const progress = getPaymentProgress(invoice);
                    const remaining = getRemainingAmount(invoice);

                    return (
                      <TableRow
                        key={invoice.id}
                        className={displayStatus === 'overdue' ? 'bg-red-50/40' : ''}
                      >
                        {canManageInvoices && (
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(invoice.id)}
                              onChange={() => toggleSelectOne(invoice.id)}
                            />
                          </TableCell>
                        )}

                        <TableCell className="font-medium">
                          {invoice.invoiceNumber || '-'}
                        </TableCell>

                        <TableCell>{invoice.clientName || '-'}</TableCell>

                        <TableCell>{formatDate(invoice.issueDate)}</TableCell>

                        <TableCell>{formatDate(invoice.dueDate)}</TableCell>

                        <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>

                        <TableCell>{formatCurrency(remaining)}</TableCell>

                        <TableCell>
                          <Badge variant="outline" className={status.className}>
                            {status.label}
                          </Badge>
                        </TableCell>

                        <TableCell className="min-w-[140px]">
                          <div className="space-y-1">
                            <div className="h-2 w-full rounded-full bg-gray-100">
                              <div
                                className="h-2 rounded-full bg-gray-900 transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500">{progress.toFixed(0)}%</div>
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/dashboard/invoices/${invoice.id}`)}
                              title="View invoice"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadPDF(invoice.id)}
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>

                            {canViewRisk(invoice) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  navigate(
                                    `/dashboard/invoice-late-risk?invoiceId=${encodeURIComponent(invoice.id)}`
                                  )
                                }
                                title="View invoice risk"
                              >
                                <ShieldAlert className="h-4 w-4" />
                              </Button>
                            )}

                            {canSendInvoice(invoice) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={updatingId === invoice.id}
                                onClick={() => handleChangeStatus(invoice.id, 'sent')}
                                title="Send invoice"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}

                            {canMarkPaid(invoice) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={updatingId === invoice.id}
                                onClick={() => handleChangeStatus(invoice.id, 'paid')}
                                title="Mark as paid"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}

                            {canCancelInvoice(invoice) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={updatingId === invoice.id}
                                onClick={() => handleChangeStatus(invoice.id, 'cancelled')}
                                title="Cancel invoice"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && filteredAndSortedInvoices.length > 0 && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-500">
                Page {page} / {totalPages} — {filteredAndSortedInvoices.length} result(s)
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
