import React, { useEffect, useRef, useState } from "react";
import { api } from "@/shared/lib/apiClient";

type ChatMessage = {
  id: string;
  sender: "user" | "ai" | "admin";
  content: string;
  createdAt: string;
  isAIResponse?: boolean;
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const OLLAMA_URL = "http://localhost:11434";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentTicketId, setCurrentTicketId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [escalated, setEscalated] = useState(false);
  
  const messagesRef = useRef<HTMLDivElement | null>(null);

  // Load messages when widget opens
  useEffect(() => {
    if (!open) return;

    const token = localStorage.getItem("access_token");
    if (!token) {
      setStatus("error");
      setErrorMsg("Token manquant");
      return;
    }

    loadMessages();
  }, [open]);

  async function loadMessages() {
    try {
      setStatus("connecting");
      console.log("[ChatWidget] Loading tickets...");

      const tickets = await api<any[]>(`/support-chat/tickets`);
      console.log("[ChatWidget] Loaded tickets:", tickets);

      if (tickets.length === 0) {
        setStatus("connected");
        // Start with welcome message
        setMessages([
          {
            id: `welcome-${Date.now()}`,
            sender: "ai",
            content:
              "Bonjour ! 👋 Je suis ARIA, votre assistant business expert. Comment puis-je vous aider aujourd'hui ?\n\nJe peux vous aider avec:\n• 📈 Plans marketing personnalisés\n• 💼 Conseils business stratégiques\n• 📊 Analyses financières\n• 🎯 Recommandations d'actions\n\nOu demandez-moi à parler à un humain!",
            createdAt: new Date().toISOString(),
          },
        ]);
        return;
      }

      // Use the most recent ticket
      const latestTicket = tickets[0];
      setCurrentTicketId(latestTicket.id || null);
      setMessages(latestTicket.messages || []);
      setEscalated(latestTicket.escalatedToAdmin || false);
      setStatus("connected");
      setErrorMsg(null);

      setTimeout(scrollBottom, 100);
    } catch (e: any) {
      console.error("[ChatWidget] Error loading messages:", e.message);
      // Start fresh conversation on error instead of showing error
      setStatus("connected");
      setMessages([
        {
          id: `welcome-${Date.now()}`,
          sender: "ai",
          content:
            "Bonjour ! 👋 Je suis ARIA, votre assistant business expert. Comment puis-je vous aider aujourd'hui ?\n\nJe peux vous aider avec:\n• 📈 Plans marketing personnalisés\n• 💼 Conseils business stratégiques\n• 📊 Analyses financières\n• 🎯 Recommandations d'actions\n\nOu demandez-moi à parler à un humain!",
          createdAt: new Date().toISOString(),
        },
      ]);
      setErrorMsg(null);
    }
  }

  function scrollBottom() {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }

  async function sendMessage() {
    if (!input.trim() || isLoading || status !== "connected") return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      // 🚨 Check for ESCALATION KEYWORDS FIRST
      const ESCALATION_TRIGGERS = [
        "contacter l'admin",
        "je veux l'admin",
        "parler à un humain",
        "parler à quelqu'un",
        "agent humain",
        "support humain",
        "je veux parler",
        "un être humain",
        "responsable",
        "escalader",
        "transmettre",
        "humain",
      ];

      const needsEscalation = ESCALATION_TRIGGERS.some((t) =>
        userMessage.toLowerCase().includes(t)
      );

      // Add user message to UI
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: "user",
        content: userMessage,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      scrollBottom();

      if (needsEscalation) {
        // 👤 ESCALATE TO ADMIN
        console.log("[ChatWidget] Escalation triggered");
        const escalationMsg: ChatMessage = {
          id: `escalation-${Date.now()}`,
          sender: "ai",
          content: `👤 Transfert vers un administrateur en cours...

✅ Votre conversation a été transmise à notre équipe.
Un administrateur humain vous répondra directement très bientôt.

📋 Résumé transmis:
- ${messages.length + 1} messages
- Date: ${new Date().toLocaleDateString("fr-FR")}

En attendant, y a-t-il autre chose que je peux faire ?`,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, escalationMsg]);
        setEscalated(true);

        // Send to backend
        try {
          const conversationHistory = [...messages, userMsg].map((m) => ({
            sender: m.sender,
            content: m.content,
            createdAt: m.createdAt,
          }));

          const result = await api(`/support-chat/escalate`, {
            method: "POST",
            body: JSON.stringify({
              ticketId: currentTicketId,
              message: userMessage,
              conversationHistory,
            }),
          });
          console.log("[ChatWidget] Escalation result:", result);
        } catch (err) {
          console.error("[ChatWidget] Escalation API error:", err);
        }

        scrollBottom();
        return;
      }

      // 🤖 TRY AI RESPONSE (Ollama)
      console.log("[ChatWidget] Sending message to AI");
      const conversationHistory = [...messages, userMsg].map((m) => ({
        sender: m.sender,
        content: m.content,
        createdAt: m.createdAt,
      }));

      const result = await api(`/support-chat/messages`, {
        method: "POST",
        body: JSON.stringify({
          ticketId: currentTicketId,
          content: userMessage,
          conversationHistory,
        }),
      });

      console.log("[ChatWidget] AI Response:", result);

      if (result.escalated) {
        setEscalated(true);
        const escalationMsg: ChatMessage = {
          id: `system-${Date.now()}`,
          sender: "ai",
          content:
            result.message ||
            "Votre demande a été transmise à l'administrateur.",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, escalationMsg]);
      } else if (result.aiResponse) {
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: "ai",
          content: result.aiResponse,
          createdAt: new Date().toISOString(),
          isAIResponse: true,
        };
        setMessages((prev) => [...prev, aiMsg]);
      }

      scrollBottom();
    } catch (e: any) {
      console.error("[ChatWidget] Send message error:", e.message);
      const errorMsgObj: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: "ai",
        content: "Erreur lors du traitement. Veuillez réessayer.",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsgObj]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{ position: "fixed", right: 24, bottom: 24, zIndex: 9999, fontFamily: "sans-serif" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: "#4f46e5",
          color: "white",
          padding: "12px 24px",
          borderRadius: "50px",
          boxShadow: "0 10px 15px -3px rgba(79, 70, 229, 0.4)",
          border: "none",
          cursor: "pointer",
          fontWeight: "bold",
          fontSize: "14px",
        }}
      >
        {open ? "✖ Fermer" : "💬 Assistance Directe"}
      </button>

      {open && (
        <div
          style={{
            width: 380,
            height: 550,
            background: "white",
            borderRadius: 20,
            marginTop: 12,
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: "1px solid #e2e8f0",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "20px",
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              color: "white",
            }}
          >
            <div style={{ fontWeight: "bold", fontSize: "16px" }}>
              Assistance Directe
            </div>
            <div style={{ fontSize: "12px", opacity: 0.9, marginTop: 4 }}>
              {status === "error" ? (
                <span>❌ {errorMsg}</span>
              ) : status === "connecting" ? (
                <span>⏳ Connexion...</span>
              ) : escalated ? (
                <span>✅ En attente d'une réponse admin</span>
              ) : (
                <span>🤖 Assistant IA prêt</span>
              )}
            </div>
          </div>

          {/* Messages */}
          <div
            ref={messagesRef}
            style={{
              flex: 1,
              padding: 16,
              overflowY: "auto",
              background: "#f8fafc",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {messages.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "#94a3b8",
                  fontSize: "14px",
                  margin: "auto",
                }}
              >
                Bonjour 👋 Comment puis-je vous aider ?
              </div>
            ) : (
              messages.map((m) => {
                const isUser = m.sender === "user";
                const isAdmin = m.sender === "admin";

                return (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: isUser ? "flex-end" : "flex-start",
                      maxWidth: "85%",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#64748b",
                        marginBottom: 4,
                        textAlign: isUser ? "right" : "left",
                      }}
                    >
                      {isUser ? "Vous" : isAdmin ? "Admin 👨‍💼" : "IA 🤖"}
                    </div>
                    <div
                      style={{
                        background: isUser ? "#4f46e5" : isAdmin ? "#10b981" : "white",
                        color: isUser || isAdmin ? "white" : "#1e293b",
                        padding: "10px 14px",
                        borderRadius: "12px",
                        fontSize: "13px",
                        border: isUser || isAdmin ? "none" : "1px solid #e2e8f0",
                        wordWrap: "break-word",
                      }}
                    >
                      {m.content}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input */}
          <div
            style={{
              padding: 16,
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              gap: 10,
              background: "#fff",
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isLoading && sendMessage()}
              placeholder={
                escalated
                  ? "Message en attente d'un admin..."
                  : "Votre question..."
              }
              disabled={isLoading || status !== "connected"}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                outline: "none",
                fontSize: "13px",
                opacity: isLoading || status !== "connected" ? 0.6 : 1,
              }}
            />
            <button
              disabled={
                !input.trim() ||
                isLoading ||
                status !== "connected"
              }
              onClick={sendMessage}
              style={{
                background:
                  !input.trim() || isLoading || status !== "connected"
                    ? "#cbd5e1"
                    : "#4f46e5",
                color: "white",
                border: "none",
                padding: "0 18px",
                borderRadius: 12,
                cursor: isLoading ? "wait" : "pointer",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              {isLoading ? "⏳" : "Envoyer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}