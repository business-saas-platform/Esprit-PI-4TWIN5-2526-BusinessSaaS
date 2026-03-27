import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";

import { BusinessEntity } from "./entities/business.entity";
import { CreateBusinessDto } from "./dto/create-business.dto";
import { UpdateBusinessDto } from "./dto/update-business.dto";
import { TeamMemberEntity } from "../team-members/entities/team-member.entity";
import { UserEntity } from "../users/entities/user.entity";

@Injectable()
export class BusinessesService {
  constructor(
    @InjectRepository(BusinessEntity)
    private readonly repo: Repository<BusinessEntity>,

    @InjectRepository(TeamMemberEntity)
    private readonly teamMembersRepo: Repository<TeamMemberEntity>,

    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>
  ) {}

  // =====================================================
  // INTERNAL HELPERS
  // =====================================================
  private getOwnerDisplayName(owner: any, fallbackOwnerId?: string) {
    return (
      owner?.name ||
      owner?.fullName ||
      owner?.username ||
      owner?.email ||
      fallbackOwnerId ||
      "—"
    );
  }

  private normalizeBusiness(business: any, owner?: any) {
    return {
      ...business,
      ownerName: this.getOwnerDisplayName(owner, business.ownerId),
      status:
        business?.status ??
        business?.businessStatus ??
        business?.accountStatus ??
        "",
      plan:
        business?.plan ??
        business?.subscriptionPlan ??
        business?.package ??
        "",
    };
  }

  // =====================================================
  // ADMIN / GLOBAL (use with caution)
  // =====================================================
  async findAll() {
    const businesses = await this.repo.find({
      order: { createdAt: "DESC" },
    });

    const ownerIds = [...new Set(businesses.map((b) => b.ownerId).filter(Boolean))];

    const owners =
      ownerIds.length > 0
        ? await this.usersRepo.find({
            where: { id: In(ownerIds) },
          })
        : [];

    const ownersMap = new Map(owners.map((o: any) => [o.id, o]));

    return businesses.map((b) => this.normalizeBusiness(b, ownersMap.get(b.ownerId)));
  }

  async getByIdForUser(user: any, businessId: string) {
    const b = await this.repo.findOne({ where: { id: businessId } });
    if (!b) throw new NotFoundException("Business not found");

    if (user.role === "platform_admin") {
      const owner = b.ownerId
        ? await this.usersRepo.findOne({ where: { id: b.ownerId } })
        : null;
      return this.normalizeBusiness(b, owner);
    }

    // owner
    if (user.role === "business_owner" && b.ownerId === user.id) {
      const owner = b.ownerId
        ? await this.usersRepo.findOne({ where: { id: b.ownerId } })
        : null;
      return this.normalizeBusiness(b, owner);
    }

    // member
    const m = await this.teamMembersRepo.findOne({
      where: { businessId, email: user.email.toLowerCase() },
    });
    if (!m) throw new ForbiddenException("No access to this business");

    const owner = b.ownerId
      ? await this.usersRepo.findOne({ where: { id: b.ownerId } })
      : null;

    return this.normalizeBusiness(b, owner);
  }

  async getById(id: string) {
    const b = await this.repo.findOne({ where: { id } as any });
    if (!b) throw new NotFoundException("Business not found");

    const owner = b.ownerId
      ? await this.usersRepo.findOne({ where: { id: b.ownerId } })
      : null;

    return this.normalizeBusiness(b, owner);
  }

  async findOne(id: string) {
    const b = await this.repo.findOne({ where: { id } });
    if (!b) throw new NotFoundException("Business not found");
    return b;
  }

  async create(dto: CreateBusinessDto) {
    const entity = this.repo.create(dto as any);
    return this.repo.save(entity);
  }

  async update(id: string, dto: UpdateBusinessDto) {
    const b = await this.findOne(id);
    Object.assign(b, dto);
    return this.repo.save(b);
  }

  async remove(id: string) {
    const res = await this.repo.delete({ id });
    if (!res.affected) throw new NotFoundException("Business not found");
    return { deleted: true, id };
  }

  // =====================================================
  // OWNER SCOPED (business_owner)
  // =====================================================
  async listByOwner(ownerId: string) {
    const businesses = await this.repo.find({
      where: { ownerId },
      order: { createdAt: "DESC" },
    });

    const owner = await this.usersRepo.findOne({
      where: { id: ownerId },
    });

    return businesses.map((b) => this.normalizeBusiness(b, owner));
  }

  async findOneForOwner(ownerId: string, id: string) {
    const b = await this.repo.findOne({ where: { id, ownerId } });
    if (!b) throw new NotFoundException("Business not found");
    return b;
  }

  async createForOwner(ownerId: string, dto: CreateBusinessDto) {
    const entity = this.repo.create({
      ...(dto as any),
      ownerId,
      isProfileComplete: false,
    });
    return this.repo.save(entity);
  }

  async updateForOwner(ownerId: string, id: string, dto: UpdateBusinessDto) {
    const b = await this.findOneForOwner(ownerId, id);
    Object.assign(b, dto);
    return this.repo.save(b);
  }

  async removeForOwner(ownerId: string, id: string) {
    const b = await this.findOneForOwner(ownerId, id);
    await this.repo.remove(b);
    return { ok: true };
  }
async removeAll() {
  await this.repo.clear();
  return { ok: true, deletedAll: true };
}
  // =====================================================
  // COMPLETE PROFILE (logo, matricule/taxId, address...)
  // =====================================================
  async completeProfile(businessId: string, ownerId: string, dto: any) {
    const b = await this.repo.findOne({ where: { id: businessId } });
    if (!b) throw new NotFoundException("Business not found");

    if (b.ownerId !== ownerId) {
      throw new ForbiddenException("You are not allowed to update this business");
    }

    b.logoUrl = dto.logoUrl ?? b.logoUrl;

    b.name = dto.name ?? b.name;
    b.type = dto.type ?? b.type;

    b.address = dto.address ?? b.address;
    b.city = dto.city ?? b.city;
    b.country = dto.country ?? b.country;

    b.taxId = dto.taxId ?? b.taxId;
    b.phone = dto.phone ?? b.phone;
    b.email = dto.email ?? b.email;

    b.website = dto.website ?? b.website;

    b.currency = dto.currency ?? b.currency;
    b.fiscalYearStart = dto.fiscalYearStart ?? b.fiscalYearStart;
    b.industry = dto.industry ?? b.industry;

    if (dto.taxRate !== undefined && dto.taxRate !== null && dto.taxRate !== "") {
      const tr = Number(dto.taxRate);
      if (!Number.isFinite(tr)) {
        throw new BadRequestException("taxRate must be a valid number");
      }
      b.taxRate = tr;
    }

    b.isProfileComplete = Boolean(b.taxId && b.address);

    return this.repo.save(b);
  }
}