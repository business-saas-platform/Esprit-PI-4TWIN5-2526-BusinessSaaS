import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/shared/lib/apiClient';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Zap,
  TrendingUp,
  Users,
  Target,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Brain,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { useBusinessContext } from '@/shared/contexts/BusinessContext';
import { toast } from 'sonner';

type PredictionData = {
  success: boolean;
  businessContext?: {
    team: {
      currentSize: number;
      workloadPercent: number;
      invoicesPerMember: string | number;
      clientsPerMember: string | number;
    };
    finances: {
      totalRevenue: string;
      totalExpenses: string;
      monthlyExpenses: string;
      netProfit: string;
      growthRate: string;
      revenueThisMonth: string;
      revenueLastMonth: string;
    };
    operations: {
      totalClients: number;
      totalInvoices: number;
      pendingInvoices: number;
      pendingAmount: string;
    };
  };
  aiPredictions?: {
    workloadStatus: {
      percentage: number;
      level: 'critique' | 'élevé' | 'modéré' | 'optimal';
      message: string;
    };
    predictions: {
      thirtyDays: {
        urgency: 'critique' | 'haute' | 'moyenne' | 'faible';
        recommendation: string;
        hiringNeeded: boolean;
        roleNeeded: string | null;
        estimatedBudget: string | null;
        reason: string;
      };
      ninetyDays: {
        urgency: 'critique' | 'haute' | 'moyenne' | 'faible';
        recommendation: string;
        hiringNeeded: boolean;
        rolesNeeded: string[];
        estimatedBudget: string;
        projectedRevenue: string;
        reason: string;
      };
      sixMonths: {
        recommendation: string;
        idealTeamStructure: {
          description: string;
          roles: Array<{
            title: string;
            count: number;
            priority: 'haute' | 'moyenne' | 'faible';
          }>;
        };
        projectedRevenue: string;
        roiOfHiring: string;
      };
    };
    skillGaps?: Array<{
      skill: string;
      urgency: 'critique' | 'haute' | 'moyenne';
      impact: string;
    }>;
    hiringTimeline?: Array<{
      week: string;
      action: string;
      deadline: boolean;
    }>;
    budgetForecast?: {
      currentTeamCost: string;
      optimalTeamCost: string;
      canAffordHiring: boolean;
      reasoning: string;
    };
    overallScore?: {
      value: number;
      label: string;
      color: 'green' | 'yellow' | 'red';
    };
  };
  error?: string;
};

const getUrgencyColor = (urgency: string) => {
  switch (urgency) {
    case 'critique':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'haute':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'moyenne':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    default:
      return 'bg-green-100 text-green-800 border-green-300';
  }
};

const getScoreColor = (value: number) => {
  if (value >= 80) return { bg: 'from-green-500 to-emerald-600', text: 'text-green-600' };
  if (value >= 60) return { bg: 'from-yellow-500 to-orange-600', text: 'text-yellow-600' };
  return { bg: 'from-red-500 to-orange-600', text: 'text-red-600' };
};

