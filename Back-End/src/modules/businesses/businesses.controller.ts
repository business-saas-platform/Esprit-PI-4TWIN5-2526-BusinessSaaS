import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
} from "@nestjs/common";
import { BusinessesService } from "./businesses.service";
import { CreateBusinessDto } from "./dto/create-business.dto";
import { UpdateBusinessDto } from "./dto/update-business.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { BusinessAccessGuard } from "../../common/guards/business-access.guard";

@Controller("businesses")
@UseGuards(JwtAuthGuard)
export class BusinessesController {
  constructor(private readonly s: BusinessesService) {}

  @Get()
  listMine(@Req() req: any) {
    return this.s.listByOwner(req.user.id);
  }

  @Get("all")
  findAll(@Req() req: any) {
    if (req.user.role !== "platform_admin") {
      throw new ForbiddenException("Only platform admin can access all businesses");
    }
    return this.s.findAll();
  }

  // ADMIN CREATE
  @Post("admin")
  createAsAdmin(@Req() req: any, @Body() dto: CreateBusinessDto) {
    if (req.user.role !== "platform_admin") {
      throw new ForbiddenException("Only platform admin can create businesses");
    }
    return this.s.create(dto);
  }

  // ADMIN UPDATE
  @Patch("admin/:id")
  updateAsAdmin(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: UpdateBusinessDto
  ) {
    if (req.user.role !== "platform_admin") {
      throw new ForbiddenException("Only platform admin can update businesses");
    }
    return this.s.update(id, dto);
  }

  // ADMIN DELETE ONE
  @Delete("admin/:id")
  removeAsAdmin(@Req() req: any, @Param("id") id: string) {
    if (req.user.role !== "platform_admin") {
      throw new ForbiddenException("Only platform admin can delete businesses");
    }
    return this.s.remove(id);
  }

  // ADMIN DELETE ALL
  @Delete("admin/all")
  removeAllAsAdmin(@Req() req: any) {
    if (req.user.role !== "platform_admin") {
      throw new ForbiddenException("Only platform admin can delete all businesses");
    }
    return this.s.removeAll();
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateBusinessDto) {
    return this.s.createForOwner(req.user.id, dto);
  }

  @Patch(":id/profile")
  completeProfile(@Param("id") id: string, @Req() req: any, @Body() dto: any) {
    return this.s.completeProfile(id, req.user.id, dto);
  }

  @UseGuards(BusinessAccessGuard)
  @Get("current/one")
  current(@Req() req: any) {
    return this.s.getById(req.businessId);
  }

  @UseGuards(BusinessAccessGuard)
  @Get(":id")
  getById(@Req() req: any, @Param("id") id: string) {
    req.businessId = id;
    return this.s.getById(req.businessId);
  }

  @Patch(":id")
  update(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateBusinessDto) {
    return this.s.updateForOwner(req.user.id, id, dto);
  }

  @Delete(":id")
  remove(@Req() req: any, @Param("id") id: string) {
    return this.s.removeForOwner(req.user.id, id);
  }
}