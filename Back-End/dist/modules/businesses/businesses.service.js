"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const business_entity_1 = require("./entities/business.entity");
const team_member_entity_1 = require("../team-members/entities/team-member.entity");
const user_entity_1 = require("../users/entities/user.entity");
let BusinessesService = class BusinessesService {
    constructor(repo, teamMembersRepo, usersRepo) {
        this.repo = repo;
        this.teamMembersRepo = teamMembersRepo;
        this.usersRepo = usersRepo;
    }
    getOwnerDisplayName(owner, fallbackOwnerId) {
        return (owner?.name ||
            owner?.fullName ||
            owner?.username ||
            owner?.email ||
            fallbackOwnerId ||
            "—");
    }
    normalizeBusiness(business, owner) {
        return {
            ...business,
            ownerName: this.getOwnerDisplayName(owner, business.ownerId),
            status: business?.status ??
                business?.businessStatus ??
                business?.accountStatus ??
                "",
            plan: business?.plan ??
                business?.subscriptionPlan ??
                business?.package ??
                "",
        };
    }
    async findAll() {
        const businesses = await this.repo.find({
            order: { createdAt: "DESC" },
        });
        const ownerIds = [...new Set(businesses.map((b) => b.ownerId).filter(Boolean))];
        const owners = ownerIds.length > 0
            ? await this.usersRepo.find({
                where: { id: (0, typeorm_2.In)(ownerIds) },
            })
            : [];
        const ownersMap = new Map(owners.map((o) => [o.id, o]));
        return businesses.map((b) => this.normalizeBusiness(b, ownersMap.get(b.ownerId)));
    }
    async getByIdForUser(user, businessId) {
        const b = await this.repo.findOne({ where: { id: businessId } });
        if (!b)
            throw new common_1.NotFoundException("Business not found");
        if (user.role === "platform_admin") {
            const owner = b.ownerId
                ? await this.usersRepo.findOne({ where: { id: b.ownerId } })
                : null;
            return this.normalizeBusiness(b, owner);
        }
        if (user.role === "business_owner" && b.ownerId === user.id) {
            const owner = b.ownerId
                ? await this.usersRepo.findOne({ where: { id: b.ownerId } })
                : null;
            return this.normalizeBusiness(b, owner);
        }
        const m = await this.teamMembersRepo.findOne({
            where: { businessId, email: user.email.toLowerCase() },
        });
        if (!m)
            throw new common_1.ForbiddenException("No access to this business");
        const owner = b.ownerId
            ? await this.usersRepo.findOne({ where: { id: b.ownerId } })
            : null;
        return this.normalizeBusiness(b, owner);
    }
    async getById(id) {
        const b = await this.repo.findOne({ where: { id } });
        if (!b)
            throw new common_1.NotFoundException("Business not found");
        const owner = b.ownerId
            ? await this.usersRepo.findOne({ where: { id: b.ownerId } })
            : null;
        return this.normalizeBusiness(b, owner);
    }
    async findOne(id) {
        const b = await this.repo.findOne({ where: { id } });
        if (!b)
            throw new common_1.NotFoundException("Business not found");
        return b;
    }
    async create(dto) {
        const entity = this.repo.create(dto);
        return this.repo.save(entity);
    }
    async update(id, dto) {
        const b = await this.findOne(id);
        Object.assign(b, dto);
        return this.repo.save(b);
    }
    async remove(id) {
        const res = await this.repo.delete({ id });
        if (!res.affected)
            throw new common_1.NotFoundException("Business not found");
        return { deleted: true, id };
    }
    async listByOwner(ownerId) {
        const businesses = await this.repo.find({
            where: { ownerId },
            order: { createdAt: "DESC" },
        });
        const owner = await this.usersRepo.findOne({
            where: { id: ownerId },
        });
        return businesses.map((b) => this.normalizeBusiness(b, owner));
    }
    async findOneForOwner(ownerId, id) {
        const b = await this.repo.findOne({ where: { id, ownerId } });
        if (!b)
            throw new common_1.NotFoundException("Business not found");
        return b;
    }
    async createForOwner(ownerId, dto) {
        const entity = this.repo.create({
            ...dto,
            ownerId,
            isProfileComplete: false,
        });
        return this.repo.save(entity);
    }
    async updateForOwner(ownerId, id, dto) {
        const b = await this.findOneForOwner(ownerId, id);
        Object.assign(b, dto);
        return this.repo.save(b);
    }
    async removeForOwner(ownerId, id) {
        const b = await this.findOneForOwner(ownerId, id);
        await this.repo.remove(b);
        return { ok: true };
    }
    async removeAll() {
        await this.repo.clear();
        return { ok: true, deletedAll: true };
    }
    async completeProfile(businessId, ownerId, dto) {
        const b = await this.repo.findOne({ where: { id: businessId } });
        if (!b)
            throw new common_1.NotFoundException("Business not found");
        if (b.ownerId !== ownerId) {
            throw new common_1.ForbiddenException("You are not allowed to update this business");
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
                throw new common_1.BadRequestException("taxRate must be a valid number");
            }
            b.taxRate = tr;
        }
        b.isProfileComplete = Boolean(b.taxId && b.address);
        return this.repo.save(b);
    }
};
exports.BusinessesService = BusinessesService;
exports.BusinessesService = BusinessesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(business_entity_1.BusinessEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(team_member_entity_1.TeamMemberEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.UserEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], BusinessesService);
//# sourceMappingURL=businesses.service.js.map