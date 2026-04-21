import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SupportTicketEntity } from "./entities/support-ticket.entity";
import { SupportMessageEntity } from "./entities/support-message.entity";
import {
  CreateSupportMessageDto,
  UpdateSupportTicketDto,
  AdminReplyDto,
} from "./dto/support-chat.dto";
import { toIso } from "../../common/api-mapper";

const OLLAMA_API_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3:latest";

@Injectable()
export class SupportChatService {
  constructor(
    @InjectRepository(SupportTicketEntity)
    private ticketRepo: Repository<SupportTicketEntity>,
    @InjectRepository(SupportMessageEntity)
    private messageRepo: Repository<SupportMessageEntity>
  ) {}

  /**
   * Check if Ollama is running
   */
  private async isOllamaAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await fetch(`${OLLAMA_API_URL}/api/tags`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response.ok;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Get business context data for system prompt
   * (In a real app, you'd fetch invoices, clients, expenses, etc.)
   */
  private async getBusinessContext(businessId: string): Promise<string> {
    // TODO: In production, fetch actual business data:
    // - Invoices summary
    // - Clients list
    // - Expenses summary
    // - Team members
    // For now, return placeholder
    return `Business ID: ${businessId}`;
  }

  /**
   * Build system prompt with business context data
   */
  private async buildSystemPrompt(
    businessId: string,
    businessName: string
  ): Promise<string> {
    try {
      // For now, return a rich business advisor prompt
      // In production, you would inject repositories to fetch real data
      return `Tu es ARIA (Assistant de Recommandation Intelligente pour les Affaires).
Tu es un expert en stratégie business, marketing, et finance d'entreprise français.
Tu parles TOUJOURS en français, professionnel et bienveillant.
Tu donnes des conseils CONCRETS et ACTIONNABLES.

TU ES CAPABLE DE:
1. 📈 Générer des PLANS MARKETING personnalisés
2. 💡 Donner des CONSEILS BUSINESS basés sur les données
3. 📊 Analyser les FINANCES et recommander des améliorations
4. 🎯 Fournir des RECOMMANDATIONS PRIORITAIRES

RÈGLES:
- Réponds avec des données chiffrées de l'entreprise si disponibles
- Sois direct, donne des conseils concrets, pas génériques
- Structure avec emojis et sections claires
- Maximum 300 mots sauf si plan détaillé demandé
- JAMAIS mentionner les IDs techniques ou détails système
- Si hors sujet business, ramène vers le sujet diplomatiquement
- Propose toujours des ACTIONS CONCRÈTES à faire

Entreprise: ${businessName}`;
    } catch (error) {
      console.error("Error building system prompt:", error);
      return "Tu es un assistant business expert en français.";
    }
  }

  /**
   * Call Ollama API for AI response (streaming)
   */
  private async callOllama(
    messages: { role: string; content: string }[],
    systemPrompt: string
  ): Promise<string> {
    try {
      console.log(`[Ollama] Calling model: ${OLLAMA_MODEL}`);
      console.log(`[Ollama] URL: ${OLLAMA_API_URL}/api/chat`);
      console.log(`[Ollama] Messages count: ${messages.length}`);

      const payload = {
        model: OLLAMA_MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: false,
        temperature: 0.7,
      };

      console.log("[Ollama] Payload:", JSON.stringify(payload).substring(0, 200));

      // Add timeout for Ollama request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(`${OLLAMA_API_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log(`[Ollama] Response status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Ollama] Error response: ${errorText}`);
          throw new Error(`Ollama returned ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log("[Ollama] Raw response:", JSON.stringify(data).substring(0, 500));

        // Handle multiple possible response formats
        const content =
          data.message?.content ||
          data.response ||
          data.choices?.[0]?.message?.content ||
          data.text ||
          "Je n'ai pas pu générer une réponse.";

        if (!content || content.length === 0) {
          throw new Error("Empty response from Ollama");
        }

        console.log("[Ollama] Extracted content:", content.substring(0, 200));
        return content;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error: any) {
      console.error("[Ollama] Call failed:", error.message);
      
      // FALLBACK: Return mock response for testing if Ollama is slow/unavailable
      if (error.name === "AbortError") {
        console.warn("[Ollama] Request timeout - using fallback mock response");
        return "Je suis en train de traiter votre demande. Le service IA est actuellement occupé. Veuillez réessayer dans quelques secondes.";
      }
      
      throw new Error(`Ollama API error: ${error.message}`);
    }
  }

  /**
   * Detect if user wants to escalate to human
   */
  private shouldEscalate(userMessage: string, failedCount: number): boolean {
    // Only escalate if explicitly requested for human/admin
    const escalationKeywords = [
      "parler à un humain",
      "contacter admin",
      "parlez avec un agent",
      "agent humain",
    ];

    const lowerMessage = userMessage.toLowerCase();
    const hasEscalationKeyword = escalationKeywords.some((kw) =>
      lowerMessage.includes(kw)
    );

    // Escalate if:
    // 1. User explicitly requested a human/agent
    // 2. After 3 consecutive failed AI responses
    return hasEscalationKeyword || failedCount >= 3;
  }

  /**
   * Create or update ticket with user message and get AI response
   */
  async submitMessage(
    businessId: string,
    userId: string,
    dto: CreateSupportMessageDto,
    businessName: string
  ): Promise<any> {
    // Check if Ollama is available
    const ollamaAvailable = await this.isOllamaAvailable();

    if (!ollamaAvailable) {
      return {
        success: false,
        error: "Le service IA est temporairement indisponible.",
      };
    }

    // Find or create ticket
    let ticket = await this.ticketRepo.findOne({
      where: { businessId, userId, status: "open" },
      relations: ["messages"],
    });

    if (!ticket) {
      // Create new ticket
      ticket = this.ticketRepo.create({
        businessId,
        userId,
        title: dto.title || "Nouvelle demande de support",
        description: dto.description || undefined,
        status: "open",
        escalatedToAdmin: false,
        failedAIResponseCount: 0,
        messages: [],
      });
      ticket = await this.ticketRepo.save(ticket);
    }

    // Save user message
    const userMsg = this.messageRepo.create({
      ticketId: ticket.id,
      content: dto.content,
      sender: "user",
      isAIResponse: false,
    });
    await this.messageRepo.save(userMsg);

    // Check if should escalate
    const shouldEscalate = this.shouldEscalate(
      dto.content,
      ticket.failedAIResponseCount
    );

    if (shouldEscalate && !ticket.escalatedToAdmin) {
      // Escalate to admin
      ticket.escalatedToAdmin = true;
      ticket.status = "in_progress";
      ticket = await this.ticketRepo.save(ticket);

      const escalationMsg = this.messageRepo.create({
        ticketId: ticket.id,
        content:
          "Votre demande a été transmise à l'administrateur. Vous recevrez une réponse bientôt.",
        sender: "ai",
        isAIResponse: false,
      });
      await this.messageRepo.save(escalationMsg);

      return {
        success: true,
        ticketId: ticket.id,
        escalated: true,
        message:
          "Votre demande a été transmise à l'administrateur. Vous recevrez une réponse bientôt.",
        aiResponse: false,
      };
    }

    // Get AI response
    try {
      const systemPrompt = await this.buildSystemPrompt(businessId, businessName);

      const conversationMessages = ticket.messages.map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content,
      }));

      const aiResponse = await this.callOllama(conversationMessages, systemPrompt);

      // Save AI response
      const aiMsg = this.messageRepo.create({
        ticketId: ticket.id,
        content: aiResponse,
        sender: "ai",
        isAIResponse: true,
      });
      await this.messageRepo.save(aiMsg);

      // Reload ticket with new messages
      const reloadedTicket = await this.ticketRepo.findOne({
        where: { id: ticket.id },
        relations: ["messages"],
      });

      if (!reloadedTicket) {
        throw new Error("Failed to reload ticket");
      }

      return {
        success: true,
        ticketId: ticket.id,
        escalated: false,
        aiResponse: aiResponse,
        messages: reloadedTicket.messages.map((m) => this.toApi(m)),
      };
    } catch (error: any) {
      console.error("AI Error:", error.message);

      // Increment failed count
      ticket.failedAIResponseCount = (ticket.failedAIResponseCount || 0) + 1;
      ticket = await this.ticketRepo.save(ticket);

      // If too many failures, escalate
      if (ticket.failedAIResponseCount >= 3) {
        ticket.escalatedToAdmin = true;
        ticket.status = "in_progress";
        ticket = await this.ticketRepo.save(ticket);

        const escalationMsg = this.messageRepo.create({
          ticketId: ticket.id,
          content:
            "Désolé, le service IA est temporairement indisponible. Votre demande a été transmise à un agent humain.",
          sender: "ai",
          isAIResponse: false,
        });
        await this.messageRepo.save(escalationMsg);

        return {
          success: false,
          ticketId: ticket.id,
          escalated: true,
          error:
            "Désolé, je n\'ai pas pu répondre à votre question. Un agent humain vous aidera bientôt.",
        };
      }

      return {
        success: false,
        error: "Erreur lors du traitement. Veuillez réessayer.",
      };
    }
  }

  /**
   * Get all tickets for a user
   */
  async getUserTickets(businessId: string, userId: string) {
    const tickets = await this.ticketRepo.find({
      where: { businessId, userId },
      relations: ["messages"],
      order: { createdAt: "DESC" },
    });
    return tickets.map((t) => this.toApiTicket(t));
  }

  /**
   * Get single ticket with messages
   */
  async getTicket(businessId: string, ticketId: string, userId: string) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, businessId, userId },
      relations: ["messages"],
    });

    if (!ticket) throw new NotFoundException("Ticket not found");
    return this.toApiTicket(ticket);
  }

  /**
   * Get all escalated tickets for admin
   */
  async getAdminTickets(businessId: string) {
    const tickets = await this.ticketRepo.find({
      where: { businessId, escalatedToAdmin: true },
      relations: ["messages"],
      order: { createdAt: "DESC" },
    });
    return tickets.map((t) => this.toApiTicket(t));
  }

  /**
   * Get ALL escalated tickets across all businesses (admin only)
   */
  async getAllEscalatedTickets() {
    const tickets = await this.ticketRepo.find({
      where: { escalatedToAdmin: true },
      relations: ["messages"],
      order: { createdAt: "DESC" },
    });
    return tickets.map((t) => this.toApiTicket(t));
  }

  /**
   * Admin reply to ticket
   */
  async adminReply(
    businessId: string,
    ticketId: string,
    dto: AdminReplyDto
  ) {
    let ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, businessId },
      relations: ["messages"],
    });

    if (!ticket) throw new NotFoundException("Ticket not found");

    // Update status if provided
    if (dto.status) {
      ticket.status = dto.status as any;
    }

    await this.ticketRepo.save(ticket);

    // Save admin message
    const adminMsg = this.messageRepo.create({
      ticketId: ticket.id,
      content: dto.content,
      sender: "admin",
      isAIResponse: false,
    });
    await this.messageRepo.save(adminMsg);

    // Reload for response
    ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: ["messages"],
    });

    if (!ticket) throw new NotFoundException("Ticket not found");
    return this.toApiTicket(ticket);
  }

  /**
   * Admin reply to ticket by ID (for admin routes that don't have businessId)
   */
  async adminReplyByTicketId(ticketId: string, dto: AdminReplyDto) {
    let ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: ["messages"],
    });

    if (!ticket) throw new NotFoundException("Ticket not found");

    // Update status if provided
    if (dto.status) {
      ticket.status = dto.status as any;
    }

    await this.ticketRepo.save(ticket);

    // Save admin message
    const adminMsg = this.messageRepo.create({
      ticketId: ticket.id,
      content: dto.content,
      sender: "admin",
      isAIResponse: false,
    });
    await this.messageRepo.save(adminMsg);

    // Reload for response
    ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: ["messages"],
    });

    if (!ticket) throw new NotFoundException("Ticket not found");
    return this.toApiTicket(ticket);
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(
    businessId: string,
    ticketId: string,
    status: "open" | "in_progress" | "resolved" | "closed"
  ) {
    let ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, businessId },
    });

    if (!ticket) throw new NotFoundException("Ticket not found");

    ticket.status = status;
    if (status === "resolved" || status === "closed") {
      ticket.resolvedAt = new Date();
    }

    const saved = await this.ticketRepo.save(ticket);
    return this.toApiTicket(saved);
  }

  /**
   * Escalate to admin (called when user requests human support)
   */
  async escalateToAdmin(
    businessId: string | undefined,
    userId: string,
    message: string,
    businessName: string
  ) {
    try {
      console.log(
        `[Escalation] Starting escalation for business: ${businessId}, user: ${userId}`
      );

      // Find or create an open ticket
      let ticket = await this.ticketRepo.findOne({
        where: { businessId, userId, status: "open" },
        relations: ["messages"],
      });

      if (!ticket) {
        // Create new ticket for escalation
        console.log(
          `[Escalation] Creating new ticket for businessId: ${businessId}`
        );
        ticket = this.ticketRepo.create({
          businessId,
          userId,
          title: "Demande de support humain",
          description: "Utilisateur a demandé à parler à un administrateur",
          status: "open",
          escalatedToAdmin: true,
          failedAIResponseCount: 0,
          messages: [],
        });
        ticket = await this.ticketRepo.save(ticket);
        console.log(`[Escalation] Ticket created: ${ticket.id}`);
      } else {
        // Update existing ticket
        console.log(
          `[Escalation] Updating existing ticket: ${ticket.id}`
        );
        ticket.escalatedToAdmin = true;
        ticket.status = "open";
        ticket = await this.ticketRepo.save(ticket);
      }

      // Save user message
      const userMsg = this.messageRepo.create({
        ticketId: ticket.id,
        content: message,
        sender: "user",
        isAIResponse: false,
      });
      await this.messageRepo.save(userMsg);
      console.log(`[Escalation] User message saved`);

      // Save escalation message
      const escalationMsg = this.messageRepo.create({
        ticketId: ticket.id,
        content:
          "👤 Transfert vers un administrateur en cours...\n\n✅ Votre conversation a été transmise à notre équipe.\nUn administrateur humain vous répondra directement très bientôt.\n\nMerci de votre patience!",
        sender: "ai",
        isAIResponse: false,
      });
      await this.messageRepo.save(escalationMsg);
      console.log(`[Escalation] Escalation message saved`);

      // Reload and return
      const reloadedTicket = await this.ticketRepo.findOne({
        where: { id: ticket.id },
        relations: ["messages"],
      });

      if (!reloadedTicket) {
        throw new Error("Failed to reload ticket");
      }

      console.log(
        `[Escalation] Ticket escalation complete: ${reloadedTicket.id}`
      );

      return {
        success: true,
        ticketId: ticket.id,
        escalated: true,
        message:
          "Vous allez être transféré vers un administrateur.",
        messages: reloadedTicket.messages.map((m) => this.toApi(m)),
      };
    } catch (error: any) {
      console.error("[Escalation] Error:", error);
      throw new Error(`Escalation failed: ${error.message}`);
    }
  }

  private toApiTicket(ticket: SupportTicketEntity) {
    return {
      id: ticket.id,
      businessId: ticket.businessId,
      userId: ticket.userId,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      escalatedToAdmin: ticket.escalatedToAdmin,
      failedAIResponseCount: ticket.failedAIResponseCount,
      messages: ticket.messages.map((m) => this.toApi(m)),
      createdAt: toIso(ticket.createdAt),
      updatedAt: toIso(ticket.updatedAt),
      resolvedAt: ticket.resolvedAt ? toIso(ticket.resolvedAt) : null,
    };
  }

  private toApi(msg: SupportMessageEntity) {
    return {
      id: msg.id,
      ticketId: msg.ticketId,
      sender: msg.sender,
      content: msg.content,
      isAIResponse: msg.isAIResponse,
      createdAt: toIso(msg.createdAt),
    };
  }
}
