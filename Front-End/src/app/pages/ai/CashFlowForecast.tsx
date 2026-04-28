import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

import { useBusinessContext } from '@/shared/contexts/BusinessContext';
import {
  CashFlowForecastApi,
  type CashFlowForecastResponse,
  type ForecastRisk,
} from '@/shared/lib/services/cashFlowForecast';

type Horizon = 30 | 60 | 90;

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function CashFlowForecast() {
  const { currentBusiness } = useBusinessContext();
  const [horizon, setHorizon] = useState<Horizon>(30);
  const [data, setData] = useState<CashFlowForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const currency = currentBusiness?.currency ?? 'TND';
  const formatMoney = (value: number) => `${value.toFixed(2)} ${currency}`;

  useEffect(() => {
    const businessId = currentBusiness?.id;
    if (!businessId) {
      setData(null);
      return;
    }

    const loadForecast = async () => {
      try {
        setLoading(true);
        const result = await CashFlowForecastApi.get(horizon);
        setData(result);
      } catch (e: any) {
        setData(null);
        toast.error('Forecast error', {
          description: e?.message || 'Unable to load cash flow forecast',
        });
      } finally {
        setLoading(false);
      }
    };

    loadForecast();
  }, [horizon, currentBusiness?.id]);

  const chartData = useMemo(() => {
    if (!data?.points?.length) return [];
    return data.points.map((p) => ({
      ...p,
      dateLabel: new Date(p.date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
      }),
    }));
  }, [data]);

  const summary = data?.summary;
  const hasInsufficientData =
    data?.modelSource === 'insufficient-data' || data?.debug?.insufficientData === true;

  const riskVariant = (risk?: ForecastRisk) => {
    if (risk === 'high') return 'bg-red-100 text-red-700';
    if (risk === 'medium') return 'bg-amber-100 text-amber-700';
    return 'bg-emerald-100 text-emerald-700';
  };

  const netTrend = n(summary?.expectedNet);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Cash Flow Forecast</h1>
          <p className="mt-1 text-sm text-slate-600">
            Projected inflow, outflow, and cumulative balance for the next {horizon} days.
          </p>
        </div>

        <div className="w-full sm:w-[200px]">
          <Select value={String(horizon)} onValueChange={(v) => setHorizon(Number(v) as Horizon)}>
            <SelectTrigger>
              <SelectValue placeholder="Select horizon" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Next 30 days</SelectItem>
              <SelectItem value="60">Next 60 days</SelectItem>
              <SelectItem value="90">Next 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-xl border bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : !data ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            No forecast data available.
          </CardContent>
        </Card>
      ) : (
        <>
          {hasInsufficientData && (
            <Card className="border-amber-200 bg-amber-50/60">
              <CardContent className="py-6 text-sm text-amber-900">
                No prediction yet for this tenant. Add paid invoices or approved expenses to build
                enough history for forecasting.
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600">Expected Inflow</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatMoney(n(summary?.expectedInflow))}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600">Expected Outflow</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-rose-600">
                  {formatMoney(n(summary?.expectedOutflow))}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600">Expected Net</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {netTrend >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-rose-600" />
                  )}
                  <p
                    className={`text-2xl font-bold ${netTrend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                  >
                    {formatMoney(netTrend)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600">Model Confidence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold text-slate-900">
                    {(n(summary?.confidence) * 100).toFixed(0)}%
                  </p>
                  <Badge className={riskVariant(summary?.risk)}>
                    {summary?.risk?.toUpperCase()} RISK
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-slate-500">Source: {data.modelSource}</p>
              </CardContent>
            </Card>
          </div>

          {data.debug && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-700">Runtime Diagnostics</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600">
                <div className="grid gap-1 md:grid-cols-2 xl:grid-cols-4">
                  <p>
                    ML configured:{' '}
                    <span className="font-semibold">{String(data.debug.mlConfigured)}</span>
                  </p>
                  <p>
                    ML attempted:{' '}
                    <span className="font-semibold">{String(data.debug.mlAttempted)}</span>
                  </p>
                  <p>
                    ML used: <span className="font-semibold">{String(data.debug.mlUsed)}</span>
                  </p>
                  <p>
                    Fallback used:{' '}
                    <span className="font-semibold">{String(data.debug.fallbackUsed)}</span>
                  </p>
                  <p>
                    History points:{' '}
                    <span className="font-semibold">{data.debug.historyPoints}</span>
                  </p>
                  <p>
                    History start:{' '}
                    <span className="font-semibold">{data.debug.historyStart ?? '-'}</span>
                  </p>
                  <p>
                    History end:{' '}
                    <span className="font-semibold">{data.debug.historyEnd ?? '-'}</span>
                  </p>
                  <p>
                    ML error: <span className="font-semibold">{data.debug.mlError ?? 'none'}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Activity className="h-5 w-5 text-indigo-600" />
                Projected Balance Curve
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dateLabel" minTickGap={24} />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number, name) => [formatMoney(n(value)), String(name)]}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="projectedBalance"
                      name="Projected balance"
                      stroke="#4f46e5"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Inflow vs Outflow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dateLabel" minTickGap={24} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatMoney(n(value))} />
                    <Legend />
                    <Bar
                      dataKey="predictedInflow"
                      name="Inflow"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="predictedOutflow"
                      name="Outflow"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
