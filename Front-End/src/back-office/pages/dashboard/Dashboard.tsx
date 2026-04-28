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
} from "lucide-react";

import {
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

import { apiGet } from "@/shared/lib/apiClient";
import { useBusinessContext } from "@/shared/contexts/BusinessContext";
import { useAuth } from "@/shared/contexts/AuthContext";

type Invoice = {
  id: string;
  invoiceNumber?: string;
  clientName?: string;
  status?: "paid" | "sent" | "overdue" | "draft" | string;
  total?: number;
  paidAmount?: number;
};

type Expense = {
  id: string;
  status?: "approved" | "pending" | "rejected" | string;
  amount?: number;
};

type Client = {
  id: string;
  name?: string;
  email?: string;
  totalInvoiced?: number;
  outstandingBalance?: number;
};

type AIInsight = {
  id: string;
  title: string;
  description: string;
  type: "prediction" | "warning" | "recommendation" | "opportunity" | string;
  category: string;
  confidence: number;
  actionable?: boolean;
  action?: string;
};

export function Dashboard() {
  const navigate = useNavigate();
  const { currentBusinessId, currentBusiness } = useBusinessContext();
  const { isReady: authReady, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);

  useEffect(() => {
    if (!authReady) return;
    if (!user) return;

    // if member has businessId in token -> ok
    // if owner must select a business -> currentBusinessId must exist
    if (!currentBusinessId && user.role === "business_owner") return;

    const run = async () => {
      setLoading(true);
      try {
        const [inv, exp, cli] = await Promise.all([
          apiGet<Invoice[]>("/invoices"),
          apiGet<Expense[]>("/expenses"),
          apiGet<Client[]>("/clients"),
        ]);

        setInvoices(inv ?? []);
        setExpenses(exp ?? []);
        setClients(cli ?? []);

        // optional AI insights (ignore if endpoint doesn't exist)
        try {
          const ai = await apiGet<AIInsight[]>("/ai-insights");
          setAiInsights(ai ?? []);
        } catch {
          setAiInsights([]);
        }
      } finally {
        setLoading(false);
      }
    };

    run().catch(() => setLoading(false));
  }, [authReady, user?.id, user?.role, currentBusinessId]);

  const totalRevenue = useMemo(() => {
    return invoices
      .filter((inv) => (inv.status || "").toLowerCase() === "paid")
      .reduce((sum, inv) => sum + Number(inv.paidAmount ?? inv.total ?? 0), 0);
  }, [invoices]);

  const pendingRevenue = useMemo(() => {
    return invoices
      .filter((inv) => {
        const s = (inv.status || "").toLowerCase();
        return s === "sent" || s === "overdue";
      })
      .reduce((sum, inv) => sum + Number(inv.total ?? 0), 0);
  }, [invoices]);

  const totalExpenses = useMemo(() => {
    return expenses
      .filter((exp) => (exp.status || "").toLowerCase() === "approved")
      .reduce((sum, exp) => sum + Number(exp.amount ?? 0), 0);
  }, [expenses]);

  const totalClients = clients.length;

  const invoiceStatusData = useMemo(() => {
    const count = (s: string) =>
      invoices.filter((i) => (i.status || "").toLowerCase() === s).length;

    return [
      { name: "Paid", value: count("paid"), color: "#10b981" },
      { name: "Sent", value: count("sent"), color: "#3b82f6" },
      { name: "Overdue", value: count("overdue"), color: "#ef4444" },
      { name: "Draft", value: count("draft"), color: "#6b7280" },
    ];
  }, [invoices]);

  const topAIInsights = useMemo(() => (aiInsights ?? []).slice(0, 3), [aiInsights]);

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
        return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
      case "warning":
        return "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";
      case "recommendation":
        return "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800";
      case "opportunity":
        return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
      default:
        return "text-muted-foreground bg-background border-border";
    }
  };

  // (optional) trend: if you have backend endpoint later, replace this.
  const revenueTrendData = [
    { month: "M-5", revenue: totalRevenue * 0.6, expenses: totalExpenses * 0.6 },
    { month: "M-4", revenue: totalRevenue * 0.7, expenses: totalExpenses * 0.7 },
    { month: "M-3", revenue: totalRevenue * 0.8, expenses: totalExpenses * 0.8 },
    { month: "M-2", revenue: totalRevenue * 0.9, expenses: totalExpenses * 0.9 },
    { month: "M-1", revenue: totalRevenue * 0.95, expenses: totalExpenses * 0.95 },
    { month: "Now", revenue: totalRevenue, expenses: totalExpenses },
  ];

  const recentInvoices = useMemo(() => invoices.slice(0, 5), [invoices]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Dashboard {currentBusiness?.name ? `— ${currentBusiness.name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your business performance
        </p>
      </div>

      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-lg p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-card/20 rounded-lg backdrop-blur-sm">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">AI-Powered Business Insights</h3>
              <p className="text-sm text-white/90 mt-1">
                {aiInsights.length
                  ? `Found ${aiInsights.length} actionable insights`
                  : "AI insights not configured yet"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toFixed(2)} TND</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              Revenue from paid invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Revenue</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRevenue.toFixed(2)} TND</div>
            <p className="text-xs text-muted-foreground mt-1">
              {invoices.filter((i) => ["sent", "overdue"].includes(String(i.status).toLowerCase())).length} unpaid invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExpenses.toFixed(2)} TND</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              Approved expenses
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
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              Total clients in this business
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue & Expenses Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={invoiceStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {invoiceStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card className="border-2 border-indigo-200 dark:border-indigo-900 bg-gradient-to-br from-card to-indigo-50/50 dark:to-indigo-900/20">
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
          {!topAIInsights.length ? (
            <div className="text-sm text-muted-foreground">No AI insights yet.</div>
          ) : (
            <div className="space-y-4">
              {topAIInsights.map((insight) => {
                const Icon = getInsightIcon(insight.type);
                const colorClass = getInsightColor(insight.type);
                return (
                  <div
                    key={insight.id}
                    className={`p-4 rounded-lg border-2 ${colorClass} transition-all hover:shadow-md`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-2 rounded-lg bg-card/80">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-foreground">{insight.title}</h4>
                          <Badge variant="secondary" className="ml-2">
                            {insight.confidence}% confident
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground mb-3">{insight.description}</p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs capitalize">
                            {insight.type} • {String(insight.category || "").replace("_", " ")}
                          </Badge>
                          {insight.actionable && (
                            <Button size="sm" variant="ghost" className="h-8">
                              {insight.action || "Open"}
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            {!recentInvoices.length ? (
              <div className="text-sm text-muted-foreground">No invoices yet.</div>
            ) : (
              <div className="space-y-4">
                {recentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{invoice.invoiceNumber ?? invoice.id}</p>
                      <p className="text-sm text-muted-foreground">{invoice.clientName ?? "-"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{Number(invoice.total ?? 0).toFixed(2)} TND</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">
                        {invoice.status ?? "unknown"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Clients */}
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
            {!clients.length ? (
              <div className="text-sm text-muted-foreground">No clients yet.</div>
            ) : (
              <div className="space-y-4">
                {clients
                  .sort((a, b) => Number(b.totalInvoiced ?? 0) - Number(a.totalInvoiced ?? 0))
                  .slice(0, 5)
                  .map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between border-b pb-3 last:border-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{client.name ?? "Client"}</p>
                        <p className="text-sm text-muted-foreground">{client.email ?? "-"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{Number(client.totalInvoiced ?? 0).toFixed(2)} TND</p>
                        {Number(client.outstandingBalance ?? 0) > 0 && (
                          <p className="text-xs text-orange-600">
                            Outstanding: {Number(client.outstandingBalance ?? 0).toFixed(2)} TND
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button onClick={() => navigate("/dashboard/invoices/create")} className="w-full">
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
              Add Client
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
    </div>
  );
}