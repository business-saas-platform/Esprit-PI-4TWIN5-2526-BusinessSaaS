import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SupportTicketEntity } from "./entities/support-ticket.entity";
import { SupportMessageEntity } from "./entities/support-message.entity";
import { BusinessEntity } from "../businesses/entities/business.entity";
import { InvoiceEntity } from "../invoices/entities/invoice.entity";
import { ExpenseEntity } from "../expenses/entities/expense.entity";
import { ClientEntity } from "../clients/entities/client.entity";
import { UserEntity } from "../users/entities/user.entity";
import {
  CreateSupportMessageDto,
  UpdateSupportTicketDto,
  AdminReplyDto,
} from "./dto/support-chat.dto";
import { toIso } from "../../common/api-mapper";

const OLLAMA_API_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL   = process.env.OLLAMA_MODEL || "llama3:latest";

@Injectable()
export class SupportChatService {
  constructor(
    @InjectRepository(SupportTicketEntity)
    private ticketRepo: Repository<SupportTicketEntity>,
    @InjectRepository(SupportMessageEntity)
    private messageRepo: Repository<SupportMessageEntity>,
    @InjectRepository(BusinessEntity)
    private businessRepo: Repository<BusinessEntity>,
    @InjectRepository(InvoiceEntity)
    private invoiceRepo: Repository<InvoiceEntity>,
    @InjectRepository(ExpenseEntity)
    private expenseRepo: Repository<ExpenseEntity>,
    @InjectRepository(ClientEntity)
    private clientRepo: Repository<ClientEntity>,
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>
  ) {}

  // Read at runtime so .env is loaded
  private get groqKey()  { return process.env.GROQ_API_KEY || ""; }
  private get groqModel(){ return process.env.GROQ_MODEL || "llama-3.1-8b-instant"; }
  private get useGroq()  { const k = this.groqKey; return !!k && k !== "your_groq_api_key_here"; }

  /**
   * Close all open tickets for a user (start fresh)
   */
  async closeOpenTickets(businessId: string, userId: string) {
    await this.ticketRepo.update(
      { businessId, userId, status: "open" },
      { status: "closed", resolvedAt: new Date() }
    );
    return { success: true };
  }

  /**
   * Check if AI service is available
   */
  private async isOllamaAvailable(): Promise<boolean> {
    if (this.useGroq) return true;
    try {
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(`${OLLAMA_API_URL}/api/tags`, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response.ok;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch {
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
   * Call AI — uses Groq if API key set, otherwise falls back to Ollama
   */
  private async callOllama(
    messages: { role: string; content: string }[],
    systemPrompt: string
  ): Promise<string> {
    if (this.useGroq) {
      console.log(`[Groq] Using Groq API with model: ${this.groqModel}`);
      return this.callGroq(messages, systemPrompt);
    }
    console.log(`[Ollama] Using local Ollama with model: ${OLLAMA_MODEL}`);
    return this.callOllamaLocal(messages, systemPrompt);
  }

  /**
   * Call Groq API (fast, cloud-based)
   */
  private async callGroq(
    messages: { role: string; content: string }[],
    systemPrompt: string
  ): Promise<string> {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${this.groqKey}`,
        },
        body: JSON.stringify({
          model:       this.groqModel,
          messages:    [{ role: "system", content: systemPrompt }, ...messages],
          temperature: 0.7,
          max_tokens:  1024,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.text();
        console.error(`[Groq] Error ${response.status}: ${err}`);
        // Fall back to Ollama on Groq error
        return this.callOllamaLocal(messages, systemPrompt);
      }

      const data    = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) throw new Error("Empty response from Groq");

      console.log(`[Groq] Response received (${content.length} chars)`);
      return content;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        return "Je suis en train de traiter votre demande. Veuillez réessayer dans quelques secondes.";
      }
      console.error("[Groq] Failed, falling back to Ollama:", error.message);
      return this.callOllamaLocal(messages, systemPrompt);
    }
  }

  /**
   * Call Ollama local (fallback)
   */
  private async callOllamaLocal(
    messages: { role: string; content: string }[],
    systemPrompt: string
  ): Promise<string> {
    console.log(`[Ollama] Calling model: ${OLLAMA_MODEL}`);

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${OLLAMA_API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model:       OLLAMA_MODEL,
          messages:    [{ role: "system", content: systemPrompt }, ...messages],
          stream:      false,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama returned ${response.status}`);
      }

      const data    = await response.json();
      const content = data.message?.content || data.response;

      if (!content) throw new Error("Empty response from Ollama");

      return content;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        return "Je suis en train de traiter votre demande. Le service IA est actuellement occupé. Veuillez réessayer dans quelques secondes.";
      }
      throw error;
    }
  }

