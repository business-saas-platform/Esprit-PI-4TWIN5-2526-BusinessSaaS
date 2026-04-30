import { api } from "@/shared/lib/apiClient";

export type SupportMessage = {
  id: string;
  ticketId: string;
  sender: "user" | "ai" | "admin";
  content: string;
  isAIResponse: boolean;
  createdAt: string;
};

export type SupportTicket = {
  id: string;
  businessId: string;
  userId: string;
  title: string;
  description?: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  escalatedToAdmin: boolean;
  failedAIResponseCount: number;
  messages: SupportMessage[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  // Enriched admin fields (optional)
  ownerName?: string;
  ownerEmail?: string;
  businessName?: string;
};

export const SupportChatApi = {
  /**
   * Submit a message and get AI response
   */
  submitMessage: async (payload: {
    content: string;
    title?: string;
    description?: string;
  }) => {
    return api<any>(`/support-chat/messages`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Get all tickets for current user
   */
  getUserTickets: async () => {
    return api<SupportTicket[]>(`/support-chat/tickets`);
  },

  /**
   * Get a specific ticket with messages
   */
  getTicket: async (ticketId: string) => {
    return api<SupportTicket>(`/support-chat/tickets/${ticketId}`);
  },

  /**
   * Update ticket status
   */
  updateTicketStatus: async (
    ticketId: string,
    status: "open" | "in_progress" | "resolved" | "closed"
  ) => {
    return api<SupportTicket>(`/support-chat/tickets/${ticketId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  /**
   * Get all escalated tickets (admin only)
   */
  getAdminTickets: async () => {
    return api<SupportTicket[]>(`/support-chat/admin/tickets`);
  },

  /**
   * Admin reply to ticket
   */
  adminReply: async (
    ticketId: string,
    payload: {
      content: string;
      status?: "open" | "in_progress" | "resolved" | "closed";
    }
  ) => {
    return api<SupportTicket>(`/support-chat/admin/tickets/${ticketId}/reply`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Delete a ticket
   */
  deleteTicket: async (ticketId: string) => {
    return api<{ success: boolean }>(`/support-chat/tickets/${ticketId}`, {
      method: "DELETE",
    });
  },
};
