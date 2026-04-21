import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Loader2, AlertTriangle, ShieldAlert, CircleCheck } from 'lucide-react';
import { toast } from 'sonner';

import { useBusinessContext } from '@/shared/contexts/BusinessContext';
import {
  InvoiceLateRiskApi,
  type InvoiceLateRiskItem,
  type InvoiceRiskLevel,
  type InvoiceLateRiskResponse,
} from '@/shared/lib/services/invoiceLateRisk';

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function riskTone(level: InvoiceRiskLevel) {
  if (level === 'high') return 'bg-red-100 text-red-700 border-red-200';
  if (level === 'medium') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-emerald-100 text-emerald-700 border-emerald-200';
}

export function InvoiceLateRisk() {
  const { currentBusiness } = useBusinessContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<InvoiceLateRiskResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const selectedInvoiceId = searchParams.get('invoiceId') ?? '';

  const currency = currentBusiness?.currency ?? 'TND';
  const formatMoney = (value: number) => `${value.toFixed(2)} ${currency}`;

  useEffect(() => {
    const businessId = currentBusiness?.id;
    if (!businessId) {
      setData(null);
      return;
    }

    const loadRisk = async () => {
      try {
        setLoading(true);
        const result = await InvoiceLateRiskApi.get();
        setData(result);
      } catch (e: any) {
        setData(null);
        toast.error('Invoice risk error', {
          description: e?.message || 'Unable to load invoice late-payment risk',
        });
      } finally {
        setLoading(false);
      }
    };

    loadRisk();
  }, [currentBusiness?.id]);

  const topItems = useMemo<InvoiceLateRiskItem[]>(() => {
    if (!data?.items?.length) return [];
    if (!selectedInvoiceId) return data.items.slice(0, 15);

    const selected = data.items.find((x) => x.invoiceId === selectedInvoiceId);
    const rest = data.items.filter((x) => x.invoiceId !== selectedInvoiceId).slice(0, 14);
    return selected ? [selected, ...rest] : data.items.slice(0, 15);
  }, [data, selectedInvoiceId]);

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Invoice Late-Payment Risk</h1>
          <p className="mt-1 text-sm text-slate-600">
            Prioritized risk scoring for open invoices to improve collection focus.
          </p>
        </div>
      </div>

      {selectedInvoiceId && (
        <Card className="border-indigo-200 bg-indigo-50/70">
          <CardContent className="flex flex-col gap-3 py-4 text-sm text-indigo-900 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Focus mode enabled for invoice ID:{' '}
              <span className="font-semibold">{selectedInvoiceId}</span>
            </p>
            <button
              type="button"
              className="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
              onClick={() => setSearchParams({})}
            >
              Clear focus
            </button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-xl border bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : !data ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            No risk data available.
          </CardContent>
        </Card>
      ) : (
        <>
          {data.modelSource === 'no-open-invoices' && (
            <Card className="border-emerald-200 bg-emerald-50/60">
              <CardContent className="py-6 text-sm text-emerald-900">
                No open invoices detected for this tenant. Late-payment risk scoring is not needed
                now.
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600">Scored Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-900">{n(summary?.scoredInvoices)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600">High Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">{n(summary?.highRisk)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600">Medium Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-600">{n(summary?.mediumRisk)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600">Average Risk Score</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-indigo-600">
                  {(n(summary?.averageRisk) * 100).toFixed(1)}%
                </p>
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
                    Total invoices:{' '}
                    <span className="font-semibold">{data.debug.totalInvoices}</span>
                  </p>
                  <p>
                    Open invoices: <span className="font-semibold">{data.debug.openInvoices}</span>
                  </p>
                  <p className="md:col-span-2">
                    ML error: <span className="font-semibold">{data.debug.mlError ?? 'none'}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <ShieldAlert className="h-5 w-5 text-indigo-600" />
                Top Open Invoices By Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!topItems.length ? (
                <p className="text-sm text-slate-500">No open invoice risk items to display.</p>
              ) : (
                <div className="space-y-3">
                  {topItems.map((item) => (
                    <div
                      key={item.invoiceId}
                      className={`rounded-xl border bg-white p-4 shadow-sm ${
                        item.invoiceId === selectedInvoiceId
                          ? 'border-indigo-400 ring-2 ring-indigo-200'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {item.invoiceNumber} - {item.clientName}
                          </p>
                          <p className="text-xs text-slate-500">
                            Due {item.dueDate} - Amount {formatMoney(n(item.totalAmount))}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {item.riskLevel === 'high' ? (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          ) : item.riskLevel === 'medium' ? (
                            <ShieldAlert className="h-4 w-4 text-amber-600" />
                          ) : (
                            <CircleCheck className="h-4 w-4 text-emerald-600" />
                          )}
                          <Badge className={`border ${riskTone(item.riskLevel)}`}>
                            {item.riskLevel.toUpperCase()} {(item.riskScore * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      </div>

                      {item.reasons?.length ? (
                        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
                          {item.reasons.slice(0, 3).map((reason, idx) => (
                            <li key={`${item.invoiceId}-r-${idx}`}>{reason}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
