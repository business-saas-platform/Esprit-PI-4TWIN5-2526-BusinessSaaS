import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import { RegistrationRequestsService } from "./registration-requests.service";
import { CreateRegistrationRequestDto } from "./dto/create-registration-request.dto";
import { ApproveRequestDto, RejectRequestDto } from "./dto/review-request.dto";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PlatformAdminDbGuard } from "../../common/guards/platform-admin-db.guard";

import {
  PaymentStatus,
  RegistrationStatus,
} from "./enums/registration-request.enums";

@Controller("registration-requests")
export class RegistrationRequestsController {
  constructor(private readonly service: RegistrationRequestsService) {}

  // =====================================================
  // PUBLIC — Owner submits registration request
  // =====================================================
  @Post()
  create(@Body() dto: CreateRegistrationRequestDto) {
    return this.service.create(dto);
  }

  // =====================================================
  // ADMIN — List requests
  // Example:
  // GET /registration-requests
  // GET /registration-requests?status=pending
  // GET /registration-requests?paymentStatus=paid
  // GET /registration-requests?status=pending&paymentStatus=pending
  // =====================================================
  @UseGuards(JwtAuthGuard, PlatformAdminDbGuard)
  @Get()
  list(
    @Query("status") status?: RegistrationStatus,
    @Query("paymentStatus") paymentStatus?: PaymentStatus
  ) {
    return this.service.list(status, paymentStatus);
  }

  // =====================================================
  // ADMIN — Get one request details
  // =====================================================
  @UseGuards(JwtAuthGuard, PlatformAdminDbGuard)
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  // =====================================================
  // ADMIN — Approve request
  // =====================================================
  @UseGuards(JwtAuthGuard, PlatformAdminDbGuard)
  @Post(":id/approve")
  approve(
    @Param("id") id: string,
    @Req() req: any,
    @Body() dto: ApproveRequestDto
  ) {
    return this.service.approve(
      id,
      { id: req.user.sub, role: req.user.role },
      dto
    );
  }

  // =====================================================
  // ADMIN — Reject request
  // =====================================================
  @UseGuards(JwtAuthGuard, PlatformAdminDbGuard)
  @Post(":id/reject")
  reject(
    @Param("id") id: string,
    @Req() req: any,
    @Body() dto: RejectRequestDto
  ) {
    return this.service.reject(
      id,
      { id: req.user.sub, role: req.user.role },
      dto
    );
  }

  // =====================================================
  // ADMIN — Create mock payment session
  // =====================================================
  @UseGuards(JwtAuthGuard, PlatformAdminDbGuard)
  @Post(":id/mock-payment/create")
  createMockPayment(@Param("id") id: string) {
    return this.service.createMockPayment(id);
  }

  // =====================================================
  // PUBLIC OR ADMIN — Mock payment success
  // You can keep this public for easy testing
  // =====================================================
  @Post(":id/mock-payment/success")
  mockPaymentSuccess(@Param("id") id: string) {
    return this.service.mockPaymentSuccess(id);
  }

  // =====================================================
  // PUBLIC OR ADMIN — Mock payment fail
  // You can keep this public for easy testing
  // =====================================================
  @Post(":id/mock-payment/fail")
  mockPaymentFail(@Param("id") id: string) {
    return this.service.mockPaymentFail(id);
  }

  // =====================================================
  // ADMIN — Update payment status manually
  // Example body:
  // {
  //   "paymentStatus": "paid",
  //   "paymentReference": "CASH-001"
  // }
  // =====================================================
  @UseGuards(JwtAuthGuard, PlatformAdminDbGuard)
  @Patch(":id/payment-status")
  updatePaymentStatus(
    @Param("id") id: string,
    @Req() req: any,
    @Body()
    body: {
      paymentStatus: PaymentStatus;
      paymentReference?: string;
    }
  ) {
    return this.service.updatePaymentStatus(
      id,
      { id: req.user.sub, role: req.user.role },
      body.paymentStatus,
      body.paymentReference
    );
  }
}