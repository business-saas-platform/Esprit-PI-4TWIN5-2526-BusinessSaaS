import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomUUID } from "crypto";

import { TeamMemberEntity } from "./entities/team-member.entity";
import { TeamInvitationEntity } from "./entities/team-invitation.entity";
import { BusinessEntity } from "../businesses/entities/business.entity";
import { UserEntity } from "../users/entities/user.entity";
import { In } from "typeorm";

import { CreateTeamMemberDto } from "./dto/create-team-member.dto";
import { UpdateTeamMemberDto } from "./dto/update-team-member.dto";
import { InviteTeamMemberDto } from "./dto/invite-team-member.dto";

import { MailService } from "../mail/mail.service";

type JwtUser = {
  sub: string;
  email: string;
  role: string;
  businessId?: string;
  permissions?: string[];
};

@Injectable()
export class TeamMembersService {
  constructor(
    @InjectRepository(TeamMemberEntity)
    private readonly membersRepo: Repository<TeamMemberEntity>,

    @InjectRepository(TeamInvitationEntity)
    private readonly invitesRepo: Repository<TeamInvitationEntity>,

    @InjectRepository(BusinessEntity)
    private readonly businessRepo: Repository<BusinessEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    private readonly mailService: MailService
  ) {}

  // =============================
  // HELPERS
  // =============================
  private normalizeEmail(email: string) {
    return (email || "").trim().toLowerCase();
  }

  private async assertOwnerOwnsBusiness(ownerId: string, businessId: string) {
    const b = await this.businessRepo.findOne({
      where: { id: businessId, ownerId } as any,
    });
    if (!b) throw new ForbiddenException("You don't own this business");
    return b;
  }

  private async assertUserHasAccess(user: JwtUser, businessId: string) {
    if (user.role === "platform_admin") return true;

    if (user.role === "business_owner") {
      await this.assertOwnerOwnsBusiness(user.sub, businessId);
      return true;
    }

    const m = await this.membersRepo.findOne({
      where: { businessId, email: this.normalizeEmail(user.email) },
    });
    if (!m) throw new ForbiddenException("No access to this business");
    return true;
  }

  // =============================
  // INVITE (owner-only)
  // =============================
  async inviteForOwner(user: JwtUser, dto: InviteTeamMemberDto) {
    if (!dto.businessId) throw new BadRequestException("businessId is required");
    if (!dto.email) throw new BadRequestException("email is required");
    if (!dto.name) throw new BadRequestException("name is required");
    if (!dto.role) throw new BadRequestException("role is required");

    // ✅ owner check + get business name
    const business = await this.assertOwnerOwnsBusiness(user.sub, dto.businessId);

    const email = this.normalizeEmail(dto.email);

    // ✅ revoke old pending invites for same business+email
    await this.invitesRepo.update(
      { businessId: dto.businessId, email, status: "pending" as any },
      { status: "revoked" as any }
    );

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3); // 3 days

    // ✅ create invitation row
    const invitation = this.invitesRepo.create({
      businessId: dto.businessId,
      email,
      name: dto.name.trim(),
      role: dto.role as any,
      permissions: dto.permissions ?? [],
      token,
      expiresAt,
      status: "pending",
    } as Partial<TeamInvitationEntity>);

    const savedInvitation = await this.invitesRepo.save(invitation);

    // ✅ upsert team member as invited (FIXED: no array/null typing issues)
    const existingMember = await this.membersRepo.findOne({
      where: { businessId: dto.businessId, email },
    });

    let memberEntity: TeamMemberEntity;

    if (!existingMember) {
      memberEntity = this.membersRepo.create({
        businessId: dto.businessId,
        name: dto.name.trim(),
        email,
        role: dto.role as any,
        status: "invited",
        permissions: dto.permissions ?? [],
        joinedAt: null, // ✅ invited => null
      });
    } else {
      existingMember.name = dto.name.trim();
      existingMember.role = dto.role as any;
      existingMember.status = "invited";
      existingMember.permissions =
        dto.permissions ?? existingMember.permissions ?? [];
      existingMember.joinedAt = existingMember.joinedAt ?? null;

      memberEntity = existingMember;
    }

    const savedMember = await this.membersRepo.save(memberEntity);

    const inviteLink =
      `${process.env.FRONTEND_URL || "http://localhost:5173"}` +
      `/auth/accept-invite?token=${encodeURIComponent(token)}`;

    // ✅ send invite email (role + permissions)
    try {
      await this.mailService.sendInviteEmail({
        to: email,
        name: dto.name.trim(),
        businessName: (business as any).name || "Your Business",
        inviterEmail: user.email,
        inviteLink,
        role: dto.role,
        permissions: dto.permissions ?? [],
      });
    } catch (e: any) {
      console.log("Invite email failed:", e?.message || e);
    }

    return {
      invitation: savedInvitation,
      teamMember: savedMember,
      inviteLink,
    };
  }

  // =============================
  // OWNER-ONLY direct create member
  // =============================
  async createForOwner(user: JwtUser, dto: CreateTeamMemberDto) {
    if (!dto.businessId) throw new BadRequestException("businessId is required");
    await this.assertOwnerOwnsBusiness(user.sub, dto.businessId);

    const email = this.normalizeEmail(dto.email);

    const exists = await this.membersRepo.findOne({
      where: { businessId: dto.businessId, email },
    });
    if (exists) throw new BadRequestException("Member already exists for this business");

    const entity = this.membersRepo.create({
      ...dto,
      email,
      status: (dto as any).status ?? "active",
      permissions: (dto as any).permissions ?? [],
      joinedAt: new Date(), // ✅ active now
    } as any);

    return this.membersRepo.save(entity);
  }

  async updateForOwner(user: JwtUser, id: string, dto: UpdateTeamMemberDto) {
    const m = await this.membersRepo.findOne({ where: { id } });
    if (!m) throw new NotFoundException("Team member not found");

    await this.assertOwnerOwnsBusiness(user.sub, m.businessId);

    Object.assign(m, dto);

    // normalize email if updated
    if ((dto as any).email) {
      (m as any).email = this.normalizeEmail((dto as any).email);
    }

    return this.membersRepo.save(m);
  }

  async removeForOwner(user: JwtUser, id: string) {
    const m = await this.membersRepo.findOne({ where: { id } });
    if (!m) throw new NotFoundException("Team member not found");

    await this.assertOwnerOwnsBusiness(user.sub, m.businessId);

    await this.membersRepo.delete({ id });
    return { deleted: true, id };
  }

  // =============================
  // READ actions
  // =============================
  async findAllForUser(user: JwtUser, businessId?: string) {
    if (!businessId) throw new BadRequestException("businessId query param is required");

    await this.assertUserHasAccess(user, businessId);

    const members = await this.membersRepo.find({
      where: { businessId },
      order: { createdAt: "DESC" as any },
    });

    if (members.length === 0) return [];

    const emails = members.map(m => m.email);
    const users = await this.userRepo.find({ where: { email: In(emails) } });

    return members.map(m => {
      const u = users.find(u => u.email === m.email);
      return { ...m, userId: u?.id };
    });
  }

  async findOneForUser(user: JwtUser, id: string) {
    const m = await this.membersRepo.findOne({ where: { id } });
    if (!m) throw new NotFoundException("Team member not found");

    await this.assertUserHasAccess(user, m.businessId);
    return m;
  }
}