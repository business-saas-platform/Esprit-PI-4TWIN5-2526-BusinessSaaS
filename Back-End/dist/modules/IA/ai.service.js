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
exports.AiService = void 0;
.0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const clients_service_1 = require("../clients/clients.service");
const invoice_entity_1 = require("../invoices/entities/invoice.entity");
const ai_model_1 = require("./ai.model");
let AiService = class AiService {
    constructor(clientsService, invoiceRepo, aiModel) {
        this.clientsService = clientsService;
        this.invoiceRepo = invoiceRepo;
        this.aiModel = aiModel;
    }
    async predictRisk(businessId, clientId) {
        const client = await this.clientsService.findOne(businessId, clientId);
        const invoices = await this.invoiceRepo.find({
            where: { businessId, clientId },
        });
        const totalInvoices = invoices.length;
        const unpaidInvoices = invoices.filter((i) => i.status !== "paid").length;
        const lateInvoices = invoices.filter((i) => i.status === "overdue").length;
        const outstanding = Number(client.outstandingBalance || 0);
        const revenue = Number(client.totalRevenue || 0);
        const unpaidRatio = totalInvoices > 0 ? unpaidInvoices / totalInvoices : 0;
        const lateRatio = totalInvoices > 0 ? lateInvoices / totalInvoices : 0;
        const debtRatio = revenue > 0 ? outstanding / revenue : 0;
        let score = await this.aiModel.predictScore(unpaidRatio, lateRatio, debtRatio);
        score = Math.max(0, Math.min(1, score));
        score = Number(score.toFixed(2));
        let risk;
        if (score >= 0.7) {
            risk = "HIGH";
        }
        else if (score >= 0.4) {
            risk = "MEDIUM";
        }
        else {
            risk = "LOW";
        }
        let reason = "Client is reliable";
        if (risk === "HIGH" || risk === "MEDIUM") {
            if (lateRatio > 0.5) {
                reason = "Frequent late payments";
            }
            else if (debtRatio > 0.5) {
                reason = "High unpaid balance compared to revenue";
            }
            else if (unpaidRatio > 0.5) {
                reason = "Many unpaid invoices";
            }
            else {
                reason = "Payment behavior needs attention";
            }
        }
        else {
            if (unpaidRatio > 0.5) {
                reason = "Reliable client, but has several pending invoices";
            }
            else {
                reason = "Client is reliable with a solid payment history";
            }
        }
        return {
            clientId,
            risk,
            score: Number(score.toFixed(2)),
            details: {
                totalInvoices,
                unpaidInvoices,
                lateInvoices,
                outstanding,
                revenue,
            },
            reason,
        };
    }
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(invoice_entity_1.InvoiceEntity)),
    __metadata("design:paramtypes", [clients_service_1.ClientsService,
        typeorm_2.Repository,
        ai_model_1.AiModel])
], AiService);
//# sourceMappingURL=ai.service.js.map