import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, DeepPartial } from "typeorm";
import { UserEntity } from "./entities/user.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { toIso } from "../../common/api-mapper";
import * as bcrypt from "bcrypt";
import { BusinessEntity } from "../businesses/entities/business.entity";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private repo: Repository<UserEntity>,

    @InjectRepository(BusinessEntity)
    private businessesRepo: Repository<BusinessEntity>
  ) {}

  async create(dto: CreateUserDto) {
    const entity = this.repo.create({ ...dto } as DeepPartial<UserEntity>);
    const saved = await this.repo.save(entity);
    return { ...saved, createdAt: toIso(saved.createdAt)! };
  }

  async findAll() {
    const list = await this.repo.find({ order: { createdAt: "DESC" } });
    return list.map((u) => ({ ...u, createdAt: toIso(u.createdAt)! }));
  }

  async findOne(id: string) {
    const u = await this.repo.findOne({ where: { id } });
    if (!u) throw new NotFoundException("User not found");
    return { ...u, createdAt: toIso(u.createdAt)! };
  }

  async update(id: string, dto: UpdateUserDto) {
    const u = await this.repo.findOne({ where: { id } });
    if (!u) throw new NotFoundException("User not found");
    Object.assign(u, dto);
    const saved = await this.repo.save(u);
    return { ...saved, createdAt: toIso(u.createdAt)! };
  }

  async remove(id: string) {
    const res = await this.repo.delete({ id });
    if (!res.affected) throw new NotFoundException("User not found");
    return { deleted: true, id };
  }

  async findByEmail(email: string) {
    return this.repo.findOne({ where: { email: email.toLowerCase().trim() } });
  }

  async updatePassword(id: string, newPassword: string) {
    const hash = await bcrypt.hash(newPassword, 10);
    await this.repo.update(id, { passwordHash: hash });
  }

  // =====================================================
  // BUSINESS OWNERS ADMIN
  // =====================================================

  private calcDaysRemaining(endDate?: Date | string | null) {
    if (!endDate) return null;
    const end = new Date(endDate);
    const diff = end.getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  async listBusinessOwners() {
    const owners = await this.repo.find({
      where: { role: "business_owner" as any },
      order: { createdAt: "DESC" },
    });

    const ownerIds = owners.map((o) => o.id);

    const businesses =
      ownerIds.length > 0
        ? await this.businessesRepo.find({
            where: ownerIds.map((id) => ({ ownerId: id })),
            order: { createdAt: "DESC" },
          })
        : [];

    return owners.map((owner) => {
      const ownerBusinesses = businesses.filter((b) => b.ownerId === owner.id);
      const latestBusiness = ownerBusinesses[0];

      return {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        role: owner.role,
        status: (owner as any).status || "active",
        joinedAt: toIso(owner.createdAt)!,
        businessCount: ownerBusinesses.length,
        businesses: ownerBusinesses.map((b) => ({
          id: b.id,
          name: b.name,
          email: b.email,
          status: b.status,
          plan: b.plan,
          subscriptionStartDate: b.subscriptionStartDate || null,
          subscriptionEndDate: b.subscriptionEndDate || null,
          createdAt: toIso(b.createdAt)!,
        })),
        subscriptionPlan: latestBusiness?.plan || null,
        subscriptionStartDate: latestBusiness?.subscriptionStartDate || null,
        subscriptionEndDate: latestBusiness?.subscriptionEndDate || null,
        daysRemaining: this.calcDaysRemaining(
          latestBusiness?.subscriptionEndDate || null
        ),
      };
    });
  }

  async getBusinessOwnerDetails(ownerId: string) {
    const owner = await this.repo.findOne({
      where: { id: ownerId, role: "business_owner" as any },
    });

    if (!owner) throw new NotFoundException("Business owner not found");

    const businesses = await this.businessesRepo.find({
      where: { ownerId },
      order: { createdAt: "DESC" },
    });

    const latestBusiness = businesses[0];

    return {
      id: owner.id,
      name: owner.name,
      email: owner.email,
      role: owner.role,
      status: (owner as any).status || "active",
      joinedAt: toIso(owner.createdAt)!,
      businessCount: businesses.length,
      businesses: businesses.map((b) => ({
        id: b.id,
        name: b.name,
        email: b.email,
        status: b.status,
        plan: b.plan,
        city: b.city,
        country: b.country,
        subscriptionStartDate: b.subscriptionStartDate || null,
        subscriptionEndDate: b.subscriptionEndDate || null,
        daysRemaining: this.calcDaysRemaining(b.subscriptionEndDate || null),
        createdAt: toIso(b.createdAt)!,
      })),
      subscriptionPlan: latestBusiness?.plan || null,
      subscriptionStartDate: latestBusiness?.subscriptionStartDate || null,
      subscriptionEndDate: latestBusiness?.subscriptionEndDate || null,
      daysRemaining: this.calcDaysRemaining(
        latestBusiness?.subscriptionEndDate || null
      ),
    };
  }

  async updateBusinessOwnerStatus(ownerId: string, status: "active" | "suspended") {
    const owner = await this.repo.findOne({
      where: { id: ownerId, role: "business_owner" as any },
    });

    if (!owner) throw new NotFoundException("Business owner not found");

    (owner as any).status = status;
    const savedOwner = await this.repo.save(owner);

    const businesses = await this.businessesRepo.find({
      where: { ownerId },
    });

    for (const business of businesses) {
      business.status = status;
    }

    if (businesses.length > 0) {
      await this.businessesRepo.save(businesses);
    }

    return {
      id: savedOwner.id,
      name: savedOwner.name,
      email: savedOwner.email,
      role: savedOwner.role,
      status: (savedOwner as any).status || "active",
      joinedAt: toIso(savedOwner.createdAt)!,
      businessCount: businesses.length,
    };
  }

  async createBusinessOwnerWithBusiness(payload: {
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
  }) {
    const existing = await this.findByEmail(payload.user.email);
    if (existing) {
      throw new BadRequestException("Email already exists");
    }

    const user = this.repo.create({
      ...payload.user,
      email: payload.user.email.toLowerCase().trim(),
      role: "business_owner" as any,
      status: payload.user.status || "active",
    } as DeepPartial<UserEntity>);

    const savedUser = await this.repo.save(user);

    const business = this.businessesRepo.create({
      ...payload.business,
      ownerId: savedUser.id,
      status: payload.business.status || "active",
      plan: payload.business.plan || "starter",
      isProfileComplete: false,
      subscriptionStartDate: payload.business.subscriptionStartDate
        ? new Date(payload.business.subscriptionStartDate)
        : null,
      subscriptionEndDate: payload.business.subscriptionEndDate
        ? new Date(payload.business.subscriptionEndDate)
        : null,
    } as DeepPartial<BusinessEntity>);

    const savedBusiness = await this.businessesRepo.save(business);

    return {
      user: {
        ...savedUser,
        createdAt: toIso(savedUser.createdAt)!,
      },
      business: {
        ...savedBusiness,
        createdAt: toIso(savedBusiness.createdAt)!,
      },
    };
  }
}