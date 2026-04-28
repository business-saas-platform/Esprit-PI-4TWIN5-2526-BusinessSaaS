import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/shared/ui';
import { Loader2, PhoneCall, Mail, MessageCircle, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useBusinessContext } from '@/shared/contexts/BusinessContext';
import {
  InvoiceCollectionCopilotApi,
  type InvoiceCollectionAction,
  type InvoiceCollectionCopilotResponse,
} from '@/shared/lib/services/invoiceCollectionCopilot';

function urgencyTone(level: 'low' | 'medium' | 'high') {
  if (level === 'high') return 'bg-red-100 text-red-700 border-red-200';
  if (level === 'medium') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-emerald-100 text-emerald-700 border-emerald-200';
}

function channelIcon(channel: 'email' | 'call' | 'whatsapp') {
  if (channel === 'call') return <PhoneCall className="h-4 w-4" />;
  if (channel === 'whatsapp') return <MessageCircle className="h-4 w-4" />;
  return <Mail className="h-4 w-4" />;
}

export function InvoiceCollectionCopilot() {
  const { currentBusiness } = useBusinessContext();
  const [data, setData] = useState<InvoiceCollectionCopilotResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string>('');
  const [savingByInvoice, setSavingByInvoice] = useState<Record<string, boolean>>({});
  const [noteByInvoice, setNoteByInvoice] = useState<Record<string, string>>({});
  const [amountByInvoice, setAmountByInvoice] = useState<Record<string, string>>({});
  const [nextStepByInvoice, setNextStepByInvoice] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'snoozed' | 'done'>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | 'email' | 'call' | 'whatsapp'>('all');

  const currency = currentBusiness?.currency ?? 'TND';
  const formatMoney = (value: number) => `${Number(value || 0).toFixed(2)} ${currency}`;

  useEffect(() => {
    if (!currentBusiness?.id) {
      setData(null);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const result = await InvoiceCollectionCopilotApi.get(12);
        setData(result);
      } catch (error: any) {
        setData(null);
        toast.error('Collection copilot error', {
          description: error?.message || 'Unable to load invoice collection plan',
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentBusiness?.id]);

  const actions = useMemo<InvoiceCollectionAction[]>(() => data?.actions ?? [], [data]);
  const workflowSummary = useMemo(
    () => ({
      pending: actions.filter((x) => x.workflow.status === 'pending').length,
      snoozed: actions.filter((x) => x.workflow.status === 'snoozed').length,
      done: actions.filter((x) => x.workflow.status === 'done').length,
    }),
    [actions]
  );
  const filteredActions = useMemo(() => {
    return actions.filter((action) => {
      if (statusFilter !== 'all' && action.workflow.status !== statusFilter) return false;
      if (urgencyFilter !== 'all' && action.urgency !== urgencyFilter) return false;
      if (channelFilter !== 'all' && action.recommendedChannel !== channelFilter) return false;
      return true;
    });
  }, [actions, statusFilter, urgencyFilter, channelFilter]);

  const setActionSaving = (invoiceId: string, value: boolean) => {
    setSavingByInvoice((prev) => ({ ...prev, [invoiceId]: value }));
  };

  const applyWorkflowLocally = (
    invoiceId: string,
    workflow: InvoiceCollectionAction['workflow']
  ) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        actions: prev.actions.map((x) => (x.invoiceId === invoiceId ? { ...x, workflow } : x)),
      };
    });
  };

  const updateWorkflow = async (
    action: InvoiceCollectionAction,
    payload: {
      status: 'pending' | 'snoozed' | 'done';
      snoozedUntil?: string;
      outcomeNote?: string;
      outcomeAmountCollected?: number;
      nextStep?: string;
    }
  ) => {
    try {
      setActionSaving(action.invoiceId, true);
      const result = await InvoiceCollectionCopilotApi.updateAction(action.invoiceId, payload);
      applyWorkflowLocally(action.invoiceId, {
        status: result.status,
        snoozedUntil: result.snoozedUntil,
        doneAt: result.doneAt,
        outcomeNote: result.outcomeNote,
        outcomeAmountCollected: result.outcomeAmountCollected,
        nextStep: result.nextStep,
        updatedAt: result.updatedAt,
      });
      toast.success(`Action updated: ${result.status}`);
    } catch (error: any) {
      toast.error('Update failed', {
        description: error?.message || 'Unable to update action workflow',
      });
    } finally {
      setActionSaving(action.invoiceId, false);
    }
  };

  const handleSnoozeHours = (action: InvoiceCollectionAction, hours: number) => {
    const dt = new Date(Date.now() + hours * 60 * 60 * 1000);
    return updateWorkflow(action, {
      status: 'snoozed',
      snoozedUntil: dt.toISOString(),
      nextStep: nextStepByInvoice[action.invoiceId] || action.workflow.nextStep || undefined,
    });
  };

  const handleMarkDone = (action: InvoiceCollectionAction) => {
    const note = (noteByInvoice[action.invoiceId] || '').trim();
    const amountRaw = (amountByInvoice[action.invoiceId] || '').trim();
    const amountNumber = amountRaw.length ? Number(amountRaw) : undefined;
    const nextStep = (nextStepByInvoice[action.invoiceId] || '').trim();

    return updateWorkflow(action, {
      status: 'done',
      outcomeNote: note || undefined,
      outcomeAmountCollected:
        amountNumber !== undefined && Number.isFinite(amountNumber) ? amountNumber : undefined,
      nextStep: nextStep || undefined,
    });
  };

  const handleReopen = (action: InvoiceCollectionAction) => {
    return updateWorkflow(action, {
      status: 'pending',
      nextStep: nextStepByInvoice[action.invoiceId] || action.workflow.nextStep || undefined,
    });
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 1500);
      toast.success('Copied');
    } catch {
      toast.error('Unable to copy');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Invoice Collection Copilot</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-assisted prioritization and outreach drafts for faster invoice collection.
        </p>
      </div>

      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-xl border bg-card">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No collection plan available.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Considered Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{data.summary.consideredInvoices}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Planned Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-indigo-600">{data.summary.plannedActions}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">High Urgency</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">{data.summary.highUrgency}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Model Source</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-semibold text-foreground">{data.modelSource}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{workflowSummary.pending}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Snoozed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-600">{workflowSummary.snoozed}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Done</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald-600">{workflowSummary.done}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Top Collection Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid gap-2 md:grid-cols-4">
                <select
                  className="rounded-md border border-border px-3 py-2 text-xs"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as 'all' | 'pending' | 'snoozed' | 'done')
                  }
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="snoozed">Snoozed</option>
                  <option value="done">Done</option>
                </select>
                <select
                  className="rounded-md border border-border px-3 py-2 text-xs"
                  value={urgencyFilter}
                  onChange={(e) =>
                    setUrgencyFilter(e.target.value as 'all' | 'low' | 'medium' | 'high')
                  }
                >
                  <option value="all">All urgencies</option>
                  <option value="high">High urgency</option>
                  <option value="medium">Medium urgency</option>
                  <option value="low">Low urgency</option>
                </select>
                <select
                  className="rounded-md border border-border px-3 py-2 text-xs"
                  value={channelFilter}
                  onChange={(e) =>
                    setChannelFilter(e.target.value as 'all' | 'email' | 'call' | 'whatsapp')
                  }
                >
                  <option value="all">All channels</option>
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('all');
                    setUrgencyFilter('all');
                    setChannelFilter('all');
                  }}
                >
                  Clear filters
                </Button>
              </div>

              {!filteredActions.length ? (
                <p className="text-sm text-muted-foreground">No open invoices to plan follow-up actions.</p>
              ) : (
                <div className="space-y-4">
                  {filteredActions.map((action) => {
                    const messageKey = `${action.invoiceId}-message`;
                    const scriptKey = `${action.invoiceId}-script`;

                    return (
                      <div key={action.invoiceId} className="rounded-xl border border-border p-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              #{action.priorityRank} {action.invoiceNumber} - {action.clientName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Due {action.dueDate} - Amount {formatMoney(action.totalAmount)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`border ${urgencyTone(action.urgency)}`}>
                              {action.urgency.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                              {channelIcon(action.recommendedChannel)}
                              {action.recommendedChannel}
                            </Badge>
                            <Badge variant="outline">
                              {(action.riskScore * 100).toFixed(1)}% risk
                            </Badge>
                            <Badge
                              variant="outline"
                              className={
                                action.workflow.status === 'done'
                                  ? 'border-emerald-300 text-emerald-700'
                                  : action.workflow.status === 'snoozed'
                                    ? 'border-amber-300 text-amber-700'
                                    : 'border-border text-foreground'
                              }
                            >
                              workflow: {action.workflow.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="mt-3 rounded-lg border border-border bg-card p-3">
                          <p className="text-xs font-semibold text-foreground">Workflow controls</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={savingByInvoice[action.invoiceId]}
                              onClick={() => handleSnoozeHours(action, 24)}
                            >
                              Snooze 24h
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={savingByInvoice[action.invoiceId]}
                              onClick={() => handleSnoozeHours(action, 72)}
                            >
                              Snooze 72h
                            </Button>
                            <Button
                              size="sm"
                              disabled={savingByInvoice[action.invoiceId]}
                              onClick={() => handleMarkDone(action)}
                            >
                              Mark done
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={savingByInvoice[action.invoiceId]}
                              onClick={() => handleReopen(action)}
                            >
                              Reopen
                            </Button>
                          </div>
                          <div className="mt-3 grid gap-2 md:grid-cols-3">
                            <input
                              className="w-full rounded-md border border-border px-3 py-2 text-xs"
                              placeholder="Outcome note (optional)"
                              value={noteByInvoice[action.invoiceId] ?? action.workflow.outcomeNote ?? ''}
                              onChange={(e) =>
                                setNoteByInvoice((prev) => ({
                                  ...prev,
                                  [action.invoiceId]: e.target.value,
                                }))
                              }
                            />
                            <input
                              className="w-full rounded-md border border-border px-3 py-2 text-xs"
                              placeholder="Amount collected"
                              value={
                                amountByInvoice[action.invoiceId] ??
                                (action.workflow.outcomeAmountCollected ?? '').toString()
                              }
                              onChange={(e) =>
                                setAmountByInvoice((prev) => ({
                                  ...prev,
                                  [action.invoiceId]: e.target.value,
                                }))
                              }
                            />
                            <input
                              className="w-full rounded-md border border-border px-3 py-2 text-xs"
                              placeholder="Next step (optional)"
                              value={nextStepByInvoice[action.invoiceId] ?? action.workflow.nextStep ?? ''}
                              onChange={(e) =>
                                setNextStepByInvoice((prev) => ({
                                  ...prev,
                                  [action.invoiceId]: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            Snoozed until: {action.workflow.snoozedUntil ?? '-'} | Done at:{' '}
                            {action.workflow.doneAt ?? '-'} | Last update: {action.workflow.updatedAt ?? '-'}
                          </p>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div className="rounded-lg bg-background p-3">
                            <p className="text-xs font-semibold text-foreground">Suggested message</p>
                            <p className="mt-1 text-xs text-muted-foreground">{action.message}</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={() => copyToClipboard(action.message, messageKey)}
                            >
                              <ClipboardCheck className="mr-2 h-4 w-4" />
                              {copied === messageKey ? 'Copied' : 'Copy message'}
                            </Button>
                          </div>
                          <div className="rounded-lg bg-background p-3">
                            <p className="text-xs font-semibold text-foreground">Call script</p>
                            <p className="mt-1 text-xs text-muted-foreground">{action.callScript}</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={() => copyToClipboard(action.callScript, scriptKey)}
                            >
                              <ClipboardCheck className="mr-2 h-4 w-4" />
                              {copied === scriptKey ? 'Copied' : 'Copy script'}
                            </Button>
                          </div>
                        </div>

                        {action.rationale?.length ? (
                          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                            {action.rationale.slice(0, 4).map((reason, idx) => (
                              <li key={`${action.invoiceId}-reason-${idx}`}>{reason}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
