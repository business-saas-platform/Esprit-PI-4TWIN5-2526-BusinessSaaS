import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Brain, Users, AlertTriangle, TrendingUp, RefreshCw, Loader2, ArrowLeft, ShieldAlert, ClipboardEdit } from 'lucide-react';
import { toast } from 'sonner';
import { HRProfileForm } from './HRProfileForm';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EmployeeRisk {
  id:         string;
  name:       string;
  email:      string;
  role:       string;
  status:     string;
  risk:       number;
  level:      string;
  will_leave: boolean;
}

interface RiskSummary {
  total:   number;
  high:    number;
  medium:  number;
  low:     number;
  avgRisk: number;
}

interface HrRiskResponse {
  success:     boolean;
  employees:   EmployeeRisk[];
  summary:     RiskSummary;
  generatedAt: string;
  error?:      string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRiskColor(level: string) {
  switch (level) {
    case 'high':    return 'bg-red-100 text-red-700 border-red-200';
    case 'medium':  return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'low':     return 'bg-green-100 text-green-700 border-green-200';
    default:        return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

function getRiskBarColor(level: string) {
  switch (level) {
    case 'high':   return 'bg-red-500';
    case 'medium': return 'bg-yellow-400';
    case 'low':    return 'bg-green-500';
    default:       return 'bg-gray-300';
  }
}

function getRiskEmoji(level: string) {
  switch (level) {
    case 'high':   return '🔴';
    case 'medium': return '🟡';
    case 'low':    return '🟢';
    default:       return '⚪';
  }
}

function formatRole(role: string) {
  const map: Record<string, string> = {
    business_admin: 'Admin',
    accountant:     'Accountant',
    team_member:    'Team Member',
  };
  return map[role] ?? role;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function HRRiskAnalytics() {
  const navigate = useNavigate();
  const [data, setData]           = useState<HrRiskResponse | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState<{ id: string; name: string; role: string } | null>(null);

  const fetchRisk = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('http://localhost:3000/api/team-ai/hr-risk', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const json: HrRiskResponse = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Unknown error');

      setData(json);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load HR risk data');
      toast.error('Could not load HR risk data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRisk(); }, []);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
        <p className="text-gray-500 text-sm">Analyzing employee risk with ML model...</p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <br />
            <span className="text-xs mt-1 block">Make sure FastAPI is running on port 8000.</span>
          </AlertDescription>
        </Alert>
        <Button onClick={fetchRisk} className="mt-4" variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  const { employees = [], summary } = data!;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/team')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-600" />
              AI HR Risk Analytics
            </h1>
            <p className="text-sm text-gray-500">
              Powered by RandomForest ML · {employees.length} employee{employees.length !== 1 ? 's' : ''} analyzed
            </p>
          </div>
        </div>
        <Button onClick={fetchRisk} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500">Total Employees</p>
                <p className="text-2xl font-bold">{summary?.total ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-xs text-gray-500">🔴 High Risk</p>
                <p className="text-2xl font-bold text-red-600">{summary?.high ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-400">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-xs text-gray-500">🟡 Medium Risk</p>
                <p className="text-2xl font-bold text-yellow-600">{summary?.medium ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-xs text-gray-500">Avg Risk Score</p>
                <p className="text-2xl font-bold">
                  {((summary?.avgRisk ?? 0) * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Employee Attrition Risk — Sorted by Risk
          </CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No active employees found.</p>
              <p className="text-xs mt-1">Add team members with "active" status to see risk scores.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center gap-4 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-semibold text-sm flex-shrink-0">
                    {emp.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name + role */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{emp.name}</p>
                    <p className="text-xs text-gray-400 truncate">{emp.email}</p>
                  </div>

                  {/* Role badge */}
                  <Badge variant="outline" className="text-xs hidden sm:flex">
                    {formatRole(emp.role)}
                  </Badge>

                  {/* Risk bar */}
                  <div className="w-24 hidden md:block">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getRiskBarColor(emp.level)}`}
                        style={{ width: `${Math.round(emp.risk * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 text-right">
                      {Math.round(emp.risk * 100)}%
                    </p>
                  </div>

                  {/* Risk badge */}
                  <Badge className={`text-xs border ${getRiskColor(emp.level)}`}>
                    {getRiskEmoji(emp.level)} {emp.level.charAt(0).toUpperCase() + emp.level.slice(1)}
                  </Badge>

                  {/* Evaluate button */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs border-purple-200 text-purple-700 hover:bg-purple-50 flex-shrink-0"
                    onClick={() => setEvaluating({ id: emp.id, name: emp.name, role: emp.role })}
                  >
                    <ClipboardEdit className="w-3 h-3 mr-1" />
                    Évaluer
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer note */}
      <p className="text-xs text-gray-400 text-center">
        Predictions generated by a RandomForest model trained on the Kaggle HR Analytics dataset.
        Last updated: {data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : '—'}
      </p>

      {/* HR Profile Form Modal */}
      {evaluating && (
        <HRProfileForm
          employee={evaluating}
          onClose={() => setEvaluating(null)}
          onSaved={fetchRisk}
        />
      )}
    </div>
  );
}
