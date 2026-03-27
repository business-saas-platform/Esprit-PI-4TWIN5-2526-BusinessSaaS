import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Controller("users")
export class UsersController {
  constructor(private s: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.s.create(dto);
  }

  @Get()
  findAll() {
    return this.s.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.s.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.s.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.s.remove(id);
  }

  // =====================================================
  // ADMIN BUSINESS OWNERS
  // =====================================================

  @Get("admin/business-owners/all")
  listBusinessOwners() {
    return this.s.listBusinessOwners();
  }

  @Get("admin/business-owners/:id")
  getBusinessOwnerDetails(@Param("id") id: string) {
    return this.s.getBusinessOwnerDetails(id);
  }

  @Patch("admin/business-owners/:id/status")
  updateBusinessOwnerStatus(
    @Param("id") id: string,
    @Body() body: { status: "active" | "suspended" }
  ) {
    return this.s.updateBusinessOwnerStatus(id, body.status);
  }

  @Post("admin/business-owners/create-with-business")
  createBusinessOwnerWithBusiness(
    @Body()
    body: {
      user: CreateUserDto & { status?: string };
      business: {
        name: string;
        type: string;
        address: string;
        city: string;
        country: string;
        taxId: string;
        phone: string;
        email: string;
        website?: string;
        currency: string;
        fiscalYearStart: string;
        industry: string;
        taxRate: number;
        status?: string;
        plan?: string;
        subscriptionStartDate?: string;
        subscriptionEndDate?: string;
      };
    }
  ) {
    return this.s.createBusinessOwnerWithBusiness(body);
  }
}