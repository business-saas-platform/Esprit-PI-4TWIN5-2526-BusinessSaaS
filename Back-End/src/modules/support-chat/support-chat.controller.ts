import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  BadRequestException,
  HttpException,
  HttpStatus,
  Request,
  ForbiddenException,
} from "@nestjs/common";
import { SupportChatService } from "./support-chat.service";
import {
  CreateSupportMessageDto,
  UpdateSupportTicketDto,
  AdminReplyDto,
} from "./dto/support-chat.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PlatformAdminDbGuard } from "../../common/guards/platform-admin-db.guard";

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  businessId?: string;
  name?: string;
}

@Controller("support-chat")
export class SupportChatController {
  constructor(private readonly service: SupportChatService) {}

  /**
   * Extract businessId from JWT or request context
   */
  private getBusinessId(req: any): string {
    const user = req.user as AuthenticatedUser;
    const businessId = user?.businessId;
    
    if (!businessId) {
      throw new ForbiddenException("Business context not found in token");
    }
    
    return businessId;
  }

  /**
   * Submit a message (create or update ticket with AI response)
   * POST /api/support-chat/messages
   */
  @Post("messages")
  @UseGuards(JwtAuthGuard)
  async submitMessage(
    @Request() req: any,
    @Body() dto: CreateSupportMessageDto
  ) {
    try {
      const businessId = this.getBusinessId(req);
      const user = req.user as AuthenticatedUser;
      
      if (!user?.id) throw new BadRequestException("User ID is required");

      const businessName = user.name || "Your Business";

      console.log(`[Controller] submitMessage called for business: ${businessId}, user: ${user.id}`);
      const result = await this.service.submitMessage(businessId, user.id, dto, businessName);
      console.log(`[Controller] submitMessage result:`, result);
      return result;
    } catch (error: any) {
      console.error("[Controller] submitMessage error:", error.message);
      throw new HttpException(
        `Error processing message: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Escalate to admin
   * POST /api/support-chat/escalate
   */
  @Post("escalate")
  @UseGuards(JwtAuthGuard)
  async escalateToAdmin(
    @Request() req: any,
    @Body() dto: any
  ) {
    try {
      const user = req.user as AuthenticatedUser;
      const businessId = user?.businessId; // May be undefined for admin
      
      if (!user?.id) throw new BadRequestException("User ID is required");

      console.log(`[Controller] escalateToAdmin called for user: ${user.id}, businessId: ${businessId}`);
      const result = await this.service.escalateToAdmin(
        businessId,
        user.id,
        dto.message || "Demande d'escalade",
        "Your Business"
      );
      console.log(`[Controller] escalateToAdmin result:`, result);
      return result;
    } catch (error: any) {
      console.error("[Controller] escalateToAdmin error:", error.message);
      throw new HttpException(
        `Error during escalation: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get all tickets for the current user
   * GET /api/support-chat/tickets
   */
  @Get("tickets")
  @UseGuards(JwtAuthGuard)
  async getUserTickets(@Request() req: any) {
    const businessId = this.getBusinessId(req);
    const user = req.user as AuthenticatedUser;
    
    if (!user?.id) throw new BadRequestException("User ID is required");

    return this.service.getUserTickets(businessId, user.id);
  }

  /**
   * Get a specific ticket
   * GET /api/support-chat/tickets/:id
   */
  @Get("tickets/:id")
  @UseGuards(JwtAuthGuard)
  async getTicket(
    @Request() req: any,
    @Param("id") ticketId: string
  ) {
    const businessId = this.getBusinessId(req);
    const user = req.user as AuthenticatedUser;
    
    if (!user?.id) throw new BadRequestException("User ID is required");

    return this.service.getTicket(businessId, ticketId, user.id);
  }

  /**
   * Get all escalated tickets for admin
   * GET /api/support-chat/admin/tickets
   */
  @Get("admin/tickets")
  @UseGuards(JwtAuthGuard)
  async getAdminTickets(@Request() req: any) {
    const user = req.user as AuthenticatedUser;
    console.log(
      "[Controller] getAdminTickets called - user:",
      JSON.stringify(user)
    );

    // Admin sees ALL escalated tickets
    return this.service.getAllEscalatedTickets();
  }

  /**
   * Admin reply to ticket
   * POST /api/support-chat/admin/tickets/:id/reply
   */
  @Post("admin/tickets/:id/reply")
  @UseGuards(JwtAuthGuard)
  async adminReply(
    @Request() req: any,
    @Param("id") ticketId: string,
    @Body() dto: AdminReplyDto
  ) {
    // Admin can reply to any ticket - no businessId check needed
    // businessId will be queried from the ticket itself
    return this.service.adminReplyByTicketId(ticketId, dto);
  }

  /**
   * Update ticket status
   * PATCH /api/support-chat/tickets/:id
   */
  @Patch("tickets/:id")
  @UseGuards(JwtAuthGuard)
  async updateTicket(
    @Request() req: any,
    @Param("id") ticketId: string,
    @Body() dto: UpdateSupportTicketDto
  ) {
    const businessId = this.getBusinessId(req);
    const user = req.user as AuthenticatedUser;
    
    if (!user?.id) throw new BadRequestException("User ID is required");
    if (!dto.status) throw new BadRequestException("Status is required");

    return this.service.updateTicketStatus(
      businessId,
      ticketId,
      dto.status as any
    );
  }
}
