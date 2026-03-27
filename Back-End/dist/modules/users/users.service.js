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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("./entities/user.entity");
const api_mapper_1 = require("../../common/api-mapper");
const bcrypt = require("bcrypt");
const business_entity_1 = require("../businesses/entities/business.entity");
let UsersService = class UsersService {
    constructor(repo, businessesRepo) {
        this.repo = repo;
        this.businessesRepo = businessesRepo;
    }
    async create(dto) {
        const entity = this.repo.create({ ...dto });
        const saved = await this.repo.save(entity);
        return { ...saved, createdAt: (0, api_mapper_1.toIso)(saved.createdAt) };
    }
    async findAll() {
        const list = await this.repo.find({ order: { createdAt: "DESC" } });
        return list.map((u) => ({ ...u, createdAt: (0, api_mapper_1.toIso)(u.createdAt) }));
    }
    async findOne(id) {
        const u = await this.repo.findOne({ where: { id } });
        if (!u)
            throw new common_1.NotFoundException("User not found");
        return { ...u, createdAt: (0, api_mapper_1.toIso)(u.createdAt) };
    }
    async update(id, dto) {
        const u = await this.repo.findOne({ where: { id } });
        if (!u)
            throw new common_1.NotFoundException("User not found");
        Object.assign(u, dto);
        const saved = await this.repo.save(u);
        return { ...saved, createdAt: (0, api_mapper_1.toIso)(u.createdAt) };
    }
    async remove(id) {
        const res = await this.repo.delete({ id });
        if (!res.affected)
            throw new common_1.NotFoundException("User not found");
        return { deleted: true, id };
    }
    async findByEmail(email) {
        return this.repo.findOne({ where: { email: email.toLowerCase().trim() } });
    }
    async updatePassword(id, newPassword) {
        const hash = await bcrypt.hash(newPassword, 10);
        await this.repo.update(id, { passwordHash: hash });
    }
    calcDaysRemaining(endDate) {
        if (!endDate)
            return null;
        const end = new Date(endDate);
        const diff = end.getTime() - Date.now();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }
    async listBusinessOwners() {
        const owners = await this.repo.find({
            where: { role: "business_owner" },
            order: { createdAt: "DESC" },
        });
        const ownerIds = owners.map((o) => o.id);
        const businesses = ownerIds.length > 0
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
                status: owner.status || "active",
                joinedAt: (0, api_mapper_1.toIso)(owner.createdAt),
                businessCount: ownerBusinesses.length,
                businesses: ownerBusinesses.map((b) => ({
                    id: b.id,
                    name: b.name,
                    email: b.email,
                    status: b.status,
                    plan: b.plan,
                    subscriptionStartDate: b.subscriptionStartDate || null,
                    subscriptionEndDate: b.subscriptionEndDate || null,
                    createdAt: (0, api_mapper_1.toIso)(b.createdAt),
                })),
                subscriptionPlan: latestBusiness?.plan || null,
                subscriptionStartDate: latestBusiness?.subscriptionStartDate || null,
                subscriptionEndDate: latestBusiness?.subscriptionEndDate || null,
                daysRemaining: this.calcDaysRemaining(latestBusiness?.subscriptionEndDate || null),
            };
        });
    }
    async getBusinessOwnerDetails(ownerId) {
        const owner = await this.repo.findOne({
            where: { id: ownerId, role: "business_owner" },
        });
        if (!owner)
            throw new common_1.NotFoundException("Business owner not found");
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
            status: owner.status || "active",
            joinedAt: (0, api_mapper_1.toIso)(owner.createdAt),
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
                createdAt: (0, api_mapper_1.toIso)(b.createdAt),
            })),
            subscriptionPlan: latestBusiness?.plan || null,
            subscriptionStartDate: latestBusiness?.subscriptionStartDate || null,
            subscriptionEndDate: latestBusiness?.subscriptionEndDate || null,
            daysRemaining: this.calcDaysRemaining(latestBusiness?.subscriptionEndDate || null),
        };
    }
    async updateBusinessOwnerStatus(ownerId, status) {
        const owner = await this.repo.findOne({
            where: { id: ownerId, role: "business_owner" },
        });
        if (!owner)
            throw new common_1.NotFoundException("Business owner not found");
        owner.status = status;
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
            status: savedOwner.status || "active",
            joinedAt: (0, api_mapper_1.toIso)(savedOwner.createdAt),
            businessCount: businesses.length,
        };
    }
    async createBusinessOwnerWithBusiness(payload) {
        const existing = await this.findByEmail(payload.user.email);
        if (existing) {
            throw new common_1.BadRequestException("Email already exists");
        }
        const user = this.repo.create({
            ...payload.user,
            email: payload.user.email.toLowerCase().trim(),
            role: "business_owner",
            status: payload.user.status || "active",
        });
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
        });
        const savedBusiness = await this.businessesRepo.save(business);
        return {
            user: {
                ...savedUser,
                createdAt: (0, api_mapper_1.toIso)(savedUser.createdAt),
            },
            business: {
                ...savedBusiness,
                createdAt: (0, api_mapper_1.toIso)(savedBusiness.createdAt),
            },
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.UserEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(business_entity_1.BusinessEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map