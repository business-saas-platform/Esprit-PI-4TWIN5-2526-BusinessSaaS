import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  DollarSign,
  FileText,
  Receipt,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  Target,
  ChevronRight,
  Loader2,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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
  email?: string;
  totalRevenue?: number;
  outstandingBalance?: number;
};

type AIInsight = {
  id: string;
  title: string;
  description: string;
  type: "prediction" | "warning" | "recommendation" | "opportunity";
  category: string;
  confidence: number;
  actionable: boolean;
  action?: string;
};

const CHART_COLORS = ["#10b981", "#3b82f6", "#ef4444", "#6b7280", "#8b5cf6"];

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function Dashboard() {
  const navigate = useNavigate();
  const { currentBusiness } = useBusinessContext();

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
          description: e?.message || "Impossible de charger le dashboard",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentBusiness?.id]);

  const paidInvoices = useMemo(
    () => invoices.filter((inv) => inv.status === "paid"),
    [invoices]
  );

  const pendingInvoices = useMemo(
    () => invoices.filter((inv) => inv.status === "sent" || inv.status === "overdue"),
    [invoices]
  );

  const approvedExpenses = useMemo(
    () => expenses.filter((exp) => exp.status === "approved"),
    [expenses]
  );

  const totalRevenue = useMemo(() => {
    return paidInvoices.reduce(
      (sum, inv) => sum + n(inv.paidAmount || inv.totalAmount || 0),
      0
    );
  }, [paidInvoices]);

  const pendingRevenue = useMemo(() => {
    return pendingInvoices.reduce(
      (sum, inv) => sum + n(inv.totalAmount),
      0
    );
  }, [pendingInvoices]);

  const totalExpenses = useMemo(() => {
    return approvedExpenses.reduce((sum, exp) => sum + n(exp.amount), 0);
  }, [approvedExpenses]);

  const totalClients = clients.length;

  const monthlyTrendData = useMemo(() => {
    const months: {
      key: string;
      month: string;
      revenue: number;
      expenses: number;
    }[] = [];

    const now = new Date();
    const start = new Date();
    start.setMonth(now.getMonth() - 5);
    start.setDate(1);

    for (let i = 0; i < 6; i++) {
      const d = new Date(start);
      d.setMonth(start.getMonth() + i);

      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        month: d.toLocaleDateString("fr-FR", { month: "short" }),
        revenue: 0,
        expenses: 0,
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

    return months;
  }, [paidInvoices, approvedExpenses]);

  const invoiceStatusData = useMemo(() => {
    return [
      {
        name: "Paid",
        value: invoices.filter((i) => i.status === "paid").length,
        color: "#10b981",
      },
      {
        name: "Sent",
        value: invoices.filter((i) => i.status === "sent").length,
        color: "#3b82f6",
      },
      {
        name: "Overdue",
        value: invoices.filter((i) => i.status === "overdue").length,
        color: "#ef4444",
      },
      {
        name: "Draft",
        value: invoices.filter((i) => i.status === "draft").length,
        color: "#6b7280",
      },
    ].filter((x) => x.value > 0);
  }, [invoices]);

  const recentInvoices = useMemo(() => {
    return [...invoices]
      .sort((a, b) => {
        const da = new Date(a.issueDate).getTime();
        const db = new Date(b.issueDate).getTime();
        return db - da;
      })
      .slice(0, 5);
  }, [invoices]);

  const topClients = useMemo(() => {
    return [...clients]
      .map((client) => ({
        ...client,
        totalInvoiced: n(client.totalRevenue),
        outstanding: n(client.outstandingBalance),
      }))
      .sort((a, b) => b.totalInvoiced - a.totalInvoiced)
      .slice(0, 5);
  }, [clients]);

  const aiInsights = useMemo<AIInsight[]>(() => {
    const insights: AIInsight[] = [];

    if (pendingRevenue > 0) {
      insights.push({
        id: "pending-revenue",
        title: "Pending revenue detected",
        description: `You have ${formatMoney(
          pendingRevenue
        )} still waiting to be collected from unpaid invoices.`,
        type: "warning",
        category: "cash_flow",
        confidence: 92,
        actionable: true,
        action: "Review invoices",
      });
    }

    if (totalRevenue > totalExpenses) {
      insights.push({
        id: "positive-margin",
        title: "Business profitability is positive",
        description: `Your current revenue is above approved expenses by ${formatMoney(
          totalRevenue - totalExpenses
        )}.`,
        type: "prediction",
        category: "profitability",
        confidence: 88,
        actionable: false,
      });
    }

    const overdueCount = invoices.filter((i) => i.status === "overdue").length;
    if (overdueCount > 0) {
      insights.push({
        id: "overdue-alert",
        title: "Overdue invoices need follow-up",
        description: `You currently have ${overdueCount} overdue invoice(s). Following up may improve cash flow.`,
        type: "recommendation",
        category: "collections",
        confidence: 95,
        actionable: true,
        action: "Open invoices",
      });
    }

    if (clients.length >= 3) {
      insights.push({
        id: "client-opportunity",
        title: "Strong client base opportunity",
        description: `You already manage ${clients.length} clients. Consider expanding invoice automation and recurring billing.`,
        type: "opportunity",
        category: "growth",
        confidence: 81,
        actionable: true,
        action: "View clients",
      });
    }

    return insights.slice(0, 3);
  }, [pendingRevenue, totalRevenue, totalExpenses, invoices, clients]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "prediction":
        return TrendingUp;
      case "warning":
        return AlertTriangle;
      case "recommendation":
        return Lightbulb;
      case "opportunity":
        return Target;
      default:
        return Sparkles;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case "prediction":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "warning":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "recommendation":
        return "text-purple-600 bg-purple-50 border-purple-200";
      case "opportunity":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  if (!currentBusiness) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          Aucune entreprise sélectionnée. Créez ou sélectionnez une entreprise.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your business performance —{" "}
          <span className="font-medium">{currentBusiness.name}</span>
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center gap-3 p-8 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading dashboard...
          </CardContent>
        </Card>
      ) : (
        <>
          {/* AI Insights Banner */}
          <div className="rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="rounded-lg bg-white/20 p-2 backdrop-blur-sm">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">AI-Powered Business Insights</h3>
                  <p className="mt-1 text-sm text-white/90">
                    Your assistant analyzed your live business data and found{" "}
                    {aiInsights.length} actionable insight(s).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatMoney(totalRevenue)}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Paid invoices only
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Revenue</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatMoney(pendingRevenue)}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {pendingInvoices.length} unpaid invoice(s)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatMoney(totalExpenses)}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Approved expenses only
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalClients}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Active client records
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue & Expenses Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
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
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Invoice Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {invoiceStatusData.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    No invoices yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={invoiceStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        dataKey="value"
                      >
                        {invoiceStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Insights Section */}
          <Card className="border-2 border-indigo-200 bg-gradient-to-br from-white to-indigo-50/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                  <CardTitle>AI Business Insights</CardTitle>
                </div>
                <Badge className="bg-indigo-100 text-indigo-700">Powered by AI</Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {aiInsights.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    No AI insights available yet
                  </div>
                ) : (
                  aiInsights.map((insight) => {
                    const Icon = getInsightIcon(insight.type);
                    const colorClass = getInsightColor(insight.type);

                    return (
                      <div
                        key={insight.id}
                        className={`rounded-lg border-2 p-4 transition-all hover:shadow-md ${colorClass}`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="rounded-lg bg-white/80 p-2">
                            <Icon className="h-5 w-5" />
                          </div>

                          <div className="flex-1">
                            <div className="mb-2 flex items-start justify-between">
                              <h4 className="font-semibold text-gray-900">
                                {insight.title}
                              </h4>
                              <Badge variant="secondary" className="ml-2">
                                {insight.confidence}% confident
                              </Badge>
                            </div>

                            <p className="mb-3 text-sm text-gray-700">
                              {insight.description}
                            </p>

                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-xs capitalize">
                                {insight.type} • {insight.category.replace("_", " ")}
                              </Badge>

                              {insight.actionable && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8"
                                  onClick={() => {
                                    if (insight.id === "pending-revenue" || insight.id === "overdue-alert") {
                                      navigate("/dashboard/invoices");
                                    } else if (insight.id === "client-opportunity") {
                                      navigate("/dashboard/clients");
                                    } else {
                                      navigate("/dashboard/reports");
                                    }
                                  }}
                                >
                                  {insight.action}
                                  <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-4 text-center">
                <p className="mb-2 text-sm text-gray-500">
                  AI insights are generated from your real business activity.
                </p>
                <p className="text-xs text-gray-400">
                  Better data quality gives better recommendations.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Invoices</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/dashboard/invoices")}
                  className="text-indigo-600"
                >
                  View All <ArrowUpRight className="ml-1 h-4 w-4" />
                </Button>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {recentInvoices.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      No invoices yet
                    </div>
                  ) : (
                    recentInvoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between border-b pb-3 last:border-0"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-gray-500">
                            {invoice.clientName || "Unknown client"}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-medium">
                            {formatMoney(n(invoice.totalAmount))}
                          </p>
                          <span
                            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                              invoice.status === "paid"
                                ? "bg-green-100 text-green-800"
                                : invoice.status === "sent"
                                ? "bg-blue-100 text-blue-800"
                                : invoice.status === "overdue"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {invoice.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Top Clients</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/dashboard/clients")}
                  className="text-indigo-600"
                >
                  View All <ArrowUpRight className="ml-1 h-4 w-4" />
                </Button>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {topClients.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      No clients yet
                    </div>
                  ) : (
                    topClients.map((client) => (
                      <div
                        key={client.id}
                        className="flex items-center justify-between border-b pb-3 last:border-0"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{client.name}</p>
                          <p className="text-sm text-gray-500">{client.email || "-"}</p>
                        </div>

                        <div className="text-right">
                          <p className="font-medium">
                            {formatMoney(client.totalInvoiced)}
                          </p>
                          {client.outstanding > 0 && (
                            <p className="text-xs text-orange-600">
                              Outstanding: {formatMoney(client.outstanding)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Button
                  onClick={() => navigate("/dashboard/invoices/create")}
                  className="w-full"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  New Invoice
                </Button>

                <Button
                  onClick={() => navigate("/dashboard/expenses/create")}
                  variant="outline"
                  className="w-full"
                >
                  <Receipt className="mr-2 h-4 w-4" />
                  Add Expense
                </Button>

                <Button
                  onClick={() => navigate("/dashboard/clients")}
                  variant="outline"
                  className="w-full"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Manage Clients
                </Button>

                <Button
                  onClick={() => navigate("/dashboard/reports")}
                  variant="outline"
                  className="w-full"
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  View Reports
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}