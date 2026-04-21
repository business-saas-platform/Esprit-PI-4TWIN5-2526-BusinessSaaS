import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send,
  Loader,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";

import { SupportChatApi, SupportTicket, SupportMessage } from "@/shared/lib/services/support";
import { useBusinessContext } from "@/shared/contexts/BusinessContext";

export const BusinessOwnerSupport = () => {
  const navigate = useNavigate();
  const { currentBusinessId, isReady: isBusinessReady } = useBusinessContext();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load tickets on mount (wait for business context to be ready)
  useEffect(() => {
    if (isBusinessReady && currentBusinessId) {
      loadTickets();
    } else if (isBusinessReady && !currentBusinessId) {
      toast.error("Aucune entreprise sélectionnée");
      setIsLoadingTickets(false);
    }
  }, [isBusinessReady, currentBusinessId]);

  // Load messages when ticket is selected
  useEffect(() => {
    if (selectedTicket) {
      setMessages(selectedTicket.messages || []);
    }
  }, [selectedTicket]);

  const loadTickets = async () => {
    try {
      setIsLoadingTickets(true);
      const data = await SupportChatApi.getUserTickets();
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

  const handleSubmitMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    setInputText("");
    setIsLoading(true);

    try {
      const result = await SupportChatApi.submitMessage({
        content: userMessage,
        title: selectedTicket?.title || undefined,
      });

      if (result.success) {
        // Reload the ticket to get latest messages
        if (result.ticketId) {
          const updatedTicket = await SupportChatApi.getTicket(result.ticketId);
          setSelectedTicket(updatedTicket);
          setMessages(updatedTicket.messages);

          // Reload tickets list
          await loadTickets();

          if (result.escalated) {
            toast.success(result.message || "Demande transmise à l'administrateur");
          }
        }
      } else {
        toast.error(result.error || "Erreur lors de l'envoi du message");
      }
    } catch (error) {
      console.error("Error submitting message:", error);
      toast.error("Erreur lors de l'envoi du message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
  };

  const getSenderDisplay = (sender: string, isAI: boolean) => {
    if (sender === "admin") return { name: "Agent Humain", badge: "Agent" };
    if (isAI || sender === "ai") return { name: "Assistant IA", badge: "IA" };
    return { name: "Vous", badge: null };
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
      {/* Sidebar - Tickets List */}
      <div className="w-80 border-r bg-gray-50 flex flex-col">
        <div className="p-4 border-b bg-white font-semibold text-sm flex items-center gap-2">
          <MessageSquare size={18} />
          Support ({tickets.length})
        </div>

        {isLoadingTickets ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader size={24} className="animate-spin text-gray-400" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
            <MessageSquare size={32} className="text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">Aucune demande de support</p>
            <p className="text-xs text-gray-400 mt-1">
              Posez une question pour démarrer
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
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-800 truncate">
                      {ticket.title}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {ticket.description || "Pas de description"}
                    </p>
                  </div>
                  <Badge
                    className={`text-xs whitespace-nowrap ${getStatusColor(ticket.status)}`}
                  >
                    {getStatusLabel(ticket.status)}
                  </Badge>
                </div>
                {ticket.escalatedToAdmin && (
                  <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle size={12} />
                    En attente d'agent
                  </div>
                )}
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
            <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-blue-25 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-gray-800">{selectedTicket.title}</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Créé le {new Date(selectedTicket.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <Badge className={`${getStatusColor(selectedTicket.status)}`}>
                {getStatusLabel(selectedTicket.status)}
              </Badge>
            </div>

            {/* Messages */}
            <div className="flex-1 p-6 overflow-y-auto bg-gray-50/30 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare size={32} className="text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">
                    Aucun message pour le moment
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const { name, badge } = getSenderDisplay(msg.sender, msg.isAIResponse);
                  const isUserMessage = msg.sender === "user";

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isUserMessage ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 shadow-sm ${
                          isUserMessage
                            ? "bg-blue-600 text-white rounded-br-none"
                            : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-semibold opacity-75">
                            {name}
                          </span>
                          {badge && (
                            <Badge
                              variant={isUserMessage ? "secondary" : "outline"}
                              className="text-xs py-0 px-1.5"
                            >
                              {badge}
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

            {/* Input Area */}
            {selectedTicket.status !== "closed" && (
              <div className="p-4 border-t bg-white">
                <div className="flex gap-2">
                  <Input
                    placeholder="Posez votre question..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !isLoading) {
                        handleSubmitMessage();
                      }
                    }}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSubmitMessage}
                    disabled={isLoading || !inputText.trim()}
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
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <MessageSquare size={48} className="text-gray-300 mb-4" />
            <p className="text-lg font-semibold text-gray-600">
              Sélectionnez un ticket ou créez-en un nouveau
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
