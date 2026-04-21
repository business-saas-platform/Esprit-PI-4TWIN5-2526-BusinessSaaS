import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Loader,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

import { SupportChatApi, SupportTicket } from "@/shared/lib/services/support";

export const AdminSupportTickets = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState<
    "open" | "in_progress" | "resolved" | "closed"
  >("in_progress");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedTicket?.messages]);

  // Load tickets
  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      setIsLoadingTickets(true);
      const data = await SupportChatApi.getAdminTickets();
      setTickets(data);
      if (data.length > 0 && !selectedTicket) {
        setSelectedTicket(data[0]);
      }
    } catch (error) {
      console.error("Failed to load tickets:", error);
      toast.error("Erreur lors du chargement des tickets");
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const handleSelectTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setReplyStatus(ticket.status as any);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;

    setIsLoading(true);
    const reply = replyText;
    setReplyText("");

    try {
      const updated = await SupportChatApi.adminReply(selectedTicket.id, {
        content: reply,
        status: replyStatus,
      });

      setSelectedTicket(updated);

      // Reload tickets list
      await loadTickets();

      toast.success("Réponse envoyée avec succès");
    } catch (error) {
      console.error("Error sending reply:", error);
      toast.error("Erreur lors de l'envoi de la réponse");
      setReplyText(reply); // Restore text on error
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "open":
        return "Ouvert";
      case "in_progress":
        return "En cours";
      case "resolved":
        return "Résolu";
      case "closed":
        return "Fermé";
      default:
        return status;
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-xl shadow-lg border overflow-hidden">
      {/* Sidebar */}
      <div className="w-96 border-r bg-gray-50 flex flex-col">
        <div className="p-4 border-b bg-white font-semibold text-sm flex items-center gap-2">
          <AlertCircle size={18} className="text-amber-500" />
          Tickets Escaladés ({tickets.length})
        </div>

        {isLoadingTickets ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader size={24} className="animate-spin text-gray-400" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
            <CheckCircle2 size={32} className="text-green-300 mb-2" />
            <p className="text-sm text-gray-600 font-medium">Aucun ticket en attente</p>
            <p className="text-xs text-gray-500 mt-1">
              Tous les tickets ont été traités
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => handleSelectTicket(ticket)}
                className={`p-3 cursor-pointer border-b transition-colors ${
                  selectedTicket?.id === ticket.id
                    ? "bg-blue-50 border-l-4 border-l-blue-600"
                    : "hover:bg-gray-100"
                }`}
              >
                <div className="space-y-1">
                  <p className="font-semibold text-sm text-gray-800">
                    {ticket.title}
                  </p>
                  <p className="text-xs text-gray-600">
                    User ID: <span className="font-mono">{ticket.userId.slice(0, 8)}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={`text-xs ${getStatusColor(ticket.status)}`}>
                      {getStatusLabel(ticket.status)}
                    </Badge>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock size={12} />
                      {Math.round(
                        (new Date().getTime() - new Date(ticket.createdAt).getTime()) /
                          60000
                      )}{" "}
                      min
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedTicket ? (
          <>
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-amber-50 to-orange-25 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-gray-800">{selectedTicket.title}</h2>
                <p className="text-xs text-gray-600 mt-1">
                  De: {selectedTicket.userId.slice(0, 12)}... • Créé le{" "}
                  {new Date(selectedTicket.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <Badge className={`${getStatusColor(selectedTicket.status)}`}>
                {getStatusLabel(selectedTicket.status)}
              </Badge>
            </div>

            {/* Messages */}
            <div className="flex-1 p-6 overflow-y-auto bg-gray-50/30 space-y-3">
              {selectedTicket.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <MessageSquare size={32} className="text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">Aucun message</p>
                </div>
              ) : (
                selectedTicket.messages.map((msg) => {
                  const isAdmin = msg.sender === "admin";
                  const isAI = msg.sender === "ai";

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 shadow-sm ${
                          isAdmin
                            ? "bg-blue-600 text-white rounded-br-none"
                            : isAI
                            ? "bg-purple-100 text-gray-800 border border-purple-200 rounded-bl-none"
                            : "bg-white text-gray-800 border border-gray-200 rounded-tl-none"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold opacity-75">
                            {isAdmin ? "Vous (Admin)" : isAI ? "Assistant IA" : "Utilisateur"}
                          </span>
                          {isAI && (
                            <Badge variant="outline" className="text-xs py-0 px-1">
                              IA
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{msg.content}</p>
                        <span className="text-xs opacity-60 mt-1 block">
                          {new Date(msg.createdAt).toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Area */}
            <div className="p-4 border-t bg-white space-y-3">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    Statut
                  </label>
                  <Select
                    value={replyStatus}
                    onValueChange={(val) =>
                      setReplyStatus(val as "open" | "in_progress" | "resolved" | "closed")
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Ouvert</SelectItem>
                      <SelectItem value="in_progress">En cours</SelectItem>
                      <SelectItem value="resolved">Résolu</SelectItem>
                      <SelectItem value="closed">Fermé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Tapez votre réponse..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !isLoading) {
                      handleSendReply();
                    }
                  }}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendReply}
                  disabled={isLoading || !replyText.trim()}
                  className="gap-2"
                >
                  {isLoading ? (
                    <Loader size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <MessageSquare size={48} className="text-gray-300 mb-4" />
            <p className="text-lg font-semibold text-gray-600">
              Sélectionnez un ticket pour répondre
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
