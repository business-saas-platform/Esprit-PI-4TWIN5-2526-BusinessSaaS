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
exports.RegistrationRequestsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcrypt");
const registration_request_entity_1 = require("./entities/registration-request.entity");
const user_entity_1 = require("../users/entities/user.entity");
const business_entity_1 = require("../businesses/entities/business.entity");
const team_member_entity_1 = require("../team-members/entities/team-member.entity");
const mail_service_1 = require("../mail/mail.service");
const registration_request_enums_1 = require("./enums/registration-request.enums");
let RegistrationRequestsService = class RegistrationRequestsService {
    constructor(dataSource, requests, users, businesses, teamMembers, mail) {
        this.dataSource = dataSource;
        this.requests = requests;
        this.users = users;
        this.businesses = businesses;
        this.teamMembers = teamMembers;
        this.mail = mail;
        this.ADD_OWNER_AS_TEAM_MEMBER = false;
    }
    async create(dto) {
        const ownerEmail = dto.ownerEmail.toLowerCase().trim();
        const existsUser = await this.users.findOne({
            where: { email: ownerEmail },
        });
        if (existsUser) {
            throw new common_1.ConflictException("Account already exists for this email");
        }
        const pending = await this.requests.findOne({
            where: {
                ownerEmail,
                status: registration_request_enums_1.RegistrationStatus.PENDING,
            },
        });
        if (pending) {
            throw new common_1.ConflictException("A pending request already exists for this email");
        }
        const normalizedPaymentMethod = dto.paymentMethod ?? registration_request_enums_1.PaymentMethod.MANUAL;
        const initialPaymentStatus = this.getInitialPaymentStatus(normalizedPaymentMethod);
        const req = this.requests.create({
            ownerEmail,
            ownerName: dto.ownerName.trim(),
            companyName: dto.companyName.trim(),
            companyCategory: dto.companyCategory.trim(),
            companyPhone: dto.companyPhone?.trim() || null,
            companyAddress: dto.companyAddress?.trim() || null,
            companyTaxId: dto.companyTaxId?.trim() || null,
            teamSize: dto.teamSize?.trim() || null,
            message: dto.message?.trim() || null,
            selectedPlan: dto.selectedPlan ?? null,
            paymentMethod: normalizedPaymentMethod,
            paymentStatus: initialPaymentStatus,
            paymentProvider: normalizedPaymentMethod === registration_request_enums_1.PaymentMethod.MOCK_ONLINE ? "mock" : null,
            paymentReference: normalizedPaymentMethod === registration_request_enums_1.PaymentMethod.MOCK_ONLINE
                ? this.generateMockPaymentReference()
                : null,
            paymentUrl: null,
            paidAt: null,
            status: registration_request_enums_1.RegistrationStatus.PENDING,
            rejectionReason: null,
            reviewedByAdminId: null,
            reviewedAt: null,
        });
        const saved = await this.requests.save(req);
        if (saved.paymentMethod === registration_request_enums_1.PaymentMethod.MOCK_ONLINE) {
            saved.paymentUrl = `/mock-payment/${saved.id}`;
            await this.requests.save(saved);
        }
        return saved;
    }
    async list(status, paymentStatus) {
        const where = {};
        if (status) {
            where.status = status;
        }
        if (paymentStatus) {
            where.paymentStatus = paymentStatus;
        }
        return this.requests.find({
            where,
            order: { createdAt: "DESC" },
        });
    }
    async findOne(id) {
        const req = await this.requests.findOne({ where: { id } });
        if (!req)
            throw new common_1.NotFoundException("Request not found");
        return req;
    }
    async createMockPayment(requestId) {
        const req = await this.requests.findOne({ where: { id: requestId } });
        if (!req)
            throw new common_1.NotFoundException("Request not found");
        if (req.status !== registration_request_enums_1.RegistrationStatus.PENDING) {
            throw new common_1.BadRequestException("Payment session can only be created for pending requests");
        }
        req.paymentMethod = registration_request_enums_1.PaymentMethod.MOCK_ONLINE;
        req.paymentProvider = "mock";
        req.paymentStatus = registration_request_enums_1.PaymentStatus.PENDING;
        req.paymentReference = this.generateMockPaymentReference();
        req.paymentUrl = `/mock-payment/${req.id}`;
        req.paidAt = null;
        return this.requests.save(req);
    }
    async mockPaymentSuccess(requestId) {
        const req = await this.requests.findOne({ where: { id: requestId } });
        if (!req)
            throw new common_1.NotFoundException("Request not found");
        if (req.status !== registration_request_enums_1.RegistrationStatus.PENDING) {
            throw new common_1.BadRequestException("Request already reviewed");
        }
        req.paymentMethod = registration_request_enums_1.PaymentMethod.MOCK_ONLINE;
        req.paymentProvider = "mock";
        req.paymentStatus = registration_request_enums_1.PaymentStatus.PAID;
        req.paymentReference = req.paymentReference || this.generateMockPaymentReference();
        req.paymentUrl = req.paymentUrl || `/mock-payment/${req.id}`;
        req.paidAt = new Date();
        return this.requests.save(req);
    }
    async mockPaymentFail(requestId) {
        const req = await this.requests.findOne({ where: { id: requestId } });
        if (!req)
            throw new common_1.NotFoundException("Request not found");
        if (req.status !== registration_request_enums_1.RegistrationStatus.PENDING) {
            throw new common_1.BadRequestException("Request already reviewed");
        }
        req.paymentMethod = registration_request_enums_1.PaymentMethod.MOCK_ONLINE;
        req.paymentProvider = "mock";
        req.paymentStatus = registration_request_enums_1.PaymentStatus.FAILED;
        req.paymentReference = req.paymentReference || this.generateMockPaymentReference();
        req.paymentUrl = req.paymentUrl || `/mock-payment/${req.id}`;
        req.paidAt = null;
        return this.requests.save(req);
    }
    async updatePaymentStatus(requestId, adminUser, paymentStatus, paymentReference) {
        if (adminUser.role !== "platform_admin") {
            throw new common_1.ForbiddenException("Platform admin only");
        }
        const req = await this.requests.findOne({ where: { id: requestId } });
        if (!req)
            throw new common_1.NotFoundException("Request not found");
        req.paymentStatus = paymentStatus;
        if (paymentReference?.trim()) {
            req.paymentReference = paymentReference.trim();
        }
        if (paymentStatus === registration_request_enums_1.PaymentStatus.PAID) {
            req.paidAt = new Date();
        }
        if (paymentStatus === registration_request_enums_1.PaymentStatus.UNPAID ||
            paymentStatus === registration_request_enums_1.PaymentStatus.FAILED ||
            paymentStatus === registration_request_enums_1.PaymentStatus.PENDING ||
            paymentStatus === registration_request_enums_1.PaymentStatus.PENDING_VERIFICATION) {
            req.paidAt = null;
        }
        return this.requests.save(req);
    }
    async approve(requestId, adminUser, dto) {
        if (adminUser.role !== "platform_admin") {
            throw new common_1.ForbiddenException("Platform admin only");
        }
        const req = await this.requests.findOne({ where: { id: requestId } });
        if (!req)
            throw new common_1.NotFoundException("Request not found");
        if (req.status !== registration_request_enums_1.RegistrationStatus.PENDING) {
            throw new common_1.BadRequestException("Request already reviewed");
        }
        if (req.paymentMethod === registration_request_enums_1.PaymentMethod.MOCK_ONLINE &&
            req.paymentStatus !== registration_request_enums_1.PaymentStatus.PAID &&
            req.paymentStatus !== registration_request_enums_1.PaymentStatus.WAIVED) {
            throw new common_1.BadRequestException("This request cannot be approved before mock payment is completed");
        }
        if ((req.paymentMethod === registration_request_enums_1.PaymentMethod.CASH ||
            req.paymentMethod === registration_request_enums_1.PaymentMethod.BANK_TRANSFER ||
            req.paymentMethod === registration_request_enums_1.PaymentMethod.MANUAL) &&
            req.paymentStatus !== registration_request_enums_1.PaymentStatus.PAID &&
            req.paymentStatus !== registration_request_enums_1.PaymentStatus.WAIVED) {
            throw new common_1.BadRequestException("This request cannot be approved before payment is confirmed by admin");
        }
        const result = await this.dataSource.transaction(async (trx) => {
            const requestsRepo = trx.getRepository(registration_request_entity_1.RegistrationRequestEntity);
            const usersRepo = trx.getRepository(user_entity_1.UserEntity);
            const businessesRepo = trx.getRepository(business_entity_1.BusinessEntity);
            const teamMembersRepo = trx.getRepository(team_member_entity_1.TeamMemberEntity);
            const existsUser = await usersRepo.findOne({
                where: { email: req.ownerEmail },
            });
            if (existsUser) {
                throw new common_1.ConflictException("Account already exists for this email");
            }
            const tempPassword = this.generateTempPassword();
            const passwordHash = await bcrypt.hash(tempPassword, 10);
            const owner = usersRepo.create({
                email: req.ownerEmail,
                name: req.ownerName,
                role: "business_owner",
                passwordHash,
                mustChangePassword: true,
                loginAttempts: 0,
                lockedUntil: null,
                permissions: ["*"],
            });
            const savedOwner = await usersRepo.save(owner);
            const business = businessesRepo.create({
                ownerId: savedOwner.id,
                name: req.companyName,
                type: req.companyCategory,
                address: dto.address ?? req.companyAddress ?? "N/A",
                city: dto.city ?? "N/A",
                country: dto.country ?? "TN",
                taxId: dto.taxId ?? req.companyTaxId ?? "N/A",
                phone: dto.phone ?? req.companyPhone ?? "N/A",
                email: dto.email ?? req.ownerEmail,
                website: undefined,
                currency: dto.currency ?? "TND",
                fiscalYearStart: dto.fiscalYearStart ?? "01-01",
                industry: dto.industry ?? req.companyCategory,
                taxRate: 0,
            });
            const savedBusiness = await businessesRepo.save(business);
            savedOwner.businessId = savedBusiness.id;
            await usersRepo.save(savedOwner);
            if (this.ADD_OWNER_AS_TEAM_MEMBER) {
                const ownerMember = teamMembersRepo.create({
                    businessId: savedBusiness.id,
                    name: savedOwner.name,
                    email: savedOwner.email,
                    role: "business_admin",
                    status: "active",
                    permissions: ["*"],
                    joinedAt: new Date(),
                });
                await teamMembersRepo.save(ownerMember);
            }
            req.status = registration_request_enums_1.RegistrationStatus.APPROVED;
            req.reviewedByAdminId = adminUser.id;
            req.reviewedAt = new Date();
            await requestsRepo.save(req);
            return {
                ownerId: savedOwner.id,
                ownerEmail: savedOwner.email,
                ownerName: savedOwner.name,
                businessId: savedBusiness.id,
                businessName: savedBusiness.name ?? req.companyName,
                tempPassword,
            };
        });
        await this.mail.sendOwnerApprovedEmail({
            to: result.ownerEmail,
            name: result.ownerName,
            companyName: result.businessName,
            email: result.ownerEmail,
            tempPassword: result.tempPassword,
        });
        return {
            ok: true,
            ownerId: result.ownerId,
            businessId: result.businessId,
        };
    }
    async reject(requestId, adminUser, dto) {
        if (adminUser.role !== "platform_admin") {
            throw new common_1.ForbiddenException("Platform admin only");
        }
        const req = await this.requests.findOne({ where: { id: requestId } });
        if (!req)
            throw new common_1.NotFoundException("Request not found");
        if (req.status !== registration_request_enums_1.RegistrationStatus.PENDING) {
            throw new common_1.BadRequestException("Request already reviewed");
        }
        req.status = registration_request_enums_1.RegistrationStatus.REJECTED;
        req.rejectionReason = dto.reason.trim();
        req.reviewedByAdminId = adminUser.id;
        req.reviewedAt = new Date();
        await this.requests.save(req);
        await this.mail.sendOwnerRejectedEmail({
            to: req.ownerEmail,
            name: req.ownerName,
            companyName: req.companyName,
            reason: req.rejectionReason,
        });
        return { ok: true };
    }
    getInitialPaymentStatus(paymentMethod) {
        switch (paymentMethod) {
            case registration_request_enums_1.PaymentMethod.MOCK_ONLINE:
                return registration_request_enums_1.PaymentStatus.PENDING;
            case registration_request_enums_1.PaymentMethod.CASH:
            case registration_request_enums_1.PaymentMethod.BANK_TRANSFER:
                return registration_request_enums_1.PaymentStatus.PENDING_VERIFICATION;
            case registration_request_enums_1.PaymentMethod.MANUAL:
            default:
                return registration_request_enums_1.PaymentStatus.UNPAID;
        }
    }
    generateMockPaymentReference() {
        return `MOCK-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    }
    generateTempPassword() {
        const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const lower = "abcdefghijkmnpqrstuvwxyz";
        const digits = "23456789";
        const special = "!@#$%";
        const all = upper + lower + digits;
        const pick = (s) => s[Math.floor(Math.random() * s.length)];
        return (pick(upper) +
            pick(lower) +
            pick(digits) +
            pick(special) +
            Array.from({ length: 6 }, () => pick(all)).join(""));
    }
};
exports.RegistrationRequestsService = RegistrationRequestsService;
exports.RegistrationRequestsService = RegistrationRequestsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(registration_request_entity_1.RegistrationRequestEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.UserEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(business_entity_1.BusinessEntity)),
    __param(4, (0, typeorm_1.InjectRepository)(team_member_entity_1.TeamMemberEntity)),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        mail_service_1.MailService])
], RegistrationRequestsService);
//# sourceMappingURL=registration-requests.service.js.map