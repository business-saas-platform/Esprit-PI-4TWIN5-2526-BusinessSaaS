import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Download,
  TrendingUp,
  TrendingDown,
  Loader2,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { useBusinessContext } from "@/shared/contexts/BusinessContext";
import { InvoicesApi, type Invoice } from "@/shared/lib/services/invoices";
import { ExpensesApi } from "@/shared/lib/services/expenses";
import { ClientsApi } from "@/shared/lib/services/clients";

type Expense = {
  id: string;
  businessId?: string;
  date: string;
  amount: number;
  currency?: string;
  category: string;
  vendor?: string;
  description: string;
  paymentMethod?: string;
  status: "pending" | "approved" | "rejected";
  submittedBy?: string;
};

type Client = {
  id: string;
  name: string;
};

type PeriodValue = "1month" | "3months" | "6months" | "1year";

const CHART_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
  "#f97316",
];

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function Reports() {
  const { currentBusiness } = useBusinessContext();
  const [period, setPeriod] = useState<PeriodValue>("6months");

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  const currency = currentBusiness?.currency ?? "TND";

  const formatMoney = (value: number) => `${value.toFixed(2)} ${currency}`;

  useEffect(() => {
    const bid = currentBusiness?.id;
    if (!bid) {
      setInvoices([]);
      setExpenses([]);
      setClients([]);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);

        const [invoiceList, expenseList, clientList] = await Promise.all([
          InvoicesApi.list(bid),
          ExpensesApi.list(bid),
          ClientsApi.list(bid),
        ]);

        setInvoices(invoiceList ?? []);
        setExpenses((expenseList as Expense[]) ?? []);
        setClients((clientList as Client[]) ?? []);
      } catch (e: any) {
        setInvoices([]);
        setExpenses([]);
        setClients([]);
        toast.error("Erreur", {
          description: e?.message || "Impossible de charger les rapports",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentBusiness?.id]);

  const monthsToKeep = useMemo(() => {
    switch (period) {
      case "1month":
        return 1;
      case "3months":
        return 3;
      case "6months":
        return 6;
      case "1year":
        return 12;
      default:
        return 6;
    }
  }, [period]);

  const periodStartDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - (monthsToKeep - 1));
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [monthsToKeep]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const issueDate = new Date(inv.issueDate);
      return !Number.isNaN(issueDate.getTime()) && issueDate >= periodStartDate;
    });
  }, [invoices, periodStartDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const d = new Date(exp.date);
      return !Number.isNaN(d.getTime()) && d >= periodStartDate;
    });
  }, [expenses, periodStartDate]);

  const paidInvoices = useMemo(() => {
    return filteredInvoices.filter((inv) => inv.status === "paid");
  }, [filteredInvoices]);

  const approvedExpenses = useMemo(() => {
    return filteredExpenses.filter((exp) => exp.status === "approved");
  }, [filteredExpenses]);

  const totalRevenue = useMemo(() => {
    return paidInvoices.reduce(
      (sum, inv) => sum + n(inv.paidAmount || inv.totalAmount || 0),
      0
    );
  }, [paidInvoices]);

  const totalExpenses = useMemo(() => {
    return approvedExpenses.reduce((sum, exp) => sum + n(exp.amount), 0);
  }, [approvedExpenses]);

  const profitLoss = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (profitLoss / totalRevenue) * 100 : 0;

  const monthlyData = useMemo(() => {
    const months: {
      key: string;
      month: string;
      revenue: number;
      expenses: number;
      profit: number;
    }[] = [];

    const base = new Date(periodStartDate);

    for (let i = 0; i < monthsToKeep; i++) {
      const d = new Date(base);
      d.setMonth(base.getMonth() + i);

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const month = d.toLocaleDateString("fr-FR", { month: "short" });

      months.push({
        key,
        month,
        revenue: 0,
        expenses: 0,
        profit: 0,
      });
    }

    paidInvoices.forEach((inv) => {
      const d = new Date(inv.issueDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const item = months.find((m) => m.key === key);
      if (item) {
        item.revenue += n(inv.paidAmount || inv.totalAmount || 0);
      }
    });

    approvedExpenses.forEach((exp) => {
      const d = new Date(exp.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const item = months.find((m) => m.key === key);
      if (item) {
        item.expenses += n(exp.amount);
      }
    });

    months.forEach((m) => {
      m.profit = m.revenue - m.expenses;
    });

    return months;
  }, [paidInvoices, approvedExpenses, monthsToKeep, periodStartDate]);

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();

    approvedExpenses.forEach((exp) => {
      const key = exp.category || "Other";
      map.set(key, (map.get(key) || 0) + n(exp.amount));
    });

    return Array.from(map.entries())
      .map(([name, value], index) => ({
        name,
        value,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [approvedExpenses]);

  const revenueByClient = useMemo(() => {
    const clientMap = new Map<string, number>();

    paidInvoices.forEach((inv) => {
      const key = inv.clientId || "unknown";
      clientMap.set(key, (clientMap.get(key) || 0) + n(inv.paidAmount || inv.totalAmount || 0));
    });

    return Array.from(clientMap.entries())
      .map(([clientId, revenue]) => {
        const client = clients.find((c) => c.id === clientId);
        return {
          name: client?.name || "Unknown Client",
          revenue,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [paidInvoices, clients]);

  const handleExportCSV = () => {
    try {
      const rows = [
        ["Metric", "Value"],
        ["Period", period],
        ["Total Revenue", totalRevenue.toFixed(2)],
        ["Total Expenses", totalExpenses.toFixed(2)],
        ["Net Profit", profitLoss.toFixed(2)],
        ["Profit Margin %", profitMargin.toFixed(2)],
        [],
        ["Month", "Revenue", "Expenses", "Profit"],
        ...monthlyData.map((m) => [
          m.month,
          m.revenue.toFixed(2),
          m.expenses.toFixed(2),
          m.profit.toFixed(2),
        ]),
      ];

      const csv = rows
        .map((row) => row.map((cell) => `"${String(cell ?? "")}"`).join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reports-${period}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Export CSV généré ✅");
    } catch {
      toast.error("Impossible d’exporter le CSV");
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  if (!currentBusiness) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-sm text-gray-500">
          Aucune entreprise sélectionnée. Créez ou sélectionnez une entreprise.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Financial reports and business insights —{" "}
            <span className="font-medium">{currentBusiness.name}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodValue)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>

          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center gap-3 p-8 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading reports...
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Key metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Revenue</p>
                    <p className="mt-1 text-2xl font-bold">{formatMoney(totalRevenue)}</p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-3">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">Paid invoices only</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Expenses</p>
                    <p className="mt-1 text-2xl font-bold">{formatMoney(totalExpenses)}</p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3">
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">Approved expenses only</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Net Profit</p>
                    <p className="mt-1 text-2xl font-bold">{formatMoney(profitLoss)}</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-3">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <p
                  className={`mt-2 text-xs ${
                    profitLoss >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {profitLoss >= 0 ? "Positive result" : "Negative result"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Profit Margin</p>
                    <p className="mt-1 text-2xl font-bold">{profitMargin.toFixed(1)}%</p>
                  </div>
                  <div className="rounded-lg bg-indigo-50 p-3">
                    <BarChart3 className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">Profit / Revenue</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Profit & Loss Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Revenue"
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="#ef4444"
                      strokeWidth={2}
                      name="Expenses"
                    />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Profit"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {expenseByCategory.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    No approved expenses in this period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={expenseByCategory}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value.toFixed(0)}`}
                        outerRadius={100}
                        dataKey="value"
                      >
                        {expenseByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Client (Top 5)</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueByClient.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    No paid invoices in this period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueByClient} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={150} />
                      <Tooltip />
                      <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue vs Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                    <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed P&L Statement */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Profit & Loss Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between border-b pb-2">
                  <span className="font-semibold">Revenue</span>
                  <span className="font-semibold text-green-600">
                    {formatMoney(totalRevenue)}
                  </span>
                </div>

                <div className="space-y-2 pl-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Paid Invoices</span>
                    <span>{formatMoney(totalRevenue)}</span>
                  </div>
                </div>

                <div className="flex justify-between border-b pb-2 pt-2">
                  <span className="font-semibold">Expenses</span>
                  <span className="font-semibold text-red-600">
                    {formatMoney(totalExpenses)}
                  </span>
                </div>

                <div className="space-y-2 pl-4">
                  {expenseByCategory.length === 0 ? (
                    <div className="text-sm text-gray-500">No approved expenses</div>
                  ) : (
                    expenseByCategory.map((cat) => (
                      <div key={cat.name} className="flex justify-between text-sm">
                        <span className="text-gray-600">{cat.name}</span>
                        <span>{formatMoney(cat.value)}</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex justify-between border-t-2 pt-4">
                  <span className="text-lg font-bold">Net Profit</span>
                  <span
                    className={`text-lg font-bold ${
                      profitLoss >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatMoney(profitLoss)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}