export function TeamAIInsights() {
  const [data, setData] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { businessId } = useBusinessContext();

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      console.log('\n\n🔵 FETCHING TEAM AI PREDICTIONS');
      console.log('================================================');
      
      // Check token in localStorage
      const token = localStorage.getItem('access_token');
      console.log('📋 Token exists:', token ? '✓ YES' : '✗ NO');
      if (token) {
        console.log('📋 Token length:', token.length);
        console.log('📋 Token preview:', token.substring(0, 20) + '...');
      }
      
      // Show all localStorage keys
      const allKeys = Object.keys(localStorage);
      console.log('📋 All localStorage keys:', allKeys);
      allKeys.forEach(key => {
        const val = localStorage.getItem(key);
        console.log(`  - ${key}: ${val?.substring?.(0, 30) || val}${val?.length > 30 ? '...' : ''}`);
      });
      
      console.log('📋 Current businessId from context:', businessId);
      console.log('================================================\n');
      
      const result: PredictionData = await api<PredictionData>('/team-ai/predictions');
      console.log('✅ API Response:', result);
      setData(result);

      if (!result.success && result.error) {
        toast.error(result.error);
      } else if (result.success) {
        toast.success('Prédictions mises à jour');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('\n❌ ERROR FETCHING PREDICTIONS:');
      console.error('Error message:', errorMessage);
      console.error('Full error:', error);
      toast.error('Erreur lors du chargement des prédictions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, [businessId]);

  const context = data?.businessContext;
  const ai = data?.aiPredictions;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
        <p className="text-gray-600 text-lg">🤖 L'IA analyse vos données...</p>
      </div>
    );
  }

  if (!data || !context) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="border-red-300 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Pas assez de données pour générer les prédictions. Commencez par ajouter des factures, clients et membres d'équipe.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <Brain className="w-10 h-10 text-purple-600" />
            Prédictions IA pour l'équipe
          </h1>
          <p className="text-gray-600 mt-2">
            Basées sur vos données réelles • Mis à jour à {new Date().toLocaleTimeString('fr-FR')}
          </p>
        </div>
        <Button
          onClick={fetchPredictions}
          disabled={loading}
          className="gap-2 bg-purple-600 hover:bg-purple-700"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Error Banner */}
      {!data?.success && (
        <Alert className="border-yellow-300 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            🤖 Les prédictions IA ne sont pas disponibles. Les données calculées ci-dessous sont affichées.
          </AlertDescription>
        </Alert>
      )}

      {/* Overall Score + Workload Gauge */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Score Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              Score de l'équipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ai?.overallScore ? (
              <div className="flex flex-col items-center gap-4">
                <div
                  className={`w-40 h-40 rounded-full flex flex-col items-center justify-center text-white bg-gradient-to-br ${getScoreColor(ai.overallScore.value).bg}`}
                >
                  <span className="text-5xl font-bold">{ai.overallScore.value}</span>
                  <span className="text-sm">/100</span>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">{ai.overallScore.label}</p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-600">Score IA non disponible</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workload Gauge */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Charge de travail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Charge actuelle</span>
                  <span className="text-sm font-bold text-purple-600">
                    {ai?.workloadStatus?.percentage || context.team.workloadPercent}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${
                      (ai?.workloadStatus?.percentage || context.team.workloadPercent) > 80
                        ? 'bg-red-500'
                        : (ai?.workloadStatus?.percentage || context.team.workloadPercent) > 60
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min(ai?.workloadStatus?.percentage || context.team.workloadPercent, 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">Équipe actuelle</p>
                  <p className="text-2xl font-bold text-purple-600">{context.team.currentSize}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">Factures/membre</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {Number(context.team.invoicesPerMember).toFixed(1)}
                  </p>
                </div>
              </div>
              {ai?.workloadStatus?.message && (
                <p className="text-sm text-gray-600 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  {ai.workloadStatus.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3 Prediction Cards (30j / 90j / 6mois) */}
      {ai && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 30 Days */}
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <Clock className="w-5 h-5 text-orange-600" />
                <Badge className={getUrgencyColor(ai.predictions.thirtyDays.urgency)}>
                  {ai.predictions.thirtyDays.urgency}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-semibold text-gray-900 text-sm">30 Jours</p>
              <p className="text-sm text-gray-700">{ai.predictions.thirtyDays.recommendation}</p>
              {ai.predictions.thirtyDays.hiringNeeded && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-600 mb-1">Poste à recruter</p>
                  <p className="font-semibold text-purple-600">
                    {ai.predictions.thirtyDays.roleNeeded || 'À déterminer'}
                  </p>
                </div>
              )}
              {ai.predictions.thirtyDays.estimatedBudget && (
                <div className="pt-2">
                  <p className="text-xs text-gray-600 mb-1">Budget estimé</p>
                  <p className="font-semibold text-green-600">{ai.predictions.thirtyDays.estimatedBudget}</p>
                </div>
              )}
              <p className="text-xs text-gray-500 pt-2 border-t italic">
                {ai.predictions.thirtyDays.reason}
              </p>
            </CardContent>
          </Card>

          {/* 90 Days */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <Target className="w-5 h-5 text-blue-600" />
                <Badge className={getUrgencyColor(ai.predictions.ninetyDays.urgency)}>
                  {ai.predictions.ninetyDays.urgency}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-semibold text-gray-900 text-sm">90 Jours</p>
              <p className="text-sm text-gray-700">{ai.predictions.ninetyDays.recommendation}</p>
              {ai.predictions.ninetyDays.rolesNeeded?.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-600 mb-2">Postes à recruter</p>
                  <div className="flex flex-wrap gap-1">
                    {ai.predictions.ninetyDays.rolesNeeded.map((role, i) => (
                      <Badge key={i} variant="outline" className="bg-blue-50">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-2 border-t space-y-2">
                <div>
                  <p className="text-xs text-gray-600">Budget estimé</p>
                  <p className="font-semibold text-green-600">{ai.predictions.ninetyDays.estimatedBudget}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">CA prévu</p>
                  <p className="font-semibold text-purple-600">{ai.predictions.ninetyDays.projectedRevenue}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 pt-2 border-t italic">
                {ai.predictions.ninetyDays.reason}
              </p>
            </CardContent>
          </Card>

          {/* 6 Months */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                Vision 6 mois
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-700">{ai.predictions.sixMonths.recommendation}</p>

              {ai.predictions.sixMonths.idealTeamStructure?.roles?.length > 0 && (
                <div className="pt-2 border-t space-y-2">
                  <p className="text-xs font-semibold text-gray-600">Équipe idéale:</p>
                  {ai.predictions.sixMonths.idealTeamStructure.roles.map((role, i) => (
                    <div key={i} className="text-xs flex justify-between items-center">
                      <span className="text-gray-700">{role.title}</span>
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-purple-50">
                          {role.count}x
                        </Badge>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t space-y-2">
                <div>
                  <p className="text-xs text-gray-600">CA prévu</p>
                  <p className="font-semibold text-purple-600">{ai.predictions.sixMonths.projectedRevenue}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">ROI du recrutement</p>
                  <p className="font-semibold text-green-600">{ai.predictions.sixMonths.roiOfHiring}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Tendance de revenus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  {
                    name: 'Mois dernier',
                    revenue: parseFloat(context?.finances.revenueLastMonth || '0'),
                  },
                  {
                    name: 'Ce mois',
                    revenue: parseFloat(context?.finances.revenueThisMonth || '0'),
                  },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toFixed(2)} TND`} />
                <Bar dataKey="revenue" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Team Capacity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Capacité de l'équipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={[
                  {
                    period: 'Actuel',
                    current: context?.team.currentSize || 0,
                    needed: Math.max((context?.team.currentSize || 0) + 1, Math.ceil((context?.team.invoicesPerMember as any) / 15)),
                  },
                  {
                    period: 'Optimal',
                    current: context?.team.currentSize || 0,
                    needed:Math.max((context?.team.currentSize || 0) + 2, Math.ceil((context?.team.invoicesPerMember as any) / 10)),
                  },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="current"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Équipe actuelle"
                />
                <Line
                  type="monotone"
                  dataKey="needed"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Équipe nécessaire"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Skill Gaps */}
      {ai?.skillGaps && ai.skillGaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Lacunes de compétences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Compétence</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Urgence</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {ai.skillGaps.map((gap, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900 font-medium">{gap.skill}</td>
                      <td className="py-3 px-4">
                        <Badge className={getUrgencyColor(gap.urgency)}>{gap.urgency}</Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{gap.impact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hiring Timeline */}
      {ai?.hiringTimeline && ai.hiringTimeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Calendrier de recrutement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {ai.hiringTimeline.map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-4 h-4 rounded-full ${item.deadline ? 'bg-red-500' : 'bg-green-500'}`}
                    />
                    {i < ai.hiringTimeline.length - 1 && <div className="w-1 h-12 bg-gray-300 my-2" />}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="font-semibold text-gray-900">{item.week}</p>
                    <p className="text-sm text-gray-600">{item.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Forecast */}
      {ai?.budgetForecast && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Budget prévisionnel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs text-gray-600 mb-1">Équipe actuelle</p>
                <p className="text-2xl font-bold text-green-600">
                  {ai.budgetForecast.currentTeamCost}
                </p>
                <p className="text-xs text-gray-500 mt-1">/mois</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-gray-600 mb-1">Équipe optimale</p>
                <p className="text-2xl font-bold text-blue-600">
                  {ai.budgetForecast.optimalTeamCost}
                </p>
                <p className="text-xs text-gray-500 mt-1">/mois</p>
              </div>
            </div>

            <div
              className={`p-4 rounded-lg border ${ai.budgetForecast.canAffordHiring ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
            >
              <div className="flex items-start gap-3">
                {ai.budgetForecast.canAffordHiring ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p
                    className={`font-semibold ${ai.budgetForecast.canAffordHiring ? 'text-green-900' : 'text-red-900'}`}
                  >
                    {ai.budgetForecast.canAffordHiring
                      ? '✅ Vous pouvez vous permettre ces recrutements'
                      : '⚠️ Budget insuffisant pour les recrutements recommandés'}
                  </p>
                  <p className="text-sm text-gray-700 mt-2">{ai.budgetForecast.reasoning}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Business Metrics Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            Métriques de l'entreprise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Revenu total</p>
              <p className="text-2xl font-bold text-purple-600">{context?.finances.totalRevenue} TND</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Dépenses totales</p>
              <p className="text-2xl font-bold text-red-600">{context?.finances.totalExpenses} TND</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Bénéfice net</p>
              <p className="text-2xl font-bold text-green-600">{context?.finances.netProfit} TND</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Croissance</p>
              <p className="text-2xl font-bold text-blue-600">{context?.finances.growthRate}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Clients</p>
              <p className="text-2xl font-bold text-gray-900">{context?.operations.totalClients}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Factures</p>
              <p className="text-2xl font-bold text-gray-900">{context?.operations.totalInvoices}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">En attente</p>
              <p className="text-2xl font-bold text-gray-900">{context?.operations.pendingInvoices}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Montant en attente</p>
              <p className="text-2xl font-bold text-gray-900">{context?.operations.pendingAmount} TND</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
