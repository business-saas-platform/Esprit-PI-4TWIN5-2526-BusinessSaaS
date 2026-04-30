import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { TeamMembersService } from "./team-members.service";
import { CreateTeamMemberDto } from "./dto/create-team-member.dto";
import { UpdateTeamMemberDto } from "./dto/update-team-member.dto";
import { InviteTeamMemberDto } from "./dto/invite-team-member.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OwnerGuard } from "../auth/owner.guard";
import { BusinessId } from "../../common/decorators/business-id.decorator";

@UseGuards(JwtAuthGuard)
@Controller("team-members")
export class TeamMembersController {
  constructor(private s: TeamMembersService) {}

  @UseGuards(OwnerGuard)
  @Post("invite")
  invite(@Req() req: any, @Body() dto: InviteTeamMemberDto) {
    return this.s.inviteForOwner(req.user, dto);
  }

  @UseGuards(OwnerGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreateTeamMemberDto) {
    return this.s.createForOwner(req.user, dto);
  }

@Get()
findAll(@Req() req: any, @BusinessId() businessId: string) {
  return this.s.findAllForUser(req.user, businessId);
}

  @Get(":id")
  findOne(@Req() req: any, @Param("id") id: string) {
    return this.s.findOneForUser(req.user, id);
  }

  @UseGuards(OwnerGuard)
  @Patch(":id")
  update(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateTeamMemberDto) {
    return this.s.updateForOwner(req.user, id, dto);
  }

  @UseGuards(OwnerGuard)
  @Delete(":id")
  remove(@Req() req: any, @Param("id") id: string) {
    return this.s.removeForOwner(req.user, id);
  }

  // ── HR Profile (for ML risk scoring) ─────────────────────────────────────
  @UseGuards(OwnerGuard)
  @Patch(":id/hr-profile")
  updateHrProfile(@Req() req: any, @Param("id") id: string, @Body() dto: any) {
    return this.s.updateHrProfile(req.user, id, dto);
  }
}