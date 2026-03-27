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
exports.ClientsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const client_entity_1 = require("./entities/client.entity");
const api_mapper_1 = require("../../common/api-mapper");
const invoice_entity_1 = require("../invoices/entities/invoice.entity");
let ClientsService = class ClientsService {
    constructor(repo, invoicesRepo) {
        this.repo = repo;
        this.invoicesRepo = invoicesRepo;
    }
    async create(businessId, dto) {
        const entity = this.repo.create({
            businessId,
            name: dto.name.trim(),
            email: dto.email.trim().toLowerCase(),
            phone: dto.phone?.trim() || "",
            address: dto.address?.trim() || "",
            city: dto.city?.trim() || "",
            postalCode: dto.postalCode?.trim() || "",
            country: dto.country?.trim() || "Tunisia",
            taxId: dto.taxId?.trim() || undefined,
            type: dto.type,
            status: dto.status ?? "active",
            notes: dto.notes?.trim() || undefined,
            lastContactDate: dto.lastContactDate?.trim() || undefined,
            companyName: dto.companyName?.trim() || undefined,
            contactPerson: dto.contactPerson?.trim() || undefined,
            totalRevenue: 0,
            outstandingBalance: 0,
        });
        const saved = await this.repo.save(entity);
        return this.toApi(saved);
    }
    async computeClientStats(businessId, clientId) {
        const invoices = await this.invoicesRepo.find({
            where: { businessId, clientId },
        });
        const validInvoices = invoices.filter((inv) => inv.status !== "cancelled");
        const totalRevenue = validInvoices.reduce((sum, inv) => {
            return sum + Number(inv.totalAmount ?? 0);
        }, 0);
        const outstandingBalance = validInvoices.reduce((sum, inv) => {
            const total = Number(inv.totalAmount ?? 0);
            const paid = Number(inv.paidAmount ?? 0);
            return sum + Math.max(total - paid, 0);
        }, 0);
        return {
            totalRevenue,
            outstandingBalance,
        };
    }
    async findAll(businessId) {
        const list = await this.repo.find({
            where: { businessId },
            order: { createdAt: "DESC" },
        });
        const enriched = await Promise.all(list.map(async (client) => {
            const stats = await this.computeClientStats(businessId, client.id);
            return this.toApi({
                ...client,
                totalRevenue: stats.totalRevenue,
                outstandingBalance: stats.outstandingBalance,
            });
        }));
        return enriched;
    }
    async findOne(businessId, id) {
        const client = await this.repo.findOne({
            where: { id, businessId },
        });
        if (!client) {
            throw new common_1.NotFoundException("Client not found");
        }
        const stats = await this.computeClientStats(businessId, client.id);
        return this.toApi({
            ...client,
            totalRevenue: stats.totalRevenue,
            outstandingBalance: stats.outstandingBalance,
        });
    }
    async update(businessId, id, dto) {
        const client = await this.repo.findOne({
            where: { id, businessId },
        });
        if (!client) {
            throw new common_1.NotFoundException("Client not found");
        }
        if (dto.name !== undefined) {
            client.name = dto.name.trim();
        }
        if (dto.email !== undefined) {
            client.email = dto.email.trim().toLowerCase();
        }
        if (dto.phone !== undefined) {
            client.phone = dto.phone.trim();
        }
        if (dto.address !== undefined) {
            client.address = dto.address.trim();
        }
        if (dto.city !== undefined) {
            client.city = dto.city.trim();
        }
        if (dto.postalCode !== undefined) {
            client.postalCode = dto.postalCode.trim();
        }
        if (dto.country !== undefined) {
            client.country = dto.country.trim() || "Tunisia";
        }
        if (dto.taxId !== undefined) {
            client.taxId = dto.taxId.trim() || undefined;
        }
        if (dto.type !== undefined) {
            client.type = dto.type;
        }
        if (dto.status !== undefined) {
            client.status = dto.status;
        }
        if (dto.notes !== undefined) {
            client.notes = dto.notes.trim() || undefined;
        }
        if (dto.lastContactDate !== undefined) {
            client.lastContactDate = dto.lastContactDate.trim() || undefined;
        }
        if (dto.companyName !== undefined) {
            client.companyName = dto.companyName.trim() || undefined;
        }
        if (dto.contactPerson !== undefined) {
            client.contactPerson = dto.contactPerson.trim() || undefined;
        }
        const saved = await this.repo.save(client);
        const stats = await this.computeClientStats(businessId, saved.id);
        return this.toApi({
            ...saved,
            totalRevenue: stats.totalRevenue,
            outstandingBalance: stats.outstandingBalance,
        });
    }
    async remove(businessId, id) {
        const res = await this.repo.delete({ id, businessId });
        if (!res.affected) {
            throw new common_1.NotFoundException("Client not found");
        }
        return { deleted: true, id };
    }
    toApi(c) {
        return {
            id: c.id,
            businessId: c.businessId,
            name: c.name,
            email: c.email,
            phone: c.phone,
            address: c.address,
            city: c.city,
            postalCode: c.postalCode,
            country: c.country,
            taxId: c.taxId,
            type: c.type,
            status: c.status,
            totalRevenue: c.totalRevenue,
            outstandingBalance: c.outstandingBalance,
            createdAt: (0, api_mapper_1.toIso)(c.createdAt),
            lastContactDate: c.lastContactDate,
            notes: c.notes,
            companyName: c.companyName,
            contactPerson: c.contactPerson,
        };
    }
};
exports.ClientsService = ClientsService;
exports.ClientsService = ClientsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(client_entity_1.ClientEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(invoice_entity_1.InvoiceEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], ClientsService);
//# sourceMappingURL=clients.service.js.map