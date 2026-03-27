import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { Clock, Activity, TrendingUp, Users, Loader2 } from "lucide-react";
import { api } from "@/shared/lib/apiClient";
import {
  BusinessOwnersApi,
  type BusinessOwnerRow,
} from "@/shared/lib/services/businessOwners";

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

type BusinessRow = {
  id: string;
  name: string;
  email?: string;
  status?: string;
  plan?: string;
  createdAt?: string;
  ownerId?: string;
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
};

type UsageByBusinessRow = {
  name: string;
  time: number;
  apiCalls: number;
};

type DailyUsageRow = {
  date: string;
  time: number;
  users: number;
  invoices: number;
};

export function Analytics() {
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [owners, setOwners] = useState<BusinessOwnerRow[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const getStoredUser = () => {
    try {
      return JSON.parse(localStorage.getItem("auth_user") || "{}");
    } catch {
      return {};
    }
  };

  const getBusinessId = () => {
    const user = getStoredUser();

    return (
      localStorage.getItem("current_business_id") ||
      localStorage.getItem("businessId") ||
      user?.businessId ||
      ""
    );
  };

  const normalizeBusiness = (business: any): BusinessRow => {
    return {
      ...business,
      name: business?.name || "Untitled business",
      email: business?.email || "",
      status: business?.status || "unassigned",
      plan: business?.plan || "custom",
      createdAt: business?.createdAt || "",
      subscriptionStartDate: business?.subscriptionStartDate || null,
      subscriptionEndDate: business?.subscriptionEndDate || null,
    };
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const businessId = getBusinessId();

      const [businessesData, ownersData] = await Promise.all([
        api<BusinessRow[]>("/businesses/all", {
          method: "GET",
          headers: {
            ...(businessId ? { "x-business-id": businessId } : {}),
          },
        }),
        BusinessOwnersApi.listAll(),
      ]);

      setBusinesses(
        Array.isArray(businessesData)
          ? businessesData.map(normalizeBusiness)
          : []
      );

      setOwners(Array.isArray(ownersData) ? ownersData : []);
    } catch (error) {
      console.error("Failed to load analytics:", error);
      setBusinesses([]);
      setOwners([]);
    } finally {
      setLoading(false);
    }
  };

  const totalUsageTime = owners.reduce(
    (sum, owner: any) => sum + Number(owner.totalUsageMinutes || 0),
    0
  );

  const avgUsageTime =
    owners.length > 0 ? (totalUsageTime / owners.length).toFixed(0) : "0";

  const totalApiCalls = owners.reduce(
    (sum, owner: any) => sum + Number(owner.totalApiCalls || 0),
    0
  );

  const activeUsers = owners.filter(
    (owner) => Number(owner.businessCount || 0) > 0
  ).length;

  const usageByBusiness = useMemo(() => {
    return businesses
      .map((business) => {
        const owner = owners.find((o) => o.id === business.ownerId);

        return {
          name:
            business.name.length > 15
              ? `${business.name.substring(0, 15)}...`
              : business.name,
          time: Number((owner as any)?.totalUsageMinutes || 0),
          apiCalls: Number((owner as any)?.totalApiCalls || 0),
        };
      })
      .filter((item) => item.time > 0 || item.apiCalls > 0);
  }, [businesses, owners]);

  const planDistribution = useMemo(() => {
    return businesses.reduce((acc, business) => {
      const key = business.plan || "custom";
      const existing = acc.find((item) => item.name === key);

      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: key, value: 1 });
      }

      return acc;
    }, [] as { name: string; value: number }[]);
  }, [businesses]);

  const statusDistribution = useMemo(() => {
    return businesses.reduce((acc, business) => {
      const key = business.status || "unassigned";
      const existing = acc.find((item) => item.name === key);

      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: key, value: 1 });
      }

      return acc;
    }, [] as { name: string; value: number }[]);
  }, [businesses]);

  const dailyUsage = useMemo(() => {
    const rows = owners.reduce((acc, owner: any) => {
      const date = owner.joinedAt
        ? new Date(owner.joinedAt).toLocaleDateString("en-CA")
        : "Unknown";

      const existing = acc.find((item) => item.date === date);

      if (existing) {
        existing.time += Number(owner.totalUsageMinutes || 0);
        existing.users += 1;
        existing.invoices += Number(owner.totalInvoices || 0);
      } else {
        acc.push({
          date,
          time: Number(owner.totalUsageMinutes || 0),
          users: 1,
          invoices: Number(owner.totalInvoices || 0),
        });
      }

      return acc;
    }, [] as DailyUsageRow[]);

    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }, [owners]);

  const topBusinesses = [...usageByBusiness]
    .sort((a, b) => b.time - a.time)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platform Analytics</h1>
          <p className="mt-2 text-gray-600">
            Comprehensive usage analytics and insights
          </p>
        </div>

        <button
          onClick={loadAnalytics}
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Usage Time
            </CardTitle>
            <Clock className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalUsageTime} min</div>
            <p className="mt-1 text-xs text-gray-500">
              Avg: {avgUsageTime} min/owner
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total API Calls
            </CardTitle>
            <Activity className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {totalApiCalls.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Platform-wide requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Businesses
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{activeUsers}</div>
            <p className="mt-1 text-xs text-gray-500">
              With linked owners/businesses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Owners
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{owners.length}</div>
            <p className="mt-1 text-xs text-gray-500">
              Platform users
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Usage Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyUsage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="time"
                  stroke="#6366f1"
                  strokeWidth={2}
                  name="Usage Time (min)"
                />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="Active Users"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Businesses by Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topBusinesses} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="time" fill="#6366f1" name="Usage Time (min)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={planDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {planDistribution.map((entry, index) => (
                    <Cell
                      key={`plan-cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell
                      key={`status-cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Calls by Business</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={usageByBusiness}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="apiCalls" fill="#8b5cf6" name="API Calls" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}