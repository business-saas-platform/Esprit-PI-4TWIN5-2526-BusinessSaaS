import { useEffect, useMemo, useState } from "react";
import { AIService } from "@/shared/lib/services/ai";
import { useBusinessContext } from "@/shared/contexts/BusinessContext";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Receipt,
  AlertTriangle,
  Target,
  RefreshCw,
  Wallet,
  Sparkles,
  BarChart3,
} from "lucide-react";

type AISummary = {
  businessId: string;
  businessName: string;
  generatedAt: string;
  totalRevenue: number;
  totalExpenses: number;
  cashIn: number;
  cashOut: number;
  outstandingInvoices: number;
  overdueInvoices: number;
  avgInvoiceAmount: number;
  forecast30d: number;
  anomalyCount: number;
  highRiskInvoices: number;
  clientSegments: Record<string, number>;
  topRecommendations: string[];
};

function StatCard({
  title,
  value,
  icon,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-medium text-muted-foreground">{title}</div>
        <div className="rounded-xl bg-muted p-2 text-foreground">{icon}</div>
      </div>
      <div className="text-2xl font-bold tracking-tight text-foreground">
        {value}
      </div>
      {subtitle ? <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

function RiskBadge({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "red" | "amber" | "green" | "blue";
}) {
  const toneClass =
    tone === "red"
      ? "bg-red-50 text-red-700 border-red-200"
      : tone === "amber"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : tone === "green"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-blue-50 text-blue-700 border-blue-200";

  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClass}`}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function AIInsights() {
  const { currentBusinessId } = useBusinessContext();
  const [data, setData] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSummary = async (businessId: string) => {
    const summary = await AIService.getSummary(businessId);
    setData(summary);
  };

  const runAnalysis = async (showLoader = true) => {
    if (!currentBusinessId) return;

    try {
      setError("");
      if (showLoader) setLoading(true);

      await AIService.runAnalysis(currentBusinessId);
      await loadSummary(currentBusinessId);
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l’analyse AI.");
    } finally {
      setLoading(false);
      setBootLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!currentBusinessId) {
        setBootLoading(false);
        return;
      }

      try {
        setError("");
        await loadSummary(currentBusinessId);
      } catch {
        await runAnalysis(false);
      } finally {
        setBootLoading(false);
      }
    };

    init();
  }, [currentBusinessId]);

  const recommendationList = useMemo(() => {
    if (!data?.topRecommendations?.length) return [];
    return data.topRecommendations.filter(Boolean);
  }, [data]);

  const segmentEntries = useMemo(() => {
    if (!data?.clientSegments) return [];
    return Object.entries(data.clientSegments);
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-card/10 px-3 py-1 text-xs font-medium text-slate-100">
              <Brain className="h-4 w-4" />
              AI Business Intelligence
            </div>

            <h1 className="text-3xl font-bold tracking-tight">
              AI Insights
            </h1>

            <p className="mt-2 text-sm text-slate-300">
              Analyse intelligente de votre activité, détection de risques,
              recommandations automatiques et vision synthétique du business.
            </p>

            {data ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Business : <span className="font-semibold text-white">{data.businessName}</span>
                {" • "}Dernière génération : {formatDate(data.generatedAt)}
              </p>
            ) : null}
          </div>

          <button
            onClick={() => runAnalysis(true)}
            disabled={loading || !currentBusinessId}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-card px-5 py-3 font-semibold text-foreground shadow-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Analyse en cours..." : "Relancer l’analyse"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {bootLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl border border-border bg-muted"
            />
          ))}
        </div>
      ) : null}

      {!bootLoading && data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Revenue"
              value={`${formatMoney(data.totalRevenue)} TND`}
              icon={<TrendingUp className="h-5 w-5" />}
              subtitle="Revenus cumulés analysés"
            />
            <StatCard
              title="Total Expenses"
              value={`${formatMoney(data.totalExpenses)} TND`}
              icon={<TrendingDown className="h-5 w-5" />}
              subtitle="Dépenses détectées"
            />
            <StatCard
              title="Outstanding Invoices"
              value={data.outstandingInvoices}
              icon={<Receipt className="h-5 w-5" />}
              subtitle="Factures encore ouvertes"
            />
            <StatCard
              title="Average Invoice"
              value={`${formatMoney(data.avgInvoiceAmount)} TND`}
              icon={<Wallet className="h-5 w-5" />}
              subtitle="Montant moyen par facture"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Cash In"
              value={`${formatMoney(data.cashIn)} TND`}
              icon={<TrendingUp className="h-5 w-5" />}
              subtitle="Encaissements estimés"
            />
            <StatCard
              title="Cash Out"
              value={`${formatMoney(data.cashOut)} TND`}
              icon={<TrendingDown className="h-5 w-5" />}
              subtitle="Sorties de trésorerie"
            />
            <StatCard
              title="Forecast 30 Days"
              value={`${formatMoney(data.forecast30d)} TND`}
              icon={<BarChart3 className="h-5 w-5" />}
              subtitle="Prévision IA à 30 jours"
            />
            <StatCard
              title="Overdue Invoices"
              value={data.overdueInvoices}
              icon={<AlertTriangle className="h-5 w-5" />}
              subtitle="Factures en retard"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm xl:col-span-2">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    Recommandations AI
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Actions prioritaires proposées automatiquement.
                  </p>
                </div>
              </div>

              {recommendationList.length > 0 ? (
                <div className="space-y-3">
                  {recommendationList.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4"
                    >
                      <div className="mt-0.5 rounded-full bg-slate-900 px-2 py-1 text-xs font-bold text-white">
                        {index + 1}
                      </div>
                      <p className="text-sm leading-6 text-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                  Aucune recommandation disponible pour le moment.
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">
                      Risk Snapshot
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Résumé instantané des alertes.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3">
                  <RiskBadge
                    label="Anomalies"
                    value={data.anomalyCount}
                    tone={data.anomalyCount > 0 ? "red" : "green"}
                  />
                  <RiskBadge
                    label="High Risk Invoices"
                    value={data.highRiskInvoices}
                    tone={data.highRiskInvoices > 0 ? "amber" : "green"}
                  />
                  <RiskBadge
                    label="Overdue"
                    value={data.overdueInvoices}
                    tone={data.overdueInvoices > 0 ? "red" : "green"}
                  />
                  <RiskBadge
                    label="Open Invoices"
                    value={data.outstandingInvoices}
                    tone="blue"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">
                      Client Segments
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Répartition calculée par l’AI.
                    </p>
                  </div>
                </div>

                {segmentEntries.length > 0 ? (
                  <div className="space-y-3">
                    {segmentEntries.map(([segment, count]) => (
                      <div
                        key={segment}
                        className="flex items-center justify-between rounded-2xl bg-background px-4 py-3"
                      >
                        <span className="text-sm font-medium text-foreground">
                          {segment}
                        </span>
                        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
                    Aucun segment client disponible pour ce business.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-foreground">
                Financial Overview
              </h2>

              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Revenue</span>
                    <span className="font-semibold text-foreground">
                      {formatMoney(data.totalRevenue)} TND
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: "100%",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Expenses</span>
                    <span className="font-semibold text-foreground">
                      {formatMoney(data.totalExpenses)} TND
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-red-400"
                      style={{
                        width:
                          data.totalRevenue > 0
                            ? `${Math.min(
                                (data.totalExpenses / data.totalRevenue) * 100,
                                100
                              )}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Forecast 30d</span>
                    <span className="font-semibold text-foreground">
                      {formatMoney(data.forecast30d)} TND
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${
                        data.forecast30d >= 0 ? "bg-blue-500" : "bg-amber-500"
                      }`}
                      style={{
                        width:
                          data.totalRevenue > 0
                            ? `${Math.min(
                                Math.abs(data.forecast30d / data.totalRevenue) * 100,
                                100
                              )}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-foreground">
                AI Summary
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-background p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Business
                  </div>
                  <div className="mt-2 text-base font-bold text-foreground">
                    {data.businessName}
                  </div>
                </div>

                <div className="rounded-2xl bg-background p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Generated At
                  </div>
                  <div className="mt-2 text-base font-bold text-foreground">
                    {formatDate(data.generatedAt)}
                  </div>
                </div>

                <div className="rounded-2xl bg-background p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Cash Delta
                  </div>
                  <div className="mt-2 text-base font-bold text-foreground">
                    {formatMoney(data.cashIn - data.cashOut)} TND
                  </div>
                </div>

                <div className="rounded-2xl bg-background p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    AI Status
                  </div>
                  <div className="mt-2 text-base font-bold text-emerald-600">
                    Active
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {!bootLoading && !data && !error ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center shadow-sm">
          <Brain className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-bold text-foreground">
            Aucun résultat AI disponible
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Lance l’analyse pour générer les premiers insights de ce business.
          </p>
        </div>
      ) : null}
    </div>
  );
}
/*echo "# Saas_Project" >> README.md
git init
git add README.md
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/azizrahouej/Saas_Project.git
git push -u origin main*/