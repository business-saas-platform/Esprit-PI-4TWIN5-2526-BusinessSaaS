import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, Loader, AlertCircle, MessageSquare, Plus, Bot,
  User, UserCheck, Sparkles, Trash2, Search, Filter, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { SupportChatApi, SupportTicket, SupportMessage } from "@/shared/lib/services/support";
import { useBusinessContext } from "@/shared/contexts/BusinessContext";
import { api } from "@/shared/lib/apiClient";

// ── Suggestions ───────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  { icon: "📈", text: "Donne-moi une stratégie marketing selon mes données" },
  { icon: "💰", text: "Analyse mes revenus et dépenses ce mois" },
  { icon: "📋", text: "Comment améliorer mon taux de recouvrement ?" },
  { icon: "👥", text: "Conseils pour fidéliser mes clients" },
  { icon: "🎯", text: "Quelles sont mes priorités business cette semaine ?" },
];

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  open: "🟢 Ouvert", in_progress: "🟡 En cours",
  resolved: "✅ Résolu", closed: "⚫ Fermé",
};
const STATUS_COLOR: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  resolved: "bg-blue-100 text-blue-700",
  closed: "bg-gray-100 text-gray-500",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
    + " · " + new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// ── Delete confirmation modal ─────────────────────────────────────────────────
function DeleteModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <h3 className="font-semibold text-gray-800">Supprimer la conversation ?</h3>
        </div>
        <p className="text-sm text-gray-500 mb-5">Cette action est irréversible.</p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Annuler</Button>
          <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={onConfirm}>Supprimer</Button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export const BusinessOwnerSupport = () => {
  const { currentBusinessId, isReady } = useBusinessContext();

  const [tickets, setTickets]         = useState<SupportTicket[]>([]);
  const [selected, setSelected]       = useState<SupportTicket | null>(null);
  const [messages, setMessages]       = useState<SupportMessage[]>([]);
  const [input, setInput]             = useState("");
  const [sending, setSending]         = useState(false);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [filter, setFilter]           = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCount  = useRef(0);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (isReady) loadTickets();
  }, [isReady]);

  useEffect(() => {
    if (selected) { setMessages(selected.messages ?? []); prevCount.current = selected.messages?.length ?? 0; }
  }, [selected?.id]);

  // ── Silent poll ──────────────────────────────────────────────────────────
  const silentPoll = useCallback(async () => {
    if (!selected) return;
    try {
      const data = await SupportChatApi.getUserTickets();
      setTickets(data);
      const refreshed = data.find((t) => t.id === selected.id);
      if (refreshed) {
        const newCount = refreshed.messages?.length ?? 0;
        const hasNewAdmin = refreshed.messages?.some((m, i) => i >= prevCount.current && m.sender === "admin");
        if (hasNewAdmin && newCount > prevCount.current) {
          toast.success("💬 L'administrateur vous a répondu !", { duration: 5000 });
        }
        prevCount.current = newCount;
        setSelected(refreshed);
        setMessages(refreshed.messages ?? []);
      }
    } catch { /* silent */ }
  }, [selected?.id]);

  useEffect(() => {
    pollRef.current = setInterval(silentPoll, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [silentPoll]);

  // ── Load tickets ─────────────────────────────────────────────────────────
  const loadTickets = async () => {
    try {
      setLoading(true);
      const data = await SupportChatApi.getUserTickets();
      // Sort by most recent first
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTickets(data);
      if (data.length > 0 && !selected) setSelected(data[0]);
    } catch { toast.error("Erreur lors du chargement"); }
    finally { setLoading(false); }
  };

  // ── Select ticket (reopen if closed) ─────────────────────────────────────
  const handleSelect = async (t: SupportTicket) => {
    setSelected(t);
    setMessages(t.messages ?? []);
    // Manager cannot change status — only admin can
    // Just load the conversation as-is
  };

  // ── New conversation ──────────────────────────────────────────────────────
  const handleNew = () => {
    setSelected(null);
    setMessages([]);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await api(`/support-chat/tickets/${id}`, { method: "DELETE" });
      setTickets((prev) => prev.filter((t) => t.id !== id));
      if (selected?.id === id) { setSelected(null); setMessages([]); }
      toast.success("Conversation supprimée");
    } catch (e: any) {
      console.error("Delete error:", e);
      toast.error("Erreur lors de la suppression");
    } finally { setDeleteTarget(null); }
  };

  // ── Clear closed ─────────────────────────────────────────────────────────
  const handleClearClosed = async () => {
    const closed = tickets.filter((t) => t.status === "closed" || t.status === "resolved");
    if (closed.length === 0) { toast.info("Aucune conversation fermée"); return; }
    await Promise.all(closed.map((t) => api(`/support-chat/tickets/${t.id}`, { method: "DELETE" }).catch(() => {})));
    setTickets((prev) => prev.filter((t) => t.status !== "closed" && t.status !== "resolved"));
    if (selected && (selected.status === "closed" || selected.status === "resolved")) { setSelected(null); setMessages([]); }
    toast.success(`${closed.length} conversation(s) supprimée(s)`);
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;
    setInput("");
    setSending(true);

    const tempMsg: SupportMessage = {
      id: `temp-${Date.now()}`, ticketId: selected?.id ?? "",
      sender: "user", content, isAIResponse: false, createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const result = await SupportChatApi.submitMessage({ content, title: selected?.title });
      const ticketId = result.ticketId ?? selected?.id;
      if (ticketId) {
        try {
          const updated = await SupportChatApi.getTicket(ticketId);
          setSelected(updated);
          setMessages(updated.messages);
        } catch { /* ticket might not exist yet */ }
        await loadTickets();
      }
      if (result.escalated) toast.info("Conversation transmise à l'administrateur");
      if (!result.success && result.error) toast.error(result.error);
    } catch (e: any) {
      console.error("Send error:", e);
      toast.error("Erreur réseau — vérifiez que NestJS tourne");
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
    } finally { setSending(false); }
  };

  // ── Filtered tickets ──────────────────────────────────────────────────────
  const filtered = tickets.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || t.status === filter ||
      (filter === "escalated" && t.escalatedToAdmin);
    return matchSearch && matchFilter;
  });

  const isEscalated = selected?.escalatedToAdmin ?? false;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-xl shadow-lg border overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div className="w-80 border-r bg-gray-50 flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="p-3 border-b bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm flex items-center gap-1.5">
              <MessageSquare size={15} className="text-purple-600" />
              Conversations ({tickets.length})
            </span>
            <div className="flex gap-1">
              <button onClick={handleClearClosed} title="Supprimer les fermées"
                className="text-xs text-gray-400 hover:text-red-500 px-1.5 py-1 rounded hover:bg-red-50 transition-colors">
                <Trash2 size={13} />
              </button>
              <Button size="sm" variant="outline"
                className="h-7 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
                onClick={handleNew}>
                <Plus size={12} /><span className="ml-1">Nouveau</span>
              </Button>
            </div>
          </div>
          {/* Search */}
          <div className="relative mb-2">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-300"
            />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={12} /></button>}
          </div>
          {/* Filter */}
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-300 bg-white">
            <option value="all">Tous</option>
            <option value="open">🟢 Ouvert</option>
            <option value="in_progress">🟡 En cours</option>
            <option value="closed">⚫ Fermé</option>
            <option value="escalated">🔴 En attente admin</option>
          </select>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center"><Loader size={20} className="animate-spin text-gray-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
            <Bot size={28} className="text-gray-300 mb-2" />
            <p className="text-xs text-gray-500">Aucune conversation</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {filtered.map((t) => {
              const lastMsg = t.messages?.[t.messages.length - 1];
              const preview = lastMsg?.content ? lastMsg.content.slice(0, 50) + (lastMsg.content.length > 50 ? "..." : "") : "";
              return (
                <div key={t.id} onClick={() => handleSelect(t)}
                  className={`p-3 cursor-pointer border-b transition-colors group relative ${
                    selected?.id === t.id ? "bg-purple-50 border-l-4 border-l-purple-600" : "hover:bg-gray-100"
                  }`}>
                  <div className="flex items-start justify-between gap-1 mb-0.5">
                    <p className="text-xs font-semibold text-gray-800 line-clamp-1 flex-1">{t.title}</p>
                    <Badge className={`text-xs whitespace-nowrap ${STATUS_COLOR[t.status]}`}>
                      {STATUS_LABEL[t.status]}
                    </Badge>
                  </div>
                  {t.escalatedToAdmin && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mb-0.5">
                      <AlertCircle size={10} /> En attente d'admin
                    </p>
                  )}
                  {preview && <p className="text-xs text-gray-400 line-clamp-1 italic">"{preview}"</p>}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400">{fmtDate(t.createdAt)}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(t.id); }}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-0.5 rounded"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Chat area ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <>
            {/* Header */}
            <div className="px-5 py-3 border-b bg-gradient-to-r from-purple-50 to-white flex items-center justify-between flex-shrink-0">
              <div className="min-w-0">
                <h2 className="font-semibold text-gray-800 text-sm truncate">{selected.title}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isEscalated ? "🔴 En attente d'un administrateur" : "🤖 Assistant IA — Groq"}
                </p>
              </div>
              <Badge className={STATUS_COLOR[selected.status]}>{STATUS_LABEL[selected.status]}</Badge>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/40">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Sparkles size={22} className="text-purple-600" />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">Comment puis-je vous aider ?</p>
                  <div className="grid grid-cols-1 gap-2 w-full max-w-md">
                    {SUGGESTIONS.map((s) => (
                      <button key={s.text} onClick={() => handleSend(s.text)}
                        className="text-left px-3 py-2 rounded-lg border border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50 text-xs text-gray-700 transition-all">
                        {s.icon} {s.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => {
                const isUser  = msg.sender === "user";
                const isAdmin = msg.sender === "admin";
                return (
                  <div key={msg.id} className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
                    {!isUser && (
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${isAdmin ? "bg-blue-100" : "bg-purple-100"}`}>
                        {isAdmin ? <UserCheck size={14} className="text-blue-600" /> : <Bot size={14} className="text-purple-600" />}
                      </div>
                    )}
                    <div className={`max-w-[72%] flex flex-col gap-0.5 ${isUser ? "items-end" : "items-start"}`}>
                      <span className="text-xs text-gray-400 px-1">
                        {isUser ? "Vous" : isAdmin ? "Administrateur" : "Assistant IA"}
                      </span>
                      <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                        isUser ? "bg-purple-600 text-white rounded-br-sm"
                        : isAdmin ? "bg-blue-50 text-gray-800 border border-blue-200 rounded-bl-sm"
                        : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm"
                      }`}>{msg.content}</div>
                      <span className="text-xs text-gray-300 px-1">
                        {new Date(msg.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {isUser && (
                      <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                        <User size={14} className="text-white" />
                      </div>
                    )}
                  </div>
                );
              })}

              {sending && (
                <div className="flex gap-2 justify-start">
                  <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center">
                    <Bot size={14} className="text-purple-600" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      {[0, 150, 300].map((d) => (
                        <span key={d} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t bg-white flex-shrink-0">
              {isEscalated && (
                <div className="mb-2 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5">
                  <AlertCircle size={13} /> En attente d'un administrateur — vous pouvez continuer à écrire
                </div>
              )}
              <div className="flex gap-2">
                <input type="text"
                  placeholder={isEscalated ? "Message pour l'administrateur..." : "Posez votre question..."}
                  value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !sending) { e.preventDefault(); handleSend(); } }}
                  disabled={sending}
                  className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:opacity-50"
                />
                <Button onClick={() => handleSend()} disabled={sending || !input.trim()}
                  className="bg-purple-600 hover:bg-purple-700 rounded-xl px-4">
                  {sending ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
              <Bot size={30} className="text-purple-600" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-700">Assistant IA Business</p>
              <p className="text-sm text-gray-400 mt-1">Posez vos questions sur votre business, marketing, finances...</p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
              {SUGGESTIONS.map((s) => (
                <button key={s.text} onClick={() => handleSend(s.text)}
                  className="text-left px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50 text-sm text-gray-700 transition-all">
                  {s.icon} {s.text}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Delete modal ─────────────────────────────────────────────────── */}
      {deleteTarget && (
        <DeleteModal
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
