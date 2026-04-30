import {
  Body, Controller, Delete, Get, Param,
  Patch, Post, UseGuards, BadRequestException,
  HttpException, HttpStatus, Request, NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SupportChatService } from "./support-chat.service";
import { SupportTicketEntity } from "./entities/support-ticket.entity";
import { SupportMessageEntity } from "./entities/support-message.entity";
import { CreateSupportMessageDto, UpdateSupportTicketDto, AdminReplyDto } from "./dto/support-chat.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

interface JwtUser { id: string; email: string; role: string; businessId?: string; name?: string; }

/** Safe businessId extraction — never throws */
function extractBusinessId(req: any): string | null {
  const u = req.user as JwtUser;
  return u?.businessId || (req.user as any)?.business?.id || null;
}

@Controller("support-chat")
export class SupportChatController {
  constructor(
    private readonly service: SupportChatService,
    @InjectRepository(SupportTicketEntity)
    private readonly ticketRepo: Repository<SupportTicketEntity>,
    @InjectRepository(SupportMessageEntity)
    private readonly messageRepo: Repository<SupportMessageEntity>,
  ) {}

  // ── POST /messages ─────────────────────────────────────────────────────────
  @Post("messages")
  @UseGuards(JwtAuthGuard)
  async submitMessage(@Request() req: any, @Body() dto: CreateSupportMessageDto) {
    try {
      const user = req.user as JwtUser;
      const businessId = extractBusinessId(req) ?? user.id;
      console.log(`[Controller] submitMessage business:${businessId} user:${user.id}`);
      return await this.service.submitMessage(businessId, user.id, dto, user.name ?? "Business");
    } catch (err: any) {
      console.error("[Controller] submitMessage error:", err.message);
      // Return friendly response instead of 500
      return { success: false, error: "Le service IA est occupé. Réessayez dans quelques secondes." };
    }
  }

  // ── POST /escalate ─────────────────────────────────────────────────────────
  @Post("escalate")
  @UseGuards(JwtAuthGuard)
  async escalateToAdmin(@Request() req: any, @Body() dto: any) {
    try {
      const user = req.user as JwtUser;
      const businessId = extractBusinessId(req) ?? user.id;
      return await this.service.escalateToAdmin(businessId, user.id, dto.message ?? "Demande d'escalade", "Business");
    } catch (err: any) {
      console.error("[Controller] escalate error:", err.message);
      return { success: false, message: err.message };
    }
  }

  // ── GET /tickets ───────────────────────────────────────────────────────────
  @Get("tickets")
  @UseGuards(JwtAuthGuard)
  async getUserTickets(@Request() req: any) {
    const user = req.user as JwtUser;
    const businessId = extractBusinessId(req) ?? user.id;
    if (!businessId) return [];
    return this.service.getUserTickets(businessId, user.id);
  }

  // ── GET /tickets/:id ───────────────────────────────────────────────────────
  @Get("tickets/:id")
  @UseGuards(JwtAuthGuard)
  async getTicket(@Request() req: any, @Param("id") ticketId: string) {
    const user = req.user as JwtUser;
    const businessId = extractBusinessId(req) ?? user.id;
    return this.service.getTicket(businessId, ticketId, user.id);
  }

  // ── GET /tickets/:id/messages ──────────────────────────────────────────────
  @Get("tickets/:id/messages")
  @UseGuards(JwtAuthGuard)
  async getTicketMessages(@Param("id") id: string) {
    return this.messageRepo.find({ where: { ticketId: id }, order: { createdAt: "ASC" } });
  }

  // ── PATCH /tickets/:id ─────────────────────────────────────────────────────
  @Patch("tickets/:id")
  @UseGuards(JwtAuthGuard)
  async updateTicket(@Request() req: any, @Param("id") ticketId: string, @Body() dto: UpdateSupportTicketDto) {
    const user = req.user as JwtUser;
    const businessId = extractBusinessId(req) ?? user.id;
    if (!dto.status) throw new BadRequestException("Status is required");
    return this.service.updateTicketStatus(businessId, ticketId, dto.status as any);
  }

  // ── DELETE /tickets/:id ────────────────────────────────────────────────────
  @Delete("tickets/:id")
  @UseGuards(JwtAuthGuard)
  async deleteTicket(@Request() req: any, @Param("id") id: string) {
    const user = req.user as JwtUser;
    const businessId = extractBusinessId(req) ?? user.id;
    const ticket = await this.ticketRepo.findOne({ where: { id, businessId } });
    if (!ticket) throw new NotFoundException("Ticket not found");
    await this.messageRepo.delete({ ticketId: id });
    await this.ticketRepo.delete(id);
    return { success: true };
  }

  // ── POST /tickets/new ──────────────────────────────────────────────────────
  @Post("tickets/new")
  @UseGuards(JwtAuthGuard)
  async createNewTicket(@Request() req: any) {
    const user = req.user as JwtUser;
    const businessId = extractBusinessId(req) ?? user.id;
    await this.service.closeOpenTickets(businessId, user.id);
    return { success: true };
  }

  // ── GET /admin/tickets ─────────────────────────────────────────────────────
  @Get("admin/tickets")
  @UseGuards(JwtAuthGuard)
  async getAdminTickets(@Request() req: any) {
    console.log("[Controller] getAdminTickets - user:", JSON.stringify(req.user));
    return this.service.getAllTicketsWithOwnerInfo();
  }

  // ── POST /admin/tickets/:id/reply ──────────────────────────────────────────
  @Post("admin/tickets/:id/reply")
  @UseGuards(JwtAuthGuard)
  async adminReply(@Param("id") ticketId: string, @Body() dto: AdminReplyDto) {
    return this.service.adminReplyByTicketId(ticketId, dto);
  }

  // ── PATCH /admin/tickets/:id/status ───────────────────────────────────────
  @Patch("admin/tickets/:id/status")
  @UseGuards(JwtAuthGuard)
  async updateTicketStatusAdmin(@Param("id") ticketId: string, @Body() body: { status: string }) {
    if (!body?.status) throw new BadRequestException("Status is required");
    return this.service.updateTicketStatusById(ticketId, body.status);
  }
}
