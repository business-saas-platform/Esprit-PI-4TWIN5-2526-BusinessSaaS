import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader, AlertCircle, CheckCircle2, Clock, XCircle, Send, RefreshCw, User, Bot, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { SupportChatApi, SupportTicket } from '@/shared/lib/services/support';

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open:        { label: 'Ouvert',   color: 'bg-blue-100 text-blue-700 border-blue-200',     icon: <Clock size={12} /> },
  in_progress: { label: 'En cours', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <AlertCircle size={12} /> },
  resolved:    { label: 'Résolu',   color: 'bg-green-100 text-green-700 border-green-200',   icon: <CheckCircle2 size={12} /> },
  closed:      { label: 'Fermé',    color: 'bg-gray-100 text-gray-500 border-gray-200',      icon: <XCircle size={12} /> },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.open;
  return (
    <Badge className={`text-xs border flex items-center gap-1 ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </Badge>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ── Component ─────────────────────────────────────────────────────────────────
const PlatformSupport = () => {
  const [tickets, setTickets]         = useState<SupportTicket[]>([]);
  const [selected, setSelected]       = useState<SupportTicket | null>(null);
  const [input, setInput]             = useState('');
  const [sending, setSending]         = useState(false);
  const [loadingTickets, setLoading]  = useState(true);
  const [updatingStatus, setUpdating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [selected?.messages]);

  // ── Load tickets ────────────────────────────────────────────────────────────
  const loadTickets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await SupportChatApi.getAdminTickets();
      setTickets(data);
      // Refresh selected ticket if open
      if (selected) {
        const refreshed = data.find((t) => t.id === selected.id);
        if (refreshed) setSelected(refreshed);
      } else if (data.length > 0) {
        setSelected(data[0]);
      }
    } catch {
      if (!silent) toast.error('Erreur lors du chargement');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selected?.id]);

  useEffect(() => { loadTickets(); }, []);

  // ── Poll every 15s for new messages ─────────────────────────────────────────
  useEffect(() => {
    pollRef.current = setInterval(() => loadTickets(true), 15000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadTickets]);

  // ── Send reply ──────────────────────────────────────────────────────────────
  const handleReply = async () => {
    if (!input.trim() || !selected) return;
    const reply = input.trim();
    setInput('');
    setSending(true);
    try {
      const updated = await SupportChatApi.adminReply(selected.id, {
        content: reply,
        status: 'in_progress',
      });
      setSelected(updated);
      await loadTickets(true);
      toast.success('Réponse envoyée');
    } catch {
      toast.error('Erreur lors de l\'envoi');
      setInput(reply);
    } finally {
      setSending(false);
    }
  };

  // ── Change status ───────────────────────────────────────────────────────────
  const handleStatus = async (status: string) => {
    if (!selected) return;
    setUpdating(true);
    try {
      await SupportChatApi.updateTicketStatus(selected.id, status);
      await loadTickets(true);
      toast.success(`Statut mis à jour : ${STATUS_CONFIG[status]?.label}`);
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setUpdating(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-xl shadow-lg border overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div className="w-80 border-r bg-gray-50 flex flex-col flex-shrink-0">
        <div className="p-3 border-b bg-white flex items-center justify-between">
          <span className="font-semibold text-sm flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500" />
            Tickets escaladés ({tickets.length})
          </span>
          <button onClick={() => loadTickets()} className="text-gray-400 hover:text-gray-600">
            <RefreshCw size={14} />
          </button>
        </div>

        {loadingTickets ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader size={20} className="animate-spin text-gray-400" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
            <CheckCircle2 size={28} className="text-green-400 mb-2" />
            <p className="text-sm text-gray-600 font-medium">Aucun ticket en attente</p>
            <p className="text-xs text-gray-400 mt-1">Tous les tickets sont traités ✓</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {tickets.map((t) => {
              const lastMsg = t.messages?.[t.messages.length - 1];
              const ownerName = (t as any).ownerName || (t as any).ownerEmail || t.userId?.slice(0, 8) + '...';
              return (
                <div
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className={`p-3 cursor-pointer border-b transition-colors ${
                    selected?.id === t.id
                      ? 'bg-red-50 border-l-4 border-l-red-500'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-medium text-xs text-gray-800 line-clamp-2 flex-1">{t.title}</p>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <User size={10} /> {ownerName}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {lastMsg ? formatDate(lastMsg.createdAt) : formatDate(t.createdAt)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Chat area ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <>
            {/* Header */}
            <div className="px-5 py-3 border-b bg-gradient-to-r from-red-50 to-white flex-shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-bold text-gray-800 text-sm truncate">{selected.title}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    De: {(selected as any).ownerEmail || (selected as any).ownerName || selected.userId?.slice(0, 16) + '...'}
                    {' · '}Créé le {formatDate(selected.createdAt)}
                  </p>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              {/* Status action buttons */}
              <div className="flex gap-2 mt-2 flex-wrap">
                {['open', 'in_progress', 'resolved', 'closed'].map((s) => (
                  <button
                    key={s}
                    disabled={updatingStatus || selected.status === s}
                    onClick={() => handleStatus(s)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      selected.status === s
                        ? STATUS_CONFIG[s].color + ' font-semibold'
                        : 'border-gray-200 text-gray-500 hover:border-gray-400 bg-white'
                    }`}
                  >
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
              {selected.messages.map((msg) => {
                const isAdmin = msg.sender === 'admin';
                const isAI    = msg.sender === 'ai' || msg.isAIResponse;
                const isUser  = msg.sender === 'user';

                return (
                  <div key={msg.id} className={`flex gap-2 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                    {!isAdmin && (
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                        isAI ? 'bg-purple-100' : 'bg-gray-200'
                      }`}>
                        {isAI ? <Bot size={13} className="text-purple-600" /> : <User size={13} className="text-gray-600" />}
                      </div>
                    )}

                    <div className={`max-w-[70%] flex flex-col gap-0.5 ${isAdmin ? 'items-end' : 'items-start'}`}>
                      <span className="text-xs text-gray-400 px-1">
                        {isAdmin ? 'Vous (Admin)' : isAI ? 'Assistant IA' : 'Client'}
                      </span>
                      <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                        isAdmin
                          ? 'bg-red-600 text-white rounded-br-sm'
                          : isAI
                          ? 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                          : 'bg-blue-50 border border-blue-200 text-gray-800 rounded-bl-sm'
                      }`}>
                        {msg.content}
                      </div>
                      <span className="text-xs text-gray-300 px-1">
                        {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {isAdmin && (
                      <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-1">
                        <UserCheck size={13} className="text-red-600" />
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Reply input */}
            {selected.status !== 'closed' ? (
              <div className="p-3 border-t bg-white flex-shrink-0">
                <div className="flex gap-2">
                  <input
                    className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300"
                    placeholder="Écrire votre réponse au client..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !sending) handleReply(); }}
                    disabled={sending}
                  />
                  <Button
                    onClick={handleReply}
                    disabled={sending || !input.trim()}
                    className="bg-red-600 hover:bg-red-700 rounded-xl px-4"
                  >
                    {sending ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-3 border-t bg-gray-50 text-center text-xs text-gray-400">
                Ce ticket est fermé.
                <button onClick={() => handleStatus('open')} className="ml-2 text-red-500 underline">
                  Rouvrir
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
            <div className="text-5xl">📩</div>
            <p className="font-medium text-gray-600">Sélectionnez un ticket pour répondre</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlatformSupport;