  /**
   * Detect if user wants to escalate to human
   */
  private shouldEscalate(userMessage: string, failedCount: number): boolean {
    const escalationKeywords = [
      "parler à un humain",
      "contacter admin",
      "contacter l'admin",
      "parlez avec un agent",
      "agent humain",
      "je veux contacter",
      "parler à quelqu'un",
      "support humain",
      "un vrai humain",
      "parler à une personne",
      "besoin d'aide humaine",
      "transfert admin",
      "escalade",
      "speak to human",
      "contact admin",
      "human agent",
    ];

    const lowerMessage = userMessage.toLowerCase();
    const hasEscalationKeyword = escalationKeywords.some((kw) =>
      lowerMessage.includes(kw)
    );

    return hasEscalationKeyword || failedCount >= 3;
  }

  /**
   * Generate a short title from the first user message
   */
  private generateTitle(message: string): string {
    const cleaned = message.trim();
    if (cleaned.length <= 60) return cleaned;
    return cleaned.substring(0, 57) + '...';
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

    // Find or create ticket — look for open OR in_progress (not closed/resolved)
    let ticket = await this.ticketRepo.findOne({
      where: [
        { businessId, userId, status: "open" },
        { businessId, userId, status: "in_progress" },
      ],
      relations: ["messages"],
      order: { createdAt: "DESC" },
    });

    if (!ticket) {
      // Create new ticket with meaningful title from first message
      ticket = this.ticketRepo.create({
        businessId,
        userId,
        title: this.generateTitle(dto.content),
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
          "👤 Transfert vers un administrateur en cours...\n\n✅ Votre conversation a été transmise à notre équipe. Un administrateur vous répondra directement très bientôt.\n\nVous pouvez continuer à envoyer des messages.",
        sender: "ai",
        isAIResponse: false,
      });
      await this.messageRepo.save(escalationMsg);

      const reloaded = await this.ticketRepo.findOne({ where: { id: ticket.id }, relations: ["messages"] });
      return {
        success: true,
        ticketId: ticket.id,
        escalated: true,
        message: "Votre demande a été transmise à l'administrateur.",
        aiResponse: false,
        messages: reloaded?.messages.map((m) => this.toApi(m)) ?? [],
      };
    }

    // If already escalated — save user message and wait for admin (no AI response)
    if (ticket.escalatedToAdmin) {
      const reloaded = await this.ticketRepo.findOne({ where: { id: ticket.id }, relations: ["messages"] });
      return {
        success: true,
        ticketId: ticket.id,
        escalated: true,
        aiResponse: false,
        messages: reloaded?.messages.map((m) => this.toApi(m)) ?? [],
      };
    }

    // Get AI response
    try {
      // Fetch real data for system prompt (invoices, expenses, clients)
      let invoices: InvoiceEntity[] = [];
      let expenses: ExpenseEntity[] = [];
      let clients: ClientEntity[] = [];

      try {
        [expenses, clients, invoices] = await Promise.all([
          this.expenseRepo.find({ where: { businessId } }),
          this.clientRepo.find({ where: { businessId } }),
          this.invoiceRepo.find({ where: { businessId } }),
        ]);
      } catch (e: any) {
        console.error("DB fetch error:", e.message);
      }

      const totalRevenue = invoices
        .filter((i) => (i as any).status === "paid")
        .reduce((s, i) => s + Number((i as any).totalAmount || 0), 0);
      const totalExpenses = expenses.reduce((s, e) => s + Number((e as any).amount || 0), 0);
      const pendingInvoices = invoices.filter(
        (i) => (i as any).status !== "paid" || Number((i as any).paidAmount || 0) < Number((i as any).totalAmount || 0)
      );

      const systemPrompt = `Tu es ARIA, un assistant business expert.
Tu parles TOUJOURS en français.
Tu donnes des conseils CONCRETS basés sur les données réelles.
Tu ne mentionnes JAMAIS les IDs techniques.
Tu es professionnel et bienveillant.

DONNÉES RÉELLES DE L'ENTREPRISE:
━━━━━━━━━━━━━━━━━━━━━━━━
👥 Clients: ${clients.length}
📋 Factures totales: ${invoices.length}
💰 Revenus: ${totalRevenue.toFixed(2)} TND
💸 Dépenses: ${totalExpenses.toFixed(2)} TND
📈 Bénéfice net: ${(totalRevenue - totalExpenses).toFixed(2)} TND
⏳ Factures en attente: ${pendingInvoices.length}
   (${pendingInvoices.reduce((s,i) => s + Number((i as any).totalAmount||0),0).toFixed(2)} TND à récupérer)
━━━━━━━━━━━━━━━━━━━━━━━━

Tu peux générer:
- Plans marketing personnalisés avec ces chiffres
- Analyse des dépenses et recommandations
- Stratégies pour augmenter les revenus
- Conseils pour récupérer les factures impayées`;

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

      // Increment failed count — only if ticket has a valid id
      if (ticket?.id) {
        ticket.failedAIResponseCount = (ticket.failedAIResponseCount || 0) + 1;
        ticket = await this.ticketRepo.save(ticket);

        // If too many failures, escalate
        if (ticket.failedAIResponseCount >= 3) {
          ticket.escalatedToAdmin = true;
          ticket.status = "in_progress";
          ticket = await this.ticketRepo.save(ticket);

          const escalationMsg = this.messageRepo.create({
            ticketId: ticket.id,
            content: "Désolé, le service IA est temporairement indisponible. Votre demande a été transmise à un agent humain.",
            sender: "ai",
            isAIResponse: false,
          });
          await this.messageRepo.save(escalationMsg);

          return {
            success: false,
            ticketId: ticket.id,
            escalated: true,
            error: "Désolé, je n'ai pas pu répondre à votre question. Un agent humain vous aidera bientôt.",
          };
        }
      }

      return {
        success: false,
        ticketId: ticket?.id,
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
   * Get all escalated tickets with owner/business info for admin UI
   */
  async getAllTicketsWithOwnerInfo() {
    const tickets = await this.ticketRepo.find({
      where: { escalatedToAdmin: true },
      relations: ["messages"],
      order: { createdAt: "DESC" },
    });

    const ticketsWithOwner = await Promise.all(
      tickets.map(async (ticket) => {
        let ownerName = "Client inconnu";
        let ownerEmail = "";
        let businessName = "";

        try {
          if (ticket.businessId) {
            const business = await this.businessRepo.findOne({ where: { id: ticket.businessId } });
            if (business) {
              businessName = (business as any).name || '';
              if ((business as any).ownerId) {
                const owner = await this.userRepo.findOne({ where: { id: (business as any).ownerId } });
                if (owner) {
                  ownerName = owner.name || owner.email || owner.id;
                  ownerEmail = owner.email || '';
                }
              }
            }
          }
        } catch (e: any) {
          console.error('Error fetching owner:', e.message);
        }

        const firstUserMessage = ticket.messages?.find(m => m.sender === 'user');
        const title = firstUserMessage?.content
          ? (firstUserMessage.content.length > 50 ? firstUserMessage.content.substring(0,50) + '...' : firstUserMessage.content)
          : 'Demande de support humain';

        return {
          ...this.toApiTicket(ticket),
          ownerName,
          ownerEmail,
          businessName,
          title,
        };
      })
    );

    return ticketsWithOwner;
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
   * Admin: update ticket status by ticket id (no businessId check)
   */
  async updateTicketStatusById(ticketId: string, status: string) {
    let ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    ticket.status = status as any;
    if (status === 'resolved' || status === 'closed') {
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
