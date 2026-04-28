import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/shared/ui';
import { Badge } from '@/app/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { useBusinessContext } from '@/shared/contexts/BusinessContext';
import {
  WhatIfSimulatorApi,
  type SavedWhatIfScenario,
  type WhatIfSimulationResponse,
} from '@/shared/lib/services/whatIfSimulator';

type Horizon = 30 | 60 | 90;

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function WhatIfSimulator() {
  const { currentBusiness } = useBusinessContext();
  const [horizon, setHorizon] = useState<Horizon>(30);
  const [collectionAccelerationPct, setCollectionAccelerationPct] = useState(20);
  const [collectionDelayPct, setCollectionDelayPct] = useState(0);
  const [expenseReductionPct, setExpenseReductionPct] = useState(10);
  const [expenseIncreasePct, setExpenseIncreasePct] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<WhatIfSimulationResponse | null>(null);
  const [scenarioName, setScenarioName] = useState('');
  const [savingScenario, setSavingScenario] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<SavedWhatIfScenario[]>([]);
  const [loadingScenarios, setLoadingScenarios] = useState(false);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  const [scenarioActionLoadingId, setScenarioActionLoadingId] = useState<string | null>(null);
  const [autoRunAfterLoad, setAutoRunAfterLoad] = useState(false);

  const currency = currentBusiness?.currency ?? 'TND';
  const formatMoney = (value: number) => `${value.toFixed(2)} ${currency}`;

  const runSimulation = async () => {
    if (!currentBusiness?.id) {
      toast.error('Select a business first');
      return;
    }
    try {
      setLoading(true);
      const result = await WhatIfSimulatorApi.run({
        horizon,
        collectionAccelerationPct,
        collectionDelayPct,
        expenseReductionPct,
        expenseIncreasePct,
      });
      setData(result);
    } catch (error: any) {
      toast.error('Simulation failed', {
        description: error?.message || 'Unable to run what-if simulation',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset: 'conservative' | 'base' | 'aggressive') => {
    if (preset === 'conservative') {
      setCollectionAccelerationPct(8);
      setCollectionDelayPct(0);
      setExpenseReductionPct(5);
      setExpenseIncreasePct(0);
      setScenarioName('Conservative');
      return;
    }
    if (preset === 'base') {
      setCollectionAccelerationPct(15);
      setCollectionDelayPct(2);
      setExpenseReductionPct(8);
      setExpenseIncreasePct(1);
      setScenarioName('Base');
      return;
    }
    setCollectionAccelerationPct(30);
    setCollectionDelayPct(0);
    setExpenseReductionPct(15);
    setExpenseIncreasePct(0);
    setScenarioName('Aggressive');
  };

  const loadScenarios = async () => {
    if (!currentBusiness?.id) return;
    try {
      setLoadingScenarios(true);
      const rows = await WhatIfSimulatorApi.listScenarios();
      setSavedScenarios(rows);
    } catch (error: any) {
      toast.error('Unable to load saved scenarios', {
        description: error?.message || 'Failed to load saved scenarios',
      });
    } finally {
      setLoadingScenarios(false);
    }
  };

  const saveScenario = async () => {
    if (!currentBusiness?.id) {
      toast.error('Select a business first');
      return;
    }
    if (!scenarioName.trim()) {
      toast.error('Scenario name is required');
      return;
    }
    try {
      setSavingScenario(true);
      if (editingScenarioId) {
        await WhatIfSimulatorApi.updateScenario(editingScenarioId, {
          name: scenarioName.trim(),
          horizon,
          collectionAccelerationPct,
          collectionDelayPct,
          expenseReductionPct,
          expenseIncreasePct,
        });
        toast.success('Scenario updated');
      } else {
        await WhatIfSimulatorApi.saveScenario({
          name: scenarioName.trim(),
          horizon,
          collectionAccelerationPct,
          collectionDelayPct,
          expenseReductionPct,
          expenseIncreasePct,
        });
        toast.success('Scenario saved');
      }
      setEditingScenarioId(null);
      await loadScenarios();
    } catch (error: any) {
      toast.error('Save failed', {
        description: error?.message || 'Unable to save scenario',
      });
    } finally {
      setSavingScenario(false);
    }
  };

  const loadScenarioIntoInputs = async (row: SavedWhatIfScenario) => {
    setScenarioName(row.name);
    setHorizon(row.horizon);
    setCollectionAccelerationPct(row.scenario.collectionAccelerationPct);
    setCollectionDelayPct(row.scenario.collectionDelayPct);
    setExpenseReductionPct(row.scenario.expenseReductionPct);
    setExpenseIncreasePct(row.scenario.expenseIncreasePct);

    if (!autoRunAfterLoad) return;
    try {
      setScenarioActionLoadingId(row.id);
      const result = await WhatIfSimulatorApi.run({
        horizon: row.horizon,
        collectionAccelerationPct: row.scenario.collectionAccelerationPct,
        collectionDelayPct: row.scenario.collectionDelayPct,
        expenseReductionPct: row.scenario.expenseReductionPct,
        expenseIncreasePct: row.scenario.expenseIncreasePct,
      });
      setData(result);
      toast.success(`Loaded and simulated "${row.name}"`);
    } catch (error: any) {
      toast.error('Auto-run failed', {
        description: error?.message || 'Unable to run simulation after loading scenario',
      });
    } finally {
      setScenarioActionLoadingId(null);
    }
  };

  const handleEditScenario = (row: SavedWhatIfScenario) => {
    void loadScenarioIntoInputs(row);
    setEditingScenarioId(row.id);
    toast.success(`Editing "${row.name}"`);
  };

  const handleDeleteScenario = async (row: SavedWhatIfScenario) => {
    const ok = window.confirm(`Delete scenario "${row.name}"?`);
    if (!ok) return;
    try {
      setScenarioActionLoadingId(row.id);
      await WhatIfSimulatorApi.deleteScenario(row.id);
      if (editingScenarioId === row.id) setEditingScenarioId(null);
      toast.success('Scenario deleted');
      await loadScenarios();
    } catch (error: any) {
      toast.error('Delete failed', {
        description: error?.message || 'Unable to delete scenario',
      });
    } finally {
      setScenarioActionLoadingId(null);
    }
  };

  const chartData = useMemo(() => {
    if (!data?.points?.length) return [];
    return data.points.map((p) => ({
      ...p,
      dateLabel: new Date(p.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    }));
  }, [data]);

  useEffect(() => {
    loadScenarios();
  }, [currentBusiness?.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">What-if Simulator</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Simulate collection and expense scenarios before making financial decisions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scenario Inputs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => applyPreset('conservative')}>
              Conservative
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset('base')}>
              Base
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset('aggressive')}>
              Aggressive
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Horizon (days)</label>
              <select
                value={horizon}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
                onChange={(e) => setHorizon(Number(e.target.value) as Horizon)}
              >
                <option value={30}>30</option>
                <option value={60}>60</option>
                <option value={90}>90</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Collection acceleration %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={collectionAccelerationPct}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
                onChange={(e) => setCollectionAccelerationPct(Number(e.target.value || 0))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Collection delay %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={collectionDelayPct}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
                onChange={(e) => setCollectionDelayPct(Number(e.target.value || 0))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Expense reduction %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={expenseReductionPct}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
                onChange={(e) => setExpenseReductionPct(Number(e.target.value || 0))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Expense increase %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={expenseIncreasePct}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
                onChange={(e) => setExpenseIncreasePct(Number(e.target.value || 0))}
              />
            </div>
          </div>
          <div className="mt-3">
            <Button onClick={runSimulation} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Run simulation
            </Button>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto_auto]">
            <input
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
              placeholder="Scenario name (e.g. Aggressive Q3)"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
            />
            <Button variant="outline" onClick={loadScenarios} disabled={loadingScenarios}>
              {loadingScenarios ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Refresh saved
            </Button>
            <Button onClick={saveScenario} disabled={savingScenario}>
              {savingScenario ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingScenarioId ? 'Update scenario' : 'Save scenario'}
            </Button>
          </div>
          <label className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={autoRunAfterLoad}
              onChange={(e) => setAutoRunAfterLoad(e.target.checked)}
            />
            Run simulation immediately after loading a saved scenario
          </label>
          {editingScenarioId ? (
            <div className="mt-2 flex items-center justify-between rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
              <span>Editing existing scenario. Save will update this scenario.</span>
              <Button size="sm" variant="ghost" onClick={() => setEditingScenarioId(null)}>
                Cancel edit
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {!data ? null : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Baseline Net</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">
                  {formatMoney(n(data.baseline.expectedNet))}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Simulated Net</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-indigo-600">
                  {formatMoney(n(data.simulated.expectedNet))}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Net Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-2xl font-bold ${
                    n(data.impact.deltaExpectedNet) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {formatMoney(n(data.impact.deltaExpectedNet))}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Improvement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-foreground">{n(data.impact.improvementPct)}%</p>
                  <Badge variant="outline">
                    {data.baseline.risk} {'→'} {data.simulated.risk}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Baseline vs Simulated Net</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dateLabel" minTickGap={24} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatMoney(n(value))} />
                    <Legend />
                    <Line type="monotone" dataKey="baselineNet" name="Baseline net" stroke="#64748b" dot={false} />
                    <Line type="monotone" dataKey="simulatedNet" name="Simulated net" stroke="#4f46e5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Net Delta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dateLabel" minTickGap={24} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatMoney(n(value))} />
                    <Bar dataKey="deltaNet" name="Delta net" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Saved Scenarios Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          {!savedScenarios.length ? (
            <p className="text-sm text-muted-foreground">
              No saved scenarios yet. Save one to compare named plans across your team.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2">Horizon</th>
                    <th className="px-2 py-2">Inputs</th>
                    <th className="px-2 py-2">Baseline Net</th>
                    <th className="px-2 py-2">Simulated Net</th>
                    <th className="px-2 py-2">Delta</th>
                    <th className="px-2 py-2">Improvement</th>
                    <th className="px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {savedScenarios.map((row) => (
                    <tr key={row.id} className="border-b last:border-none">
                      <td className="px-2 py-2 font-medium text-foreground">{row.name}</td>
                      <td className="px-2 py-2">{row.horizon}d</td>
                      <td className="px-2 py-2 text-xs text-muted-foreground">
                        +{row.scenario.collectionAccelerationPct}% coll. / -
                        {row.scenario.collectionDelayPct}% coll. / -
                        {row.scenario.expenseReductionPct}% exp. / +{row.scenario.expenseIncreasePct}% exp.
                      </td>
                      <td className="px-2 py-2">{formatMoney(n(row.baseline.expectedNet))}</td>
                      <td className="px-2 py-2">{formatMoney(n(row.simulated.expectedNet))}</td>
                      <td
                        className={`px-2 py-2 font-semibold ${
                          n(row.impact.deltaExpectedNet) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {formatMoney(n(row.impact.deltaExpectedNet))}
                      </td>
                      <td className="px-2 py-2">{n(row.impact.improvementPct)}%</td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void loadScenarioIntoInputs(row)}
                            disabled={scenarioActionLoadingId === row.id}
                          >
                            {scenarioActionLoadingId === row.id ? 'Loading...' : 'Load'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditScenario(row)}
                            disabled={scenarioActionLoadingId === row.id}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteScenario(row)}
                            disabled={scenarioActionLoadingId === row.id}
                            className="text-rose-600 hover:text-rose-700"
                          >
                            {scenarioActionLoadingId === row.id ? 'Deleting...' : 'Delete'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
