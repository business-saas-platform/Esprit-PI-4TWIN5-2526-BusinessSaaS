import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Building2, Users, TrendingUp, Activity, Loader2 } from "lucide-react";
import { api } from "@/shared/lib/apiClient";
import { BusinessOwnersApi, type BusinessOwnerRow } from "@/shared/lib/services/businessOwners";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

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

type UsagePoint = {
  date: string;
  totalTime: number;
  apiCalls: number;
};

export function AdminOverview() {
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [owners, setOwners] = useState<BusinessOwnerRow[]>([]);

  useEffect(() => {
    loadOverview();
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
      status: business?.status || "unassigned",
      plan: business?.plan || "custom",
      email: business?.email || "",
      name: business?.name || "Untitled business",
      createdAt: business?.createdAt || "",
      subscriptionStartDate: business?.subscriptionStartDate || null,
      subscriptionEndDate: business?.subscriptionEndDate || null,
    };
  };

  const loadOverview = async () => {
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
      console.error("Failed to load admin overview:", error);
      setBusinesses([]);
      setOwners([]);
    } finally {
      setLoading(false);
    }
  };

  const totalBusinesses = businesses.length;
  const activeBusinesses = businesses.filter((b) => b.status === "active").length;
  const trialBusinesses = businesses.filter((b) => b.status === "trial").length;
  const suspendedBusinesses = businesses.filter((b) => b.status === "suspended").length;

  const totalOwners = owners.length;

  const totalRevenue = owners.reduce(
    (sum, owner: any) => sum + Number(owner.totalRevenue || 0),
    0
  );

  const totalApiCalls = owners.reduce(
    (sum, owner: any) => sum + Number(owner.totalApiCalls || 0),
    0
  );

  const usageByDate = useMemo(() => {
    const grouped = owners.reduce((acc, owner: any) => {
      const date =
        owner.joinedAt
          ? new Date(owner.joinedAt).toLocaleDateString("en-CA")
          : "Unknown";

      const existing = acc.find((item) => item.date === date);

      if (existing) {
        existing.totalTime += Number(owner.totalUsageMinutes || 0);
        existing.apiCalls += Number(owner.totalApiCalls || 0);
      } else {
        acc.push({
          date,
          totalTime: Number(owner.totalUsageMinutes || 0),
          apiCalls: Number(owner.totalApiCalls || 0),
        });
      }

      return acc;
    }, [] as UsagePoint[]);

    return grouped.sort((a, b) => a.date.localeCompare(b.date));
  }, [owners]);

  const businessesByPlan = useMemo(() => {
    return businesses.reduce((acc, business) => {
      const plan = business.plan || "custom";
      const existing = acc.find((item) => item.plan === plan);

      if (existing) {
        existing.count += 1;
      } else {
        acc.push({ plan, count: 1 });
      }

      return acc;
    }, [] as { plan: string; count: number }[]);
  }, [businesses]);

  const activeRate =
    totalBusinesses > 0 ? ((activeBusinesses / totalBusinesses) * 100).toFixed(0) : "0";

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading platform overview...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platform Overview</h1>
          <p className="mt-2 text-gray-600">
            Monitor and manage your Business Management SaaS platform
          </p>
        </div>

        <button
          onClick={loadOverview}
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Businesses
            </CardTitle>
            <Building2 className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalBusinesses}</div>
            <p className="mt-1 text-xs text-gray-500">
              {activeBusinesses} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Business Owners
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalOwners}</div>
            <p className="mt-1 text-xs text-gray-500">
              Platform users with role business_owner
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {totalRevenue.toLocaleString()} TND
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Across all business owners
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Platform Activity
            </CardTitle>
            <Activity className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {totalApiCalls.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Total API calls
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Usage Time by Join Date</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={usageByDate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="totalTime"
                  stroke="#6366f1"
                  strokeWidth={2}
                  name="Total Time (min)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Businesses by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={businessesByPlan}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="plan" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" name="Businesses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b py-3">
              <div>
                <p className="font-medium text-gray-900">Active Businesses</p>
                <p className="text-sm text-gray-500">
                  Businesses currently using the platform
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">{activeBusinesses}</p>
                <p className="text-xs text-gray-500">{activeRate}% of total</p>
              </div>
            </div>

            <div className="flex items-center justify-between border-b py-3">
              <div>
                <p className="font-medium text-gray-900">Trial Businesses</p>
                <p className="text-sm text-gray-500">
                  Businesses in trial period
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-yellow-600">
                  {trialBusinesses}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900">Suspended Businesses</p>
                <p className="text-sm text-gray-500">
                  Businesses temporarily suspended
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-red-600">
                  {suspendedBusinesses}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